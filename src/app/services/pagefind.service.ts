import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { environment } from '@env/environment';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';

/** index/manifest.json from the meta search site (thaqalaynsearch.netlify.app). */
export interface SearchManifest {
  schema_version: number;
  data_version: string;
  books: string[];
  languages: { code: string; pages: number }[];
  filters: string[];
}

/** Pagefind facet counts: { filterName: { value: count } }. */
export type PagefindFilterCounts = Record<string, Record<string, number>>;

export interface PagefindResult {
  url: string;
  excerpt: string;
  meta: Record<string, string>;
}

export interface PagefindResponse {
  total: number;
  results: PagefindResult[]; // resolved (data()) for the first `limit`
  filters: PagefindFilterCounts; // counts within the current result set
  totalFilters: PagefindFilterCounts; // counts ignoring each filter (drives the sidebar)
}

// Minimal shape of the Pagefind runtime module (loaded from the language site).
interface PagefindModule {
  init(): Promise<void>;
  search(
    term: string | null,
    opts?: { filters?: Record<string, string | string[]> },
  ): Promise<{
    results: { id: string; data: () => Promise<PagefindResult> }[];
    filters: PagefindFilterCounts;
    totalFilters: PagefindFilterCounts;
  }>;
}

/**
 * Loads and queries the per-language Pagefind bundles.
 *
 * Each language is its own static site (thaqalaynsearch-<lang>.netlify.app);
 * its pagefind.js is dynamically imported cross-origin and computes its asset
 * paths from import.meta.url, so it fetches its wasm/index/fragments from that
 * same origin (CORS is open on those sites). manifest.json + qref.json come from
 * the meta site (environment.searchBaseUrl). Browser-only (SSR-guarded).
 */
@Injectable({ providedIn: 'root' })
export class PagefindService {
  private http = inject(HttpClient);
  private readonly isBrowser: boolean;
  private manifest$?: Observable<SearchManifest | null>;
  private qref$?: Observable<Record<string, string[]> | null>;
  private readonly instances = new Map<string, Promise<PagefindModule | null>>();

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /** Built-languages manifest (cached). */
  getManifest(): Observable<SearchManifest | null> {
    if (!this.manifest$) {
      this.manifest$ = this.http
        .get<SearchManifest>(`${environment.searchBaseUrl}manifest.json`)
        .pipe(catchError(() => of(null)), shareReplay(1));
    }
    return this.manifest$;
  }

  /** Quran cross-reference index for `ref:` queries (cached, lazy). */
  getQref(): Observable<Record<string, string[]> | null> {
    if (!this.qref$) {
      this.qref$ = this.http
        .get<Record<string, string[]>>(`${environment.searchBaseUrl}qref.json`)
        .pipe(catchError(() => of(null)), shareReplay(1));
    }
    return this.qref$;
  }

  private langUrl(lang: string): string {
    return environment.searchLangUrl.replace('{lang}', lang);
  }

  /** Dynamically import + init the Pagefind module for a language (cached). */
  private loadInstance(lang: string): Promise<PagefindModule | null> {
    if (!this.isBrowser) {
      return Promise.resolve(null);
    }
    let inst = this.instances.get(lang);
    if (!inst) {
      inst = (async () => {
        try {
          const url = `${this.langUrl(lang)}pagefind.js`;
          // Hide the import from the bundler: it's a runtime cross-origin URL,
          // not a build-time dependency.
          const importer = new Function('u', 'return import(u)') as (u: string) => Promise<unknown>;
          const mod = (await importer(url)) as PagefindModule;
          await mod.init();
          return mod;
        } catch (e) {
          console.error(`[Pagefind] failed to load bundle for '${lang}'`, e);
          return null;
        }
      })();
      this.instances.set(lang, inst);
    }
    return inst;
  }

  /** Has a given language's bundle been requested/loaded already? */
  isLoaded(lang: string): boolean {
    return this.instances.has(lang);
  }

  /**
   * Search a language. `term` empty/whitespace performs a filter-only query
   * (returns all matching the filters, with facet counts). Returns null if the
   * bundle couldn't load (e.g. SSR, or that language site isn't deployed).
   */
  async search(
    lang: string,
    term: string,
    filters?: Record<string, string | string[]>,
    limit = 30,
  ): Promise<PagefindResponse | null> {
    const pf = await this.loadInstance(lang);
    if (!pf) {
      return null;
    }
    const res = await pf.search(term && term.trim() ? term : null, filters ? { filters } : undefined);
    const top = await Promise.all(res.results.slice(0, limit).map((r) => r.data()));
    return {
      total: res.results.length,
      results: top.map((d) => ({ url: d.url, excerpt: d.excerpt, meta: d.meta || {} })),
      filters: res.filters || {},
      totalFilters: res.totalFilters || {},
    };
  }
}
