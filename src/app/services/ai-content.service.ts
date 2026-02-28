import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

export interface TopicTaxonomyEntry {
  count: number;
  paths: string[];
}

export type TopicTaxonomy = Record<string, Record<string, TopicTaxonomyEntry>>;

export interface PhraseIndexEntry {
  phrase_ar: string;
  phrase_en: string;
  category: string;
  paths: string[];
}

export type PhraseIndex = Record<string, PhraseIndexEntry>;

@Injectable({ providedIn: 'root' })
export class AiContentService {
  private http = inject(HttpClient);
  private topicsCache$: Observable<TopicTaxonomy | null> | null = null;
  private phrasesCache$: Observable<PhraseIndex | null> | null = null;

  /** Load the topic taxonomy index (lazy, cached) */
  getTopics(): Observable<TopicTaxonomy | null> {
    if (!this.topicsCache$) {
      this.topicsCache$ = this.http
        .get<TopicTaxonomy>(`${environment.apiBaseUrl}index/topics.json`)
        .pipe(
          catchError(() => of(null)),
          shareReplay(1),
        );
    }
    return this.topicsCache$;
  }

  /** Load the key phrases index (lazy, cached) */
  getPhrases(): Observable<PhraseIndex | null> {
    if (!this.phrasesCache$) {
      this.phrasesCache$ = this.http
        .get<PhraseIndex>(`${environment.apiBaseUrl}index/phrases.json`)
        .pipe(
          catchError(() => of(null)),
          shareReplay(1),
        );
    }
    return this.phrasesCache$;
  }

  /** Check if AI content indexes are available */
  hasTopics(): Observable<boolean> {
    return this.getTopics().pipe(map(t => t !== null));
  }
}
