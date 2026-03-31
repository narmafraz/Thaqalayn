import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface TafsirEdition {
  id: string;
  name: string;
  name_en: string;
  author: string;
  author_en: string;
  language: string;
  source: string;
}

export interface TafsirAyah {
  ayah: number;
  text: string;
}

const TAFSIR_BASE = environment.apiBaseUrl + 'tafsir';

@Injectable({ providedIn: 'root' })
export class TafsirService {
  private http = inject(HttpClient);
  private cache = new Map<string, Observable<TafsirAyah[]>>();

  editions: TafsirEdition[] = [];
  private editionsLoaded = false;

  loadEditions(): Observable<TafsirEdition[]> {
    if (this.editionsLoaded) {
      return of(this.editions);
    }
    return this.http.get<TafsirEdition[]>(`${TAFSIR_BASE}/editions.json`).pipe(
      tap(editions => {
        this.editions = editions;
        this.editionsLoaded = true;
      }),
      catchError(() => {
        this.editions = [];
        this.editionsLoaded = true;
        return of([]);
      }),
      shareReplay(1),
    );
  }

  getEditionsByLanguage(): Map<string, TafsirEdition[]> {
    const byLang = new Map<string, TafsirEdition[]>();
    for (const ed of this.editions) {
      const list = byLang.get(ed.language) || [];
      list.push(ed);
      byLang.set(ed.language, list);
    }
    return byLang;
  }

  getTafsir(surah: number, edition: string): Observable<TafsirAyah[]> {
    const key = `${edition}:${surah}`;
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const url = `${TAFSIR_BASE}/${edition}/${surah}.json`;
    const result$ = this.http.get<any>(url).pipe(
      map(response => {
        // New format: { blocks: [...], ayahs: [{ ayah, block }] }
        // Each ayah references a block index to avoid duplicating large commentary text
        const blocks: string[] = response.blocks || [];
        const ayahs = response.ayahs || response;
        if (!Array.isArray(ayahs)) return [];
        return ayahs.map((a: any) => ({
          ayah: a.ayah || a.ayah_number || 0,
          text: a.block !== undefined && blocks.length > 0
            ? blocks[a.block] || ''
            : a.text || '',
        }));
      }),
      catchError(() => of([])),
      shareReplay(1),
    );

    this.cache.set(key, result$);
    return result$;
  }

  getAyahTafsir(surah: number, ayah: number, edition: string): Observable<string> {
    return this.getTafsir(surah, edition).pipe(
      map(ayahs => {
        const match = ayahs.find(a => a.ayah === ayah);
        return match?.text || '';
      }),
    );
  }
}
