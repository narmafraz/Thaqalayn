import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable, Subject, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

const STORAGE_KEY = 'thaqalayn-ui-lang';
const RTL_LANGUAGES = ['ar', 'fa', 'ur'];

@Injectable({
  providedIn: 'root'
})
export class I18nService {

  private strings: Record<string, unknown> = {};
  private enStringsCache: Record<string, unknown> | null = null;
  private langSubject: BehaviorSubject<string>;
  private stringsChangedSubject = new Subject<void>();
  private isBrowser: boolean;

  currentLang$: Observable<string>;
  isRtl$: Observable<boolean>;
  stringsChanged$ = this.stringsChangedSubject.asObservable();

  /** Synchronous accessor for the current language code. */
  get currentLang(): string {
    return this.langSubject.value;
  }

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    const initialLang = this.detectLanguage();
    this.langSubject = new BehaviorSubject<string>(initialLang);
    this.currentLang$ = this.langSubject.asObservable();
    this.isRtl$ = this.currentLang$.pipe(
      map(lang => RTL_LANGUAGES.includes(lang))
    );
    this.loadStrings(initialLang);
  }

  get(key: string): string {
    const parts = key.split('.');
    let current: unknown = this.strings;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }
    return typeof current === 'string' ? current : key;
  }

  setLanguage(lang: string): void {
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, lang);
    }
    this.loadStrings(lang);
    this.langSubject.next(lang);
  }

  private detectLanguage(): string {
    if (!this.isBrowser) {
      return 'en';
    }

    // Check window.location.search for path-based routing (e.g., /books?lang=fa)
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang) {
      localStorage.setItem(STORAGE_KEY, urlLang);
      return urlLang;
    }

    // Also check the hash fragment for hash-based URLs (e.g., /#/books?lang=fa)
    const hash = window.location.hash;
    if (hash) {
      const hashQueryIndex = hash.indexOf('?');
      if (hashQueryIndex !== -1) {
        const hashParams = new URLSearchParams(hash.substring(hashQueryIndex));
        const hashLang = hashParams.get('lang');
        if (hashLang) {
          localStorage.setItem(STORAGE_KEY, hashLang);
          return hashLang;
        }
      }
    }

    const storedLang = localStorage.getItem(STORAGE_KEY);
    if (storedLang) {
      return storedLang;
    }

    // Auto-detect from browser language
    const browserLang = this.detectBrowserLanguage();
    if (browserLang) {
      return browserLang;
    }

    return 'en';
  }

  private detectBrowserLanguage(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    const supported = ['en', 'ar', 'fa', 'fr', 'ur', 'tr', 'id', 'bn', 'es', 'de', 'ru', 'zh'];
    const navLangs = navigator.languages || [navigator.language];
    for (const lang of navLangs) {
      const code = lang.split('-')[0].toLowerCase();
      if (supported.includes(code)) {
        return code;
      }
    }
    return null;
  }

  /**
   * Deep merge two objects. Values from `override` take precedence over `base`.
   * Both objects are nested Record<string, unknown> structures.
   */
  deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...base };
    for (const key of Object.keys(override)) {
      if (
        key in result &&
        typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key]) &&
        typeof override[key] === 'object' && override[key] !== null && !Array.isArray(override[key])
      ) {
        result[key] = this.deepMerge(
          result[key] as Record<string, unknown>,
          override[key] as Record<string, unknown>
        );
      } else {
        result[key] = override[key];
      }
    }
    return result;
  }

  private loadStrings(lang: string): void {
    if (lang === 'en') {
      // For English, just load en.json directly
      this.http.get<Record<string, unknown>>('assets/i18n/en.json').subscribe({
        next: (data) => {
          this.enStringsCache = data;
          this.strings = data;
          this.stringsChangedSubject.next();
        },
        error: () => {
          // English failed to load — nothing we can do
        }
      });
    } else {
      // For non-English: load en.json as base, then merge locale on top
      const en$ = this.enStringsCache
        ? of(this.enStringsCache)
        : this.http.get<Record<string, unknown>>('assets/i18n/en.json').pipe(
            catchError(() => of(null))
          );
      const locale$ = this.http.get<Record<string, unknown>>(`assets/i18n/${lang}.json`).pipe(
        catchError(() => of(null))
      );

      forkJoin([en$, locale$]).subscribe(([enData, localeData]) => {
        if (enData) {
          this.enStringsCache = enData;
        }
        if (enData && localeData) {
          // Merge: English base + locale overrides
          this.strings = this.deepMerge(enData, localeData);
        } else if (localeData) {
          // English failed but locale loaded
          this.strings = localeData;
        } else if (enData) {
          // Locale failed, fall back to English
          this.strings = enData;
        }
        // else both failed — keep existing strings
        this.stringsChangedSubject.next();
      });
    }
  }
}
