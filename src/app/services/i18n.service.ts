import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { SetLanguage } from '@store/settings/settings.actions';
import { SettingsState } from '@store/settings/settings.state';
import { Observable, Subject, forkJoin, of } from 'rxjs';
import { catchError, distinctUntilChanged, skip } from 'rxjs/operators';

/**
 * Loads and serves the UI string bundles for the current site language.
 *
 * The language itself is *not* owned here — `SettingsState` is the single
 * source of truth (see `@store/settings`). This service reads it from the
 * store and reacts to it; `setLanguage()` is a thin dispatch so that every
 * caller, and every control bound to the store, stays in step.
 */
@Injectable({
  providedIn: 'root'
})
export class I18nService {

  private strings: Record<string, unknown> = {};
  private enStringsCache: Record<string, unknown> | null = null;
  private stringsChangedSubject = new Subject<void>();

  currentLang$: Observable<string>;
  isRtl$: Observable<boolean>;
  stringsChanged$ = this.stringsChangedSubject.asObservable();

  /** Synchronous accessor for the current language code. */
  get currentLang(): string {
    return this.store.selectSnapshot(SettingsState.getLanguage);
  }

  constructor(private http: HttpClient, private store: Store) {
    this.currentLang$ = this.store.select(SettingsState.getLanguage);
    this.isRtl$ = this.store.select(SettingsState.isRtl);

    // The store is hydrated before any service resolves, so the first load
    // goes straight to the user's language — no English flash, no wasted
    // fetch. `skip(1)` drops the replayed current value we just handled.
    this.loadStrings(this.currentLang);
    this.currentLang$.pipe(skip(1), distinctUntilChanged()).subscribe(lang => this.loadStrings(lang));
  }

  get(key: string, params?: Record<string, string | number>): string {
    const parts = key.split('.');
    let current: unknown = this.strings;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }
    let value = typeof current === 'string' ? current : key;
    if (params) {
      // Interpolate {{token}} placeholders (translations author them in the
      // grammatically correct position per language).
      for (const [k, v] of Object.entries(params)) {
        value = value.split(`{{${k}}}`).join(String(v));
      }
    }
    return value;
  }

  /**
   * Translate a part_type enum value (e.g. "Hadith", "Verse", "Chapter") to the current language.
   * Falls back to the original string if no translation is found.
   */
  translatePartType(partType: string | undefined | null): string {
    if (!partType) return '';
    const key = `partType.${partType.toLowerCase()}`;
    const result = this.get(key);
    return result === key ? partType : result;
  }

  setLanguage(lang: string): void {
    this.store.dispatch(new SetLanguage(lang));
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
