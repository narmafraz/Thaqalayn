import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

export interface RelatedChapter {
  path: string;
  title: string;
  book: string;
  score: number;
}

type RelatedChaptersIndex = Record<string, RelatedChapter[]>;

@Injectable({ providedIn: 'root' })
export class RelatedChaptersService {
  private http = inject(HttpClient);
  private cache$: Observable<RelatedChaptersIndex> | null = null;

  getRelatedChapters(chapterPath: string): Observable<RelatedChapter[]> {
    if (!this.cache$) {
      this.cache$ = this.http
        .get<RelatedChaptersIndex>(`${environment.apiBaseUrl}index/related_chapters.json`)
        .pipe(
          catchError(() => of({})),
          shareReplay(1),
        );
    }
    return this.cache$.pipe(
      map(index => index[chapterPath] || []),
    );
  }
}
