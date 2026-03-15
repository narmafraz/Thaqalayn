import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { create, insert, search } from '@orama/orama';
import { environment } from '@env/environment';
import { AiContentService } from './ai-content.service';
import { firstValueFrom } from 'rxjs';

export type SearchMode = 'titles' | 'fulltext';

export interface SearchResult {
  path: string;
  title: string;
  titleAr: string;
  snippet: string;
  bookName: string;
  kind: 'title' | 'hadith';
  score: number;
}

/** Matches the actual titles.json schema: p, pt, en, ar, arn */
interface TitleDocument {
  p: string;     // path
  pt: string;    // partType
  en: string;    // English title
  ar: string;    // Arabic title (with diacritics)
  arn: string;   // Arabic title (normalized)
}

interface FullTextDocument {
  p: string;    // path
  t: string;    // chapter title
  ar: string;   // normalized Arabic text
  en: string;   // English translation
  i: number;    // local index
}

/** Matches the search-meta.json schema */
interface SearchMeta {
  version: number;
  schemas: {
    book: {
      files: Record<string, string>;  // e.g. { "quran": "quran-docs.json", "al-kafi": "al-kafi-docs.json" }
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Orama's internal types are excessively deep
  private titlesDb: any = null;
  private titlesLoaded = false;
  private titlesLoading: Promise<void> | null = null;

  // Full-text indexes (loaded on demand)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private fullTextDbs: Map<string, any> = new Map();
  private fullTextLoaded = false;
  private fullTextLoading: Promise<void> | null = null;

  private http = inject(HttpClient);
  private aiContentService = inject(AiContentService);

  get isFullTextLoaded(): boolean {
    return this.fullTextLoaded;
  }

  async loadTitlesIndex(): Promise<void> {
    if (this.titlesLoaded) return;
    if (this.titlesLoading) return this.titlesLoading;

    this.titlesLoading = this._loadTitlesIndex();
    return this.titlesLoading;
  }

  private async _loadTitlesIndex(): Promise<void> {
    try {
      const url = `${environment.apiBaseUrl}index/search/titles.json`;
      const data = await this.http.get<TitleDocument[]>(url).toPromise();

      // TODO: Add 'book' enum field to schema for faceted search (requires generator changes)
      // TODO: Pre-build index at data-gen time and use save/load for instant startup
      this.titlesDb = await create({
        schema: {
          p: 'string',
          pt: 'string',
          en: 'string',
          ar: 'string',
          arn: 'string',
        } as const,
        // Arabic tokenizer handles both Arabic and space-separated English text.
        // For proper English stemming, a dual-index approach would be needed.
        language: 'arabic',
        components: {
          tokenizer: {
            stemming: false,
            tokenizeSkipProperties: ['p'],
          },
        },
      });

      if (data) {
        for (const doc of data) {
          await insert(this.titlesDb, doc);
        }
      }

      this.titlesLoaded = true;
    } catch (err) {
      console.error('[SearchService] Failed to load titles index:', err);
      this.titlesLoading = null;
      throw err;
    }
  }

  /** Load full-text search indexes for all books */
  async loadFullTextIndex(): Promise<void> {
    if (this.fullTextLoaded) return;
    if (this.fullTextLoading) return this.fullTextLoading;

    this.fullTextLoading = this._loadFullTextIndex();
    return this.fullTextLoading;
  }

  private async _loadFullTextIndex(): Promise<void> {
    try {
      // Fetch search-meta.json to discover all available book indexes
      const metaUrl = `${environment.apiBaseUrl}index/search/search-meta.json`;
      const meta = await this.http.get<SearchMeta>(metaUrl).toPromise();

      if (!meta?.schemas?.book?.files) {
        console.warn('[SearchService] search-meta.json has no book files');
        this.fullTextLoaded = true;
        return;
      }

      const bookFiles = meta.schemas.book.files;

      // Load all book indexes in parallel for faster startup
      await Promise.all(Object.entries(bookFiles).map(async ([bookSlug, filename]) => {
        const url = `${environment.apiBaseUrl}index/search/${filename}`;
        const data = await this.http.get<FullTextDocument[]>(url).toPromise();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // TODO: Add 'book: enum' field for faceted search, where filters, and groupBy (requires generator changes)
        // TODO: Pre-build index at data-gen time and use save/load for instant startup
        const db: any = await create({
          schema: {
            p: 'string',
            t: 'string',
            ar: 'string',
            en: 'string',
            i: 'number',
          } as const,
          language: 'arabic',
          components: {
            tokenizer: {
              stemming: false,
              tokenizeSkipProperties: ['p'],
            },
          },
        });

        if (data) {
          for (const doc of data) {
            await insert(db, doc);
          }
        }

        const bookName = this.slugToDisplayName(bookSlug);
        this.fullTextDbs.set(bookSlug, { db, bookName });
      }));

      this.fullTextLoaded = true;
    } catch (err) {
      console.error('[SearchService] Failed to load full-text index:', err);
      this.fullTextLoading = null;
      throw err;
    }
  }

  /** Convert a book slug like 'al-kafi' to a display name like 'Al-Kafi' */
  private slugToDisplayName(slug: string): string {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  async searchTitles(query: string, limit = 20, offset = 0): Promise<SearchResult[]> {
    if (!this.titlesLoaded || !this.titlesDb) {
      return [];
    }

    const normalizedQuery = this.normalizeArabic(query);
    const isMultiWord = normalizedQuery.trim().split(/\s+/).length > 1;

    // Use AND logic (threshold: 0) for multi-word queries, with OR fallback
    // Boost English titles higher than Arabic, and partType lowest
    let results = await search(this.titlesDb, {
      term: normalizedQuery,
      limit,
      offset,
      properties: ['en', 'ar', 'arn', 'pt'],
      threshold: isMultiWord ? 0 : 1,
      tolerance: isMultiWord ? 0 : 1,
      boost: { en: 2, ar: 1.5, arn: 1.5, pt: 0.5 },
    });

    // If AND returned too few results, fall back to OR
    if (isMultiWord && results.count < 3) {
      results = await search(this.titlesDb, {
        term: normalizedQuery,
        limit,
        offset,
        properties: ['en', 'ar', 'arn', 'pt'],
        threshold: 1,
        tolerance: 1,
        boost: { en: 2, ar: 1.5, arn: 1.5, pt: 0.5 },
      });
    }

    return results.hits.map(hit => {
      const doc = hit.document as unknown as TitleDocument;
      return {
        path: doc.p,
        title: doc.en,
        titleAr: doc.ar,
        snippet: '',
        bookName: this.bookNameFromPath(doc.p),
        kind: 'title' as const,
        score: hit.score
      };
    });
  }

  /** Search full-text content across all loaded books */
  async searchFullText(query: string, limit = 30, offset = 0): Promise<SearchResult[]> {
    if (!this.fullTextLoaded) return [];

    const normalizedQuery = this.normalizeArabic(query);
    const isMultiWord = normalizedQuery.trim().split(/\s+/).length > 1;
    const allResults: SearchResult[] = [];
    const perBookLimit = Math.ceil(limit / this.fullTextDbs.size);
    // NOTE: Dividing global offset evenly across N books is approximate — when results
    // are unevenly distributed across books, some pages may have gaps. This is acceptable
    // because the final global re-sort + slice produces correct output for the caller.
    const perBookOffset = Math.ceil(offset / this.fullTextDbs.size);

    for (const [, entry] of this.fullTextDbs) {
      // Use AND logic for multi-word queries, with OR fallback
      // Boost English translations and chapter titles above Arabic
      // BM25 tuning: lower b to reduce length penalty on longer hadiths
      let results = await search(entry.db, {
        term: normalizedQuery,
        limit: perBookLimit,
        offset: perBookOffset,
        properties: ['ar', 'en', 't'],
        threshold: isMultiWord ? 0 : 1,
        tolerance: isMultiWord ? 0 : 1,
        boost: { en: 2, t: 1.5, ar: 1 },
        relevance: { k: 1.2, b: 0.5, d: 0.5 },
      });

      // If AND returned nothing for this book, fall back to OR
      if (isMultiWord && results.count === 0) {
        results = await search(entry.db, {
          term: normalizedQuery,
          limit: perBookLimit,
          offset: perBookOffset,
          properties: ['ar', 'en', 't'],
          threshold: 1,
          tolerance: 1,
          boost: { en: 2, t: 1.5, ar: 1 },
          relevance: { k: 1.2, b: 0.5, d: 0.5 },
        });
      }

      for (const hit of results.hits) {
        const doc = hit.document as unknown as FullTextDocument;
        // Build snippet from English translation, truncated
        const snippet = doc.en ? doc.en.substring(0, 200) + (doc.en.length > 200 ? '...' : '') : '';
        // Build path to chapter (strip verse index for chapter-level link)
        const chapterPath = doc.p.replace(/:\d+$/, '');

        allResults.push({
          path: chapterPath,
          title: doc.t || chapterPath,
          titleAr: '',
          snippet,
          bookName: entry.bookName,
          kind: 'hadith' as const,
          score: hit.score,
        });
      }
    }

    // Sort by score descending and limit
    allResults.sort((a, b) => b.score - a.score);
    return allResults.slice(0, limit);
  }

  /** Combined search: titles + full text (if loaded) */
  async searchAll(query: string, mode: SearchMode = 'titles', limit = 30, offset = 0): Promise<SearchResult[]> {
    // Intercept filter prefix queries (topic:, tag:, type:)
    const filtered = this.parseFilteredQuery(query);
    if (filtered) {
      if (filtered.prefix === 'topic') {
        return this.searchByTopic(filtered.value, limit, offset);
      }
      // For tag: and type: — strip prefix, search the value as plain text
      return this.searchAllPlain(filtered.value, mode, limit, offset);
    }

    return this.searchAllPlain(query, mode, limit, offset);
  }

  /** Plain search without filter prefix handling */
  private async searchAllPlain(query: string, mode: SearchMode, limit: number, offset = 0): Promise<SearchResult[]> {
    if (mode === 'fulltext') {
      if (!this.fullTextLoaded) {
        await this.loadFullTextIndex();
      }
      const [titleResults, fulltextResults] = await Promise.all([
        // Always fetch titles from offset 0 — they're boosted to top and capped at 10,
        // so applying a global offset would skip all title matches on page 2+
        this.searchTitles(query, 10),
        this.searchFullText(query, limit, offset),
      ]);
      // Merge: titles first (boosted), then full text
      const titlePaths = new Set(titleResults.map(r => r.path));
      const uniqueFulltext = fulltextResults.filter(r => !titlePaths.has(r.path));
      return [...titleResults, ...uniqueFulltext].slice(0, limit);
    }

    return this.searchTitles(query, limit, offset);
  }

  /** Search by topic using the AI topics index */
  async searchByTopic(topicValue: string, limit = 50, offset = 0): Promise<SearchResult[]> {
    const topics = await firstValueFrom(this.aiContentService.getTopics());
    if (!topics) return [];

    const normalizedValue = topicValue.toLowerCase().replace(/_/g, ' ');
    const matchingPaths: string[] = [];

    for (const [, l2s] of Object.entries(topics)) {
      for (const [l2Key, entry] of Object.entries(l2s)) {
        if (l2Key === topicValue || l2Key.replace(/_/g, ' ').toLowerCase().includes(normalizedValue)) {
          matchingPaths.push(...entry.paths);
        }
      }
    }

    // Deduplicate and resolve chapter paths
    const uniqueChapterPaths = [...new Set(matchingPaths.map(p => p.replace(/:\d+$/, '')))];

    return uniqueChapterPaths.slice(offset, offset + limit).map(chapterPath => ({
      path: chapterPath,
      title: '',
      titleAr: '',
      snippet: `Contains hadith about "${topicValue.replace(/_/g, ' ')}"`,
      bookName: this.bookNameFromPath(chapterPath),
      kind: 'hadith' as const,
      score: 1,
    }));
  }

  private bookNameFromPath(path: string): string {
    const match = path.match(/\/books\/([^:]+)/);
    if (!match) return '';
    return this.slugToDisplayName(match[1]);
  }

  /** Parse a filtered query with prefix syntax (tag:xxx, type:xxx, topic:xxx).
   *  Returns { prefix, value } if a filter prefix is found, or null for plain queries.
   */
  parseFilteredQuery(query: string): { prefix: string; value: string } | null {
    const match = query.match(/^(tag|type|topic):(.+)$/);
    if (match) {
      return { prefix: match[1], value: match[2].trim() };
    }
    return null;
  }

  private normalizeArabic(text: string): string {
    if (!text) return '';
    return text
      // Remove Arabic diacritics
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8]/g, '')
      // Remove zero-width characters (ZWNJ, ZWJ, ZWSP, RLM, LRM)
      .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '')
      // Normalize Alif variants
      .replace(/[إأآا]/g, 'ا')
      // Normalize Ta Marbuta
      .replace(/ة/g, 'ه')
      // Normalize Persian kaf to Arabic kaf
      .replace(/\u06A9/g, '\u0643')
      // Normalize Persian/Farsi yeh and Alif Maksura to Arabic yeh
      .replace(/[\u06CC\u0649\u064A]/g, '\u064A')
      .trim();
  }
}
