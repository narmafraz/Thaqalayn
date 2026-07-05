import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Book, VerseDetail, Verse, effectiveAiLang } from '@app/models';
import { OfflineStorageService } from './offline-storage.service';
import { AiPreferencesService } from './ai-preferences.service';
import { RouterState } from '@store/router/router.state';
import { Store } from '@ngxs/store';
import { environment } from '@env/environment';
import { Observable, combineLatest, forkJoin, from, of } from 'rxjs';
import { catchError, map, retry, switchMap, take, tap, timeout } from 'rxjs/operators';

interface SisterFile {
  lang: string;
  path: string;
  ai?: {
    summary?: string;
    seo_question?: string;
    chunks?: (string | null)[];
    word_analysis?: (string | null)[];
    key_terms?: { [arTerm: string]: string };
  };
  /**
   * Scraped (non-AI) translations for this language, re-segmented to the AI
   * chunk boundaries, keyed by translation ID (e.g. "en.hubeali"). The base
   * verse no longer carries these for aligned verses — mergeSister folds them
   * into verse.chunk_translations and reconstructs verse.translations[id].
   */
  chunk_translations?: { [translationId: string]: (string | null)[] };
}

@Injectable({
  providedIn: 'root'
})
export class BooksService {

  private static readonly bookpartsUrl = environment.apiBaseUrl + 'books';

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  getPart(index: string): Observable<Book> {
    // Try offline storage first (downloaded books + cached responses), then network
    const base$ = from(this.getOfflinePart(index)).pipe(
      catchError(() => of(null as Book | null)), // catch offline storage errors only
      switchMap(offlineData => {
        if (offlineData) return of(offlineData);
        return this.fetchFromNetwork(index);
      })
    );
    return this.maybeMergeSister(base$, index);
  }

  /**
   * When the base is a verse_detail in the per-language split shape (ai.summaries
   * not inline), fetch the active-lang sister file and merge it back into the
   * verse so existing components can read `ai.summaries[lang]` etc. unchanged.
   *
   * One-shot per `getPart` call: reads the active lang once. Lang switch
   * requires the caller to re-fetch (NGXS RetryLoadBookPart) — keeping this
   * observable terminating is required for the NGXS resolver to complete and
   * the route to activate.
   */
  private maybeMergeSister(book$: Observable<Book>, index: string): Observable<Book> {
    return book$.pipe(
      switchMap(book => {
        if (book.kind !== 'verse_detail') return of(book);
        const verse = (book as VerseDetail).data.verse;
        const ai = verse?.ai as { summaries?: unknown } | undefined;
        if (!ai || ai.summaries !== undefined) {
          // legacy/inline-shape, or no AI content: nothing to merge
          return of(book);
        }
        // Which language sisters do we need? The union of:
        //  - effectiveAiLang (AI content for the active AI translation / WBW pref)
        //  - the active translation's language (its scraped text may live in the
        //    sister now that base drops it for aligned verses)
        //  - the compare translation's language (same reason)
        // so the block view + compare mode both find their text.
        return combineLatest([
          this.aiPrefs.preferences$.pipe(map(p => p.wordByWordDefaultLang)),
          this.store.select(RouterState.getTranslation),
          this.store.select(RouterState.getTranslation2),
        ]).pipe(
          take(1),
          switchMap(([w, t1, t2]) => {
            const langs = new Set<string>([effectiveAiLang(t1, w)]);
            for (const l of [this.langOf(t1), this.langOf(t2)]) if (l) langs.add(l);
            const langList = [...langs];
            return forkJoin(langList.map(lang => {
              const url = `${BooksService.bookpartsUrl}/${index.replace(/:/g, '/')}.${lang}.json`;
              return this.http.get<SisterFile>(url).pipe(
                catchError(() => of(null as SisterFile | null)),
                map(sister => [lang, sister] as const),
              );
            })).pipe(
              map(pairs => pairs.reduce(
                (acc, [lang, sister]) => this.mergeSister(acc, sister, lang),
                book as VerseDetail,
              )),
            );
          }),
        );
      }),
    );
  }

  /** Language code of a translation ID (e.g. "en.hubeali" -> "en"). */
  private langOf(id?: string): string | undefined {
    return id && id.includes('.') ? id.split('.')[0] : undefined;
  }

  private mergeSister(book: VerseDetail, sister: SisterFile | null, lang: string): VerseDetail {
    if (!sister) return book;
    const verse = book.data.verse;
    if (!verse) return book;
    const mergedVerse: Verse = { ...verse };

    // AI content (summaries / seo / key_terms / per-chunk + per-word translations).
    if (sister.ai && verse.ai) {
      mergedVerse.ai = { ...verse.ai };
      const ai = mergedVerse.ai as Record<string, unknown>;
      if (sister.ai.summary !== undefined) {
        ai['summaries'] = { ...((ai['summaries'] as object) || {}), [lang]: sister.ai.summary };
      }
      if (sister.ai.seo_question !== undefined) {
        ai['seo_questions'] = { ...((ai['seo_questions'] as object) || {}), [lang]: sister.ai.seo_question };
      }
      if (sister.ai.key_terms !== undefined) {
        ai['key_terms'] = { ...((ai['key_terms'] as object) || {}), [lang]: sister.ai.key_terms };
      }
      if (sister.ai.chunks && Array.isArray(ai['chunks'])) {
        const baseChunks = ai['chunks'] as Array<Record<string, unknown>>;
        ai['chunks'] = baseChunks.map((chunk, i) => {
          const sisterTrans = sister.ai!.chunks?.[i];
          if (typeof sisterTrans !== 'string') return chunk;
          return {
            ...chunk,
            translations: { ...((chunk['translations'] as object) || {}), [lang]: sisterTrans },
          };
        });
      }
      if (sister.ai.word_analysis && Array.isArray(ai['word_analysis'])) {
        const baseWords = ai['word_analysis'] as Array<Record<string, unknown>>;
        ai['word_analysis'] = baseWords.map((entry, i) => {
          const sisterTrans = sister.ai!.word_analysis?.[i];
          if (typeof sisterTrans !== 'string') return entry;
          return {
            ...entry,
            translation: { ...((entry['translation'] as object) || {}), [lang]: sisterTrans },
          };
        });
      }
    }

    // Scraped translations re-segmented to chunks: fold into
    // verse.chunk_translations and reconstruct the flat verse.translations[id]
    // (base drops the flat text for aligned verses; the block view + compare
    // mode read it from here).
    if (sister.chunk_translations) {
      const ct: Record<string, (string | null)[]> = { ...(mergedVerse.chunk_translations || {}) };
      const translations: Record<string, string[]> = { ...(mergedVerse.translations || {}) };
      for (const [id, parts] of Object.entries(sister.chunk_translations)) {
        ct[id] = parts;
        const flat = parts.filter((p): p is string => !!(p && p.trim())).join(' ');
        if (flat) translations[id] = [flat];
      }
      mergedVerse.chunk_translations = ct;
      mergedVerse.translations = translations;
    }

    return { ...book, data: { ...book.data, verse: mergedVerse } };
  }

  private fetchFromNetwork(index: string): Observable<Book> {
    return this.http.get<Book>(`${BooksService.bookpartsUrl}/${index.replace(/:/g, '/')}.json`).pipe(
      timeout(30000),
      retry({ count: 2, delay: 1000 }),
      tap(book => {
        // Cache-on-read: store the response for future offline access
        this.offlineStorage.cacheResponse(index, book);
      })
    );
  }

  private async getOfflinePart(index: string): Promise<Book | null> {
    // Wait for data_version check to complete — it may have just cleared
    // the CACHE_STORE because the corpus shipped a new version. Reading
    // before this resolves can return a stale entry from the previous
    // deploy. Downloaded books (STORE_NAME) are explicit user-installed
    // bundles and intentionally NOT cleared by data_version.
    await this.offlineStorage.dataVersionReady;
    // Check downloaded complete books first
    const fromBook = await this.offlineStorage.getPartFromBook(index);
    if (fromBook) return fromBook;
    // Then check individual cached responses
    return this.offlineStorage.getCachedResponse(index);
  }

  private http = inject(HttpClient);
  private offlineStorage = inject(OfflineStorageService);
  private aiPrefs = inject(AiPreferencesService);
  private store = inject(Store);
}
