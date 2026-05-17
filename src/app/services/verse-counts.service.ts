import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';

/** Per-book totals + per-chapter counts of countable verses. */
export interface BookVerseCounts {
  /** Total Hadith + Verse entries in the book. */
  total: number;
  /** Map of chapter `index` field (e.g. `al-kafi:1:1:1`, `quran:2`) → verse count. */
  by_chapter: Record<string, number>;
}

/** Manifest of verse counts keyed by book slug. Source: `index/verse-counts.json`. */
export type VerseCountsManifest = Record<string, BookVerseCounts>;

/** Loads and caches the `index/verse-counts.json` manifest emitted by the data generator. */
@Injectable({ providedIn: 'root' })
export class VerseCountsService {
  private static readonly url = environment.apiBaseUrl + 'index/verse-counts.json';

  private http = inject(HttpClient);
  private manifest$: Observable<VerseCountsManifest> | null = null;
  private snapshot: VerseCountsManifest = {};

  /** Cold observable of the manifest. The first subscriber triggers the HTTP fetch; subsequent subscribers get the cached value. */
  get(): Observable<VerseCountsManifest> {
    if (!this.manifest$) {
      this.manifest$ = this.http.get<VerseCountsManifest>(VerseCountsService.url).pipe(
        tap(m => { this.snapshot = m || {}; }),
        catchError(() => of({} as VerseCountsManifest)),
        shareReplay(1),
      );
    }
    return this.manifest$;
  }

  /** Synchronous view of the manifest. Empty `{}` until {@link get} has resolved. */
  snapshotSync(): VerseCountsManifest {
    return this.snapshot;
  }

  /** Total countable verses in a book, or 0 if unknown / not loaded yet. */
  totalFor(bookId: string): number {
    return this.snapshot[bookId]?.total ?? 0;
  }

  /** Countable verses in a specific chapter, or 0 if unknown. */
  forChapter(chapterIndex: string): number {
    const slug = chapterIndex.split(':')[0];
    return this.snapshot[slug]?.by_chapter?.[chapterIndex] ?? 0;
  }

  /**
   * Sum of `by_chapter` counts where the chapter index starts with `prefix:`
   * (e.g. `al-kafi:1` rolls up the whole of volume 1). Useful for sub-tree
   * progress on multi-volume hadith books.
   */
  totalForPrefix(prefix: string): number {
    const slug = prefix.split(':')[0];
    const byCh = this.snapshot[slug]?.by_chapter;
    if (!byCh) return 0;
    const needle = prefix + ':';
    let sum = 0;
    for (const [k, v] of Object.entries(byCh)) {
      if (k === prefix || k.startsWith(needle)) {
        sum += v;
      }
    }
    return sum;
  }

  /** All chapter indexes belonging to a book or sub-tree (e.g. `al-kafi:1`). */
  chapterIndexesForPrefix(prefix: string): string[] {
    const slug = prefix.split(':')[0];
    const byCh = this.snapshot[slug]?.by_chapter;
    if (!byCh) return [];
    if (prefix === slug) return Object.keys(byCh);
    const needle = prefix + ':';
    return Object.keys(byCh).filter(k => k === prefix || k.startsWith(needle));
  }
}
