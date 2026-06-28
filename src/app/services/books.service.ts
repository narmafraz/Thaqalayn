import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Book, VerseDetail, Verse, effectiveAiLang } from '@app/models';
import { OfflineStorageService } from './offline-storage.service';
import { AiPreferencesService } from './ai-preferences.service';
import { RouterState } from '@store/router/router.state';
import { Store } from '@ngxs/store';
import { environment } from '@env/environment';
import { Observable, combineLatest, from, of } from 'rxjs';
import { catchError, map, retry, switchMap, take, tap, timeout } from 'rxjs/operators';

interface SisterFile {
  lang: string;
  path: string;
  ai: {
    summary?: string;
    seo_question?: string;
    chunks?: (string | null)[];
    word_analysis?: (string | null)[];
    key_terms?: { [arTerm: string]: string };
  };
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
        // Effective AI lang composes two inputs that both drive the view:
        // the active translation (if it's an AI one), else the wordByWord
        // preference. Either changing should refetch a different sister.
        return combineLatest([
          this.aiPrefs.preferences$.pipe(map(p => p.wordByWordDefaultLang)),
          this.store.select(RouterState.getTranslation),
        ]).pipe(
          map(([w, t]) => effectiveAiLang(t, w)),
          take(1),
          switchMap(lang => {
            const sisterUrl = `${BooksService.bookpartsUrl}/${index.replace(/:/g, '/')}.${lang}.json`;
            return this.http.get<SisterFile>(sisterUrl).pipe(
              catchError(() => of(null as SisterFile | null)),
              map(sister => this.mergeSister(book as VerseDetail, sister, lang)),
            );
          }),
        );
      }),
    );
  }

  private mergeSister(book: VerseDetail, sister: SisterFile | null, lang: string): VerseDetail {
    if (!sister) return book;
    const verse = book.data.verse;
    if (!verse?.ai) return book;
    const mergedVerse: Verse = { ...verse, ai: { ...verse.ai } };
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
        const sisterTrans = sister.ai.chunks?.[i];
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
        const sisterTrans = sister.ai.word_analysis?.[i];
        if (typeof sisterTrans !== 'string') return entry;
        return {
          ...entry,
          translation: { ...((entry['translation'] as object) || {}), [lang]: sisterTrans },
        };
      });
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
