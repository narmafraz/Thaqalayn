import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { environment } from '@env/environment';
import {
  LemmaPage, LemmasIndex,
  RootPage, RootsIndex,
  SurfacePage, SurfacesIndex,
} from '@app/models/word';
import { slug } from './word-normalize';

/**
 * Client for the ThaqalaynWords data API
 * (`https://thaqalaynwords.netlify.app/` in prod, `:8889/` in dev).
 *
 * Three per-page endpoints plus three index files. All responses are
 * cached in-memory for the lifetime of the session via `shareReplay(1)`,
 * mirroring the `VerseLoaderService` pattern — repeat fetches of the same
 * slug within a session don't hit the network.
 *
 * Slug handling: the caller may pass either the raw Arabic surface (e.g.
 * `قَالَ`) or its NFC slug; we run `slug()` to normalize, then
 * percent-encode for the URL.
 */
@Injectable({ providedIn: 'root' })
export class WordsService {
  private http = inject(HttpClient);
  private base = environment.wordsApiBaseUrl;

  private surfaceCache = new Map<string, Observable<SurfacePage | null>>();
  private lemmaCache = new Map<string, Observable<LemmaPage | null>>();
  private rootCache = new Map<string, Observable<RootPage | null>>();

  private surfacesIndex$?: Observable<SurfacesIndex | null>;
  private lemmasIndex$?: Observable<LemmasIndex | null>;
  private rootsIndex$?: Observable<RootsIndex | null>;

  getSurface(slugOrSurface: string): Observable<SurfacePage | null> {
    const key = slug(slugOrSurface);
    if (!key) return of(null);
    const cached = this.surfaceCache.get(key);
    if (cached) return cached;
    const url = `${this.base}surfaces/${encodeURIComponent(key)}.json`;
    const obs = this.http.get<SurfacePage>(url).pipe(
      catchError(() => of(null)),
      shareReplay(1),
    );
    this.surfaceCache.set(key, obs);
    return obs;
  }

  getLemma(slugOrLemma: string): Observable<LemmaPage | null> {
    const key = slug(slugOrLemma);
    if (!key) return of(null);
    const cached = this.lemmaCache.get(key);
    if (cached) return cached;
    const url = `${this.base}lemmas/${encodeURIComponent(key)}.json`;
    const obs = this.http.get<LemmaPage>(url).pipe(
      catchError(() => of(null)),
      shareReplay(1),
    );
    this.lemmaCache.set(key, obs);
    return obs;
  }

  /**
   * Fetch a root page. ``slugOrRoot`` should be the URL-safe slug like
   * ``ق-_-ل`` (with `_` for weak radicals), not the CAMeL `ق.#.ل` form.
   */
  getRoot(slugOrRoot: string): Observable<RootPage | null> {
    const key = (slugOrRoot || '').trim();
    if (!key) return of(null);
    const cached = this.rootCache.get(key);
    if (cached) return cached;
    const url = `${this.base}roots/${encodeURIComponent(key)}.json`;
    const obs = this.http.get<RootPage>(url).pipe(
      catchError(() => of(null)),
      shareReplay(1),
    );
    this.rootCache.set(key, obs);
    return obs;
  }

  getSurfacesIndex(): Observable<SurfacesIndex | null> {
    if (this.surfacesIndex$) return this.surfacesIndex$;
    this.surfacesIndex$ = this.http.get<SurfacesIndex>(
      `${this.base}index/surfaces.json`,
    ).pipe(catchError(() => of(null)), shareReplay(1));
    return this.surfacesIndex$;
  }

  getLemmasIndex(): Observable<LemmasIndex | null> {
    if (this.lemmasIndex$) return this.lemmasIndex$;
    this.lemmasIndex$ = this.http.get<LemmasIndex>(
      `${this.base}index/lemmas.json`,
    ).pipe(catchError(() => of(null)), shareReplay(1));
    return this.lemmasIndex$;
  }

  /** Lookup table from lemma slug → first English gloss, built once
   *  from the lemmas index. Used for inline word-by-word translation. */
  private lemmaGlossMap$?: Observable<Map<string, string>>;
  getLemmaGlossMap(): Observable<Map<string, string>> {
    if (this.lemmaGlossMap$) return this.lemmaGlossMap$;
    this.lemmaGlossMap$ = this.getLemmasIndex().pipe(
      map(idx => {
        const m = new Map<string, string>();
        if (idx?.lemmas) {
          for (const l of idx.lemmas) {
            if (l.gloss) m.set(l.slug, l.gloss);
          }
        }
        return m;
      }),
      shareReplay(1),
    );
    return this.lemmaGlossMap$;
  }

  getRootsIndex(): Observable<RootsIndex | null> {
    if (this.rootsIndex$) return this.rootsIndex$;
    this.rootsIndex$ = this.http.get<RootsIndex>(
      `${this.base}index/roots.json`,
    ).pipe(catchError(() => of(null)), shareReplay(1));
    return this.rootsIndex$;
  }

  /** Clear all in-memory caches. */
  clearCache(): void {
    this.surfaceCache.clear();
    this.lemmaCache.clear();
    this.rootCache.clear();
    this.surfacesIndex$ = undefined;
    this.lemmasIndex$ = undefined;
    this.rootsIndex$ = undefined;
  }
}
