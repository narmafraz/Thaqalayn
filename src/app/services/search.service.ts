import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { create, insert, search } from '@orama/orama';
import { environment } from '@env/environment';

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

      this.titlesDb = await create({
        schema: {
          p: 'string',
          pt: 'string',
          en: 'string',
          ar: 'string',
          arn: 'string',
        } as const
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
    const books = ['quran-docs', 'al-kafi-docs'];
    const bookNames: Record<string, string> = {
      'quran-docs': 'Quran',
      'al-kafi-docs': 'Al-Kafi',
    };

    try {
      for (const bookKey of books) {
        const url = `${environment.apiBaseUrl}index/search/${bookKey}.json`;
        const data = await this.http.get<FullTextDocument[]>(url).toPromise();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db: any = await create({
          schema: {
            p: 'string',
            t: 'string',
            ar: 'string',
            en: 'string',
            i: 'number',
          } as const
        });

        if (data) {
          for (const doc of data) {
            await insert(db, doc);
          }
        }

        this.fullTextDbs.set(bookKey, { db, bookName: bookNames[bookKey] || bookKey });
      }

      this.fullTextLoaded = true;
    } catch (err) {
      console.error('[SearchService] Failed to load full-text index:', err);
      this.fullTextLoading = null;
      throw err;
    }
  }

  async searchTitles(query: string, limit = 20): Promise<SearchResult[]> {
    if (!this.titlesLoaded || !this.titlesDb) {
      return [];
    }

    const normalizedQuery = this.normalizeArabic(query);

    const results = await search(this.titlesDb, {
      term: normalizedQuery,
      limit,
      properties: ['en', 'ar', 'arn', 'pt']
    });

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
  async searchFullText(query: string, limit = 30): Promise<SearchResult[]> {
    if (!this.fullTextLoaded) return [];

    const normalizedQuery = this.normalizeArabic(query);
    const allResults: SearchResult[] = [];

    for (const [, entry] of this.fullTextDbs) {
      const results = await search(entry.db, {
        term: normalizedQuery,
        limit: Math.ceil(limit / this.fullTextDbs.size),
        properties: ['ar', 'en', 't']
      });

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
  async searchAll(query: string, mode: SearchMode = 'titles', limit = 30): Promise<SearchResult[]> {
    if (mode === 'fulltext') {
      if (!this.fullTextLoaded) {
        await this.loadFullTextIndex();
      }
      const [titleResults, fulltextResults] = await Promise.all([
        this.searchTitles(query, 10),
        this.searchFullText(query, limit),
      ]);
      // Merge: titles first (boosted), then full text
      const titlePaths = new Set(titleResults.map(r => r.path));
      const uniqueFulltext = fulltextResults.filter(r => !titlePaths.has(r.path));
      return [...titleResults, ...uniqueFulltext].slice(0, limit);
    }

    return this.searchTitles(query, limit);
  }

  private bookNameFromPath(path: string): string {
    if (path.startsWith('/books/quran')) return 'Quran';
    if (path.startsWith('/books/al-kafi')) return 'Al-Kafi';
    // Fallback: extract from path
    const match = path.match(/\/books\/([^:]+)/);
    return match ? match[1] : '';
  }

  private normalizeArabic(text: string): string {
    if (!text) return '';
    return text
      // Remove Arabic diacritics
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8]/g, '')
      // Normalize Alif variants
      .replace(/[إأآا]/g, 'ا')
      // Normalize Ta Marbuta
      .replace(/ة/g, 'ه')
      // Normalize Ya and Alif Maksura
      .replace(/[يى]/g, 'ي')
      .trim();
  }
}
