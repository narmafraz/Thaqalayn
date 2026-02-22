import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

export interface TafsirEdition {
  name: string;
  author_name: string;
  slug: string;
  language: string;
}

export interface TafsirAyah {
  id: number;
  surah_number: number;
  ayah_number: number;
  text: string;
}

const TAFSIR_CDN = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api/tafsir';

// Curated list of English tafsir editions available on the CDN
const DEFAULT_EDITIONS: TafsirEdition[] = [
  { name: 'Tafsir Ibn Kathir', author_name: 'Ibn Kathir', slug: 'en-tafisr-ibn-kathir', language: 'en' },
  { name: 'Tafsir al-Jalalayn', author_name: 'Jalal ad-Din al-Mahalli & Jalal ad-Din as-Suyuti', slug: 'en-al-jalalayn', language: 'en' },
  { name: 'Maarif-ul-Quran', author_name: 'Mufti Muhammad Shafi', slug: 'en-tafsir-maarif-ul-quran', language: 'en' },
];

@Injectable({ providedIn: 'root' })
export class TafsirService {
  private http = inject(HttpClient);
  private cache = new Map<string, Observable<TafsirAyah[]>>();

  readonly editions: TafsirEdition[] = DEFAULT_EDITIONS;

  getTafsir(surah: number, edition: string = 'en-tafsir-ibne-kathir'): Observable<TafsirAyah[]> {
    const key = `${edition}:${surah}`;
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const url = `${TAFSIR_CDN}/${edition}/${surah}.json`;
    const result$ = this.http.get<any>(url).pipe(
      map(response => {
        // The API returns { ayahs: [...] } or just an array
        const ayahs = response.ayahs || response;
        if (!Array.isArray(ayahs)) return [];
        return ayahs.map((a: any) => ({
          id: a.id || 0,
          surah_number: a.surah || a.surah_number || surah,
          ayah_number: a.ayah || a.ayah_number || a.number || 0,
          text: a.text || '',
        }));
      }),
      catchError(() => of([])),
      shareReplay(1),
    );

    this.cache.set(key, result$);
    return result$;
  }

  getAyahTafsir(surah: number, ayah: number, edition: string = 'en-tafsir-ibne-kathir'): Observable<string> {
    return this.getTafsir(surah, edition).pipe(
      map(ayahs => {
        const match = ayahs.find(a => a.ayah_number === ayah);
        return match?.text || '';
      }),
    );
  }
}
