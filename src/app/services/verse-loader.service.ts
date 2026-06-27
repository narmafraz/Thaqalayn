import { Injectable, inject } from '@angular/core';
import { BooksService } from './books.service';
import { AiPreferencesService } from './ai-preferences.service';
import { RouterState } from '@store/router/router.state';
import { Store } from '@ngxs/store';
import { Verse, VerseDetail, effectiveAiLang } from '@app/models';
import { Observable, combineLatest } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class VerseLoaderService {
  private booksService = inject(BooksService);
  private aiPrefs = inject(AiPreferencesService);
  private store = inject(Store);
  private cache = new Map<string, Observable<Verse>>();

  /**
   * Lazy-load a verse, re-emitting when the effective AI language changes.
   *
   * Chapter pages render via verse_refs and pull each verse_detail through
   * here as it scrolls into view. Unlike BooksService.getPart — which must
   * complete for the NGXS resolver — this observable stays subscribed to
   * the lang stream and re-fetches sister content on language switch. The
   * downstream BooksService.getPart call is still one-shot per emission,
   * picking up the current effective lang via its own take(1).
   */
  loadVerse(path: string): Observable<Verse> {
    const cached = this.cache.get(path);
    if (cached) return cached;

    const index = path.startsWith('/books/') ? path.slice(7) : path;
    const lang$ = combineLatest([
      this.aiPrefs.preferences$.pipe(map(p => p.wordByWordDefaultLang)),
      this.store.select(RouterState.getTranslation),
    ]).pipe(
      map(([w, t]) => effectiveAiLang(t, w)),
      distinctUntilChanged(),
    );
    const obs = lang$.pipe(
      switchMap(() => this.booksService.getPart(index)),
      map(book => {
        if (book.kind === 'verse_detail') {
          return (book as VerseDetail).data.verse;
        }
        return null as unknown as Verse;
      }),
      shareReplay(1),
    );
    this.cache.set(path, obs);
    return obs;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
