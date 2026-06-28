import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { AiContentService } from './ai-content.service';
import { normalizeArabic } from './arabic-normalize';
import { PagefindFilterCounts, PagefindService } from './pagefind.service';

export type SearchMode = 'titles' | 'fulltext';

export interface SearchResult {
  path: string;
  title: string;
  titleAr: string;
  snippet: string; // plain text
  excerpt?: string; // highlighted HTML (<mark>…</mark>) for the /search results page
  bookName: string;
  kind: 'title' | 'hadith' | 'verse' | 'chapter';
  score: number;
  lang?: string; // which language index this full-text result came from
}

/** Result of a full search: hits + facet counts for the sidebar. */
export interface SearchOutcome {
  results: SearchResult[];
  facets: PagefindFilterCounts;
  capped: boolean; // true if more matches exist than were loaded (show "N+")
}

/** Parsed query: operators + residual term + facet filters. */
export interface ParsedQuery {
  route: 'topic' | 'ref' | 'plain';
  value: string; // for topic:/ref:
  term: string; // residual free-text (plain route)
  filters: Record<string, string[]>; // pagefind filters: book / tag / content_type
}

/** Matches the legacy titles.json schema: p, pt, en, ar, arn. */
interface TitleDocument {
  p: string; pt: string; en: string; ar: string; arn: string;
}

const OPERATOR_RE = /(\w+):("[^"]+"|\S+)/g;

@Injectable({ providedIn: 'root' })
export class SearchService {
  // Tier-1 titles: in-memory Orama (lazy). Orama is dynamically imported so it
  // stays out of the initial bundle.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Orama internal types are very deep
  private titlesDb: any = null;
  private titlesLoaded = false;
  private titlesLoading: Promise<void> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private orama: any = null;

  private http = inject(HttpClient);
  private aiContentService = inject(AiContentService);
  private pagefind = inject(PagefindService);

  /** Has the Pagefind bundle for this language been loaded already? */
  isFullTextLoaded(lang: string): boolean {
    return this.pagefind.isLoaded(lang);
  }

  // --- Tier 1: titles (Orama) ---

  async loadTitlesIndex(): Promise<void> {
    if (this.titlesLoaded) { return; }
    if (this.titlesLoading) { return this.titlesLoading; }
    this.titlesLoading = this._loadTitlesIndex();
    return this.titlesLoading;
  }

  private async _loadTitlesIndex(): Promise<void> {
    try {
      if (!this.orama) {
        this.orama = await import('@orama/orama');
      }
      const { create, insert } = this.orama;
      const url = `${environment.apiBaseUrl}index/search/titles.json`;
      const data = await firstValueFrom(this.http.get<TitleDocument[]>(url));

      this.titlesDb = await create({
        schema: { p: 'string', pt: 'string', en: 'string', ar: 'string', arn: 'string' } as const,
        components: { tokenizer: { language: 'arabic', stemming: false, tokenizeSkipProperties: ['p'] } },
      });
      if (data) {
        for (const doc of data) { await insert(this.titlesDb, doc); }
      }
      this.titlesLoaded = true;
    } catch (err) {
      console.error('[SearchService] Failed to load titles index:', err);
      this.titlesLoading = null;
      throw err;
    }
  }

  async searchTitles(query: string, limit = 10000): Promise<SearchResult[]> {
    if (!this.titlesLoaded || !this.titlesDb || !this.orama) { return []; }
    const { search } = this.orama;
    const normalizedQuery = normalizeArabic(query);
    const isMultiWord = normalizedQuery.trim().split(/\s+/).length > 1;

    const opts = (threshold: number, tolerance: number) => ({
      term: normalizedQuery, limit,
      properties: ['en', 'ar', 'arn', 'pt'],
      threshold, tolerance,
      boost: { en: 2, ar: 1.5, arn: 1.5, pt: 0.5 },
    });

    let results = await search(this.titlesDb, opts(isMultiWord ? 0 : 1, isMultiWord ? 0 : 1));
    if (isMultiWord && results.count < 3) {
      results = await search(this.titlesDb, opts(1, 1)); // OR fallback
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return results.hits.map((hit: any) => {
      const doc = hit.document as TitleDocument;
      return {
        path: doc.p, title: doc.en, titleAr: doc.ar, snippet: '',
        bookName: this.bookNameFromPath(doc.p), kind: 'chapter' as const, score: hit.score,
      };
    });
  }

  // --- Tier 3: full-text (Pagefind, per language) ---

  /** Full-text search via Pagefind for the given language. */
  async searchFullText(
    term: string, lang: string, filters: Record<string, string[]> = {}, limit = 100,
  ): Promise<SearchOutcome> {
    const cleaned = Object.fromEntries(Object.entries(filters).filter(([, v]) => v && v.length));
    // The Arabic index is normalized (diacritics stripped, letters folded) — apply
    // the same normalization to the query so it matches.
    const q = lang === 'ar' ? normalizeArabic(term) : term;
    const resp = await this.pagefind.search(lang, q, cleaned, limit);
    if (!resp) { return { results: [], facets: {}, capped: false }; }

    // Only `limit` fragments are fetched (bandwidth); resp.total is the true match
    // count, so flag when there are more than we loaded.
    const results = resp.results.map((r) => this.pagefindToResult(r.url, r.excerpt, lang));
    return { results, facets: resp.totalFilters, capped: resp.total > results.length };
  }

  private pagefindToResult(path: string, excerpt: string, lang: string): SearchResult {
    const isQuran = path.startsWith('/books/quran:');
    return {
      path,
      title: '', titleAr: '',
      snippet: this.stripHtml(excerpt),
      excerpt,
      bookName: this.bookNameFromPath(path),
      kind: isQuran ? 'verse' : 'hadith',
      score: 1,
      lang,
    };
  }

  // --- combined entry point ---

  /**
   * Run a search. `lang` is the chosen search language (for full-text);
   * `uiFilters` are facet selections from the sidebar (merged with query operators).
   */
  async searchAll(
    query: string, mode: SearchMode = 'titles', langs: string[] = ['en'], uiFilters: Record<string, string[]> = {},
  ): Promise<SearchOutcome> {
    const parsed = this.parseQuery(query);

    if (parsed.route === 'topic') {
      return { results: await this.searchByTopic(parsed.value), facets: {}, capped: false };
    }
    if (parsed.route === 'ref') {
      return { results: await this.searchByRef(parsed.value), facets: {}, capped: false };
    }

    // merge query-operator filters with sidebar facet selections
    const filters: Record<string, string[]> = { ...parsed.filters };
    for (const [k, v] of Object.entries(uiFilters)) {
      if (v && v.length) { filters[k] = [...(filters[k] || []), ...v]; }
    }

    if (mode === 'fulltext') {
      // Full-text mode returns ONLY Pagefind content results (across the chosen
      // language(s)), de-duplicated by verse path. Title/navigation matches are
      // available via 'titles' mode and the home page.
      const ftOutcomes = await Promise.all(langs.map((l) => this.searchFullText(parsed.term, l, filters)));
      const seen = new Set<string>();
      const merged: SearchResult[] = [];
      for (const o of ftOutcomes) {
        for (const r of o.results) {
          if (!seen.has(r.path)) { seen.add(r.path); merged.push(r); }
        }
      }
      // Facets come from the global filter listing (per-query search().filters is
      // unreliable/empty for these indexes); facet values are shared across
      // languages, so the primary language's index is representative.
      const facets = (await this.pagefind.getFilters(langs[0])) || {};
      return { results: merged, facets, capped: ftOutcomes.some((o) => o.capped) };
    }

    // titles mode
    return { results: await this.searchTitles(parsed.term || query), facets: {}, capped: false };
  }


  // --- operators ---

  /**
   * Parse operators out of a query.
   * - `topic:x` / `ref:2:255` -> dedicated routes (don't combine with free text)
   * - `book:`, `tag:`, `type:` -> Pagefind facet filters (type -> content_type)
   * - `phrase:"…"` or `phrase:word` -> exact-phrase term (quoted)
   * - everything else -> residual free-text term
   */
  parseQuery(raw: string): ParsedQuery {
    const query = (raw || '').trim();
    const topicMatch = query.match(/^topic:(.+)$/i);
    if (topicMatch) { return { route: 'topic', value: topicMatch[1].trim(), term: '', filters: {} }; }
    const refMatch = query.match(/^ref:(.+)$/i);
    if (refMatch) { return { route: 'ref', value: refMatch[1].trim(), term: '', filters: {} }; }

    const filters: Record<string, string[]> = {};
    const filterKey: Record<string, string> = { book: 'book', tag: 'tag', type: 'content_type' };
    const phraseParts: string[] = [];

    const residual = query.replace(OPERATOR_RE, (m, key: string, valRaw: string) => {
      const k = key.toLowerCase();
      const value = valRaw.replace(/^"|"$/g, '');
      if (filterKey[k]) {
        (filters[filterKey[k]] ||= []).push(value);
        return ' ';
      }
      if (k === 'phrase') {
        phraseParts.push(`"${value}"`);
        return ' ';
      }
      return m; // unknown prefix -> leave as text
    });

    const term = [...phraseParts, residual.trim()].filter(Boolean).join(' ').trim();
    return { route: 'plain', value: '', term, filters };
  }

  /** Back-compat wrapper for the previous prefix-parser (kept for existing specs). */
  parseFilteredQuery(query: string): { prefix: string; value: string } | null {
    const match = query.match(/^(tag|type|topic):(.+)$/);
    return match ? { prefix: match[1], value: match[2].trim() } : null;
  }

  // --- AI-index-backed routes ---

  /** topic:x -> verses tagged with that topic (index/topics.json). */
  async searchByTopic(topicValue: string): Promise<SearchResult[]> {
    const topics = await firstValueFrom(this.aiContentService.getTopics());
    if (!topics) { return []; }
    const normalizedValue = topicValue.toLowerCase().replace(/_/g, ' ');
    const matchingPaths: string[] = [];
    for (const [, l2s] of Object.entries(topics)) {
      for (const [l2Key, entry] of Object.entries(l2s)) {
        if (l2Key === topicValue || l2Key.replace(/_/g, ' ').toLowerCase().includes(normalizedValue)) {
          matchingPaths.push(...entry.paths);
        }
      }
    }
    return this.pathsToResults(matchingPaths);
  }

  /** ref:2:255 -> verses citing (or being) that Quran verse (qref.json). */
  async searchByRef(ref: string): Promise<SearchResult[]> {
    const qref = await firstValueFrom(this.pagefind.getQref());
    if (!qref) { return []; }
    const key = ref.trim();
    return this.pathsToResults(qref[key] || []);
  }

  private pathsToResults(paths: string[]): SearchResult[] {
    const unique = [...new Set(paths)];
    return unique.map((path) => {
      const stripped = path.startsWith('/books/') ? path.slice(7) : path;
      const parts = stripped.split(':');
      const isQuran = parts[0] === 'quran';
      const verseIdx = parts[parts.length - 1];
      return {
        path,
        title: `${isQuran ? 'Verse' : 'Hadith'} ${verseIdx}`,
        titleAr: '', snippet: '',
        bookName: this.bookNameFromPath(path),
        kind: (isQuran ? 'verse' : 'hadith') as 'verse' | 'hadith',
        score: 1,
      };
    });
  }

  // --- helpers ---

  private stripHtml(html: string): string {
    return (html || '').replace(/<[^>]+>/g, '');
  }

  private slugToDisplayName(slug: string): string {
    return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  private bookNameFromPath(path: string): string {
    const match = path.match(/\/books\/([^:]+)/);
    return match ? this.slugToDisplayName(match[1]) : '';
  }
}
