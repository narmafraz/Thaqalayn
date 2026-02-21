import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';

const STORAGE_KEY = 'thaqalayn-ui-lang';
const RTL_LANGUAGES = ['ar', 'fa', 'ur'];

@Injectable({
  providedIn: 'root'
})
export class I18nService {

  private strings: Record<string, unknown> = {};
  private langSubject: BehaviorSubject<string>;
  private stringsChangedSubject = new Subject<void>();

  currentLang$: Observable<string>;
  isRtl$: Observable<boolean>;
  stringsChanged$ = this.stringsChangedSubject.asObservable();

  constructor(private http: HttpClient) {
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
    localStorage.setItem(STORAGE_KEY, lang);
    this.loadStrings(lang);
    this.langSubject.next(lang);
  }

  private detectLanguage(): string {
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang) {
      localStorage.setItem(STORAGE_KEY, urlLang);
      return urlLang;
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

  private loadStrings(lang: string): void {
    this.http.get<Record<string, unknown>>(`assets/i18n/${lang}.json`).subscribe({
      next: (data) => {
        this.strings = data;
        this.stringsChangedSubject.next();
      },
      error: () => {
        if (lang !== 'en') {
          this.http.get<Record<string, unknown>>('assets/i18n/en.json').subscribe({
            next: (data) => {
              this.strings = data;
              this.stringsChangedSubject.next();
            }
          });
        }
      }
    });
  }
}
