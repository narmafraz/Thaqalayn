import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { create, insert, search } from '@orama/orama';
import { environment } from '@env/environment';

export interface SearchResult {
  path: string;
  title: string;
  titleAr: string;
  snippet: string;
  bookName: string;
  kind: 'title' | 'hadith';
  score: number;
}

interface TitleDocument {
  path: string;
  title: string;
  titleAr: string;
  partType: string;
  bookName: string;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private titlesDb: any = null;
  private titlesLoaded = false;
  private titlesLoading: Promise<void> | null = null;

  private http = inject(HttpClient);

  async loadTitlesIndex(): Promise<void> {
    if (this.titlesLoaded) return;
    if (this.titlesLoading) return this.titlesLoading;

    this.titlesLoading = this._loadTitlesIndex();
    return this.titlesLoading;
  }

  private async _loadTitlesIndex(): Promise<void> {
    try {
      const url = `${environment.apiBaseUrl}search/titles.json`;
      const data = await this.http.get<TitleDocument[]>(url).toPromise();

      this.titlesDb = await create({
        schema: {
          path: 'string',
          title: 'string',
          titleAr: 'string',
          partType: 'string',
          bookName: 'string'
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

  async searchTitles(query: string, limit = 20): Promise<SearchResult[]> {
    if (!this.titlesLoaded || !this.titlesDb) {
      return [];
    }

    const normalizedQuery = this.normalizeArabic(query);

    const results = await search(this.titlesDb, {
      term: normalizedQuery,
      limit,
      properties: ['title', 'titleAr', 'partType']
    });

    return results.hits.map(hit => ({
      path: (hit.document as TitleDocument).path,
      title: (hit.document as TitleDocument).title,
      titleAr: (hit.document as TitleDocument).titleAr,
      snippet: '',
      bookName: (hit.document as TitleDocument).bookName,
      kind: 'title' as const,
      score: hit.score
    }));
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
