import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { NarratorAnalysis } from '@app/models';
import { environment } from '@env/environment';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

/**
 * Fetches the precomputed per-chapter narrator-analysis sidecar
 * (`books/.../{chapter}.narrators.json`) that powers the opt-in "Narrator
 * insights" panel.
 *
 * Bandwidth discipline: nothing is requested until a chapter's panel is
 * expanded (the component calls `get()` lazily). Responses are cached
 * in-memory with `shareReplay(1)` keyed by chapter index, and a missing
 * sidecar (404 — e.g. a chapter with no isnad data) resolves to `null`
 * rather than throwing, so the panel degrades gracefully.
 */
@Injectable({ providedIn: 'root' })
export class NarratorAnalysisService {
  private cache = new Map<string, Observable<NarratorAnalysis | null>>();
  private http = inject(HttpClient);

  get(index: string): Observable<NarratorAnalysis | null> {
    const cached = this.cache.get(index);
    if (cached) return cached;

    const url = `${environment.apiBaseUrl}books/${index.replace(/:/g, '/')}.narrators.json`;
    const req$ = this.http.get<NarratorAnalysis>(url).pipe(
      map(doc => (doc && doc.kind === 'narrator_analysis' ? doc : null)),
      catchError(() => of(null)),
      shareReplay(1),
    );
    this.cache.set(index, req$);
    return req$;
  }
}
