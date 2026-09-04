import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import {
  DEFAULT_FONT_SIZE, DEFAULT_LANGUAGE, DEFAULT_THEME, FONT_SIZE_STORAGE_KEY,
  LANG_STORAGE_KEY, MAX_FONT_SIZE, MIN_FONT_SIZE, SUPPORTED_UI_LANGUAGES,
  SettingsStateModel, THEME_STORAGE_KEY, ThemeMode,
} from '@store/settings/settings.model';

/**
 * The only place that reads or writes the persisted UI settings.
 *
 * `SettingsState` owns the in-memory truth; this service owns where that
 * truth comes from on a cold start (URL `?lang=` > localStorage > browser
 * language > defaults) and where it is written back to. Everything is
 * SSR-safe: on the server every read returns the default.
 */
@Injectable({ providedIn: 'root' })
export class SettingsStorageService {
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * Resolves the settings to boot with. Called once, before anything reads
   * the store, so every UI control binds to the already-correct value
   * instead of to a default that is corrected a tick later.
   */
  resolveInitial(): SettingsStateModel {
    return {
      lang: this.resolveLanguage(),
      theme: this.resolveTheme(),
      fontSize: this.resolveFontSize(),
    };
  }

  saveLanguage(lang: string): void {
    this.write(LANG_STORAGE_KEY, lang);
  }

  saveTheme(theme: ThemeMode): void {
    this.write(THEME_STORAGE_KEY, theme);
  }

  saveFontSize(size: number): void {
    this.write(FONT_SIZE_STORAGE_KEY, String(size));
  }

  // ─── Resolution ────────────────────────────────────────────────────────

  /**
   * Priority: `?lang=` in the URL (search string or hash query) > the last
   * explicit choice in localStorage > a supported browser language > 'en'.
   * A language taken off the URL is persisted, so the deep link's choice
   * survives the next visit.
   */
  private resolveLanguage(): string {
    if (!this.isBrowser) { return DEFAULT_LANGUAGE; }

    const urlLang = this.languageFromUrl();
    if (urlLang) {
      this.saveLanguage(urlLang);
      return urlLang;
    }

    const stored = this.read(LANG_STORAGE_KEY);
    if (stored) { return stored; }

    return this.browserLanguage() ?? DEFAULT_LANGUAGE;
  }

  /**
   * Reads `?lang=` from the query string, then from a hash-based query.
   * Unsupported codes are ignored so a stray `?lang=xx` cannot strand the
   * user on a 404'd string bundle — resolution falls through to storage.
   */
  private languageFromUrl(): string | null {
    const search = new URLSearchParams(window.location.search).get('lang');
    if (search && this.isSupported(search)) { return search.toLowerCase(); }

    // Legacy hash URLs (e.g. /#/books?lang=fa) are still linked to from
    // older shares; they redirect to the path form on boot but the query
    // has to be honoured before that happens.
    const hash = window.location.hash;
    const queryStart = hash.indexOf('?');
    if (queryStart !== -1) {
      const hashLang = new URLSearchParams(hash.substring(queryStart)).get('lang');
      if (hashLang && this.isSupported(hashLang)) { return hashLang.toLowerCase(); }
    }
    return null;
  }

  private isSupported(lang: string): boolean {
    return SUPPORTED_UI_LANGUAGES.includes(lang.toLowerCase());
  }

  private browserLanguage(): string | null {
    const navLangs = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const lang of navLangs) {
      if (!lang) { continue; }
      const code = lang.split('-')[0].toLowerCase();
      if (SUPPORTED_UI_LANGUAGES.includes(code)) { return code; }
    }
    return null;
  }

  private resolveTheme(): ThemeMode {
    const stored = this.read(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : DEFAULT_THEME;
  }

  private resolveFontSize(): number {
    const stored = this.read(FONT_SIZE_STORAGE_KEY);
    if (!stored) { return DEFAULT_FONT_SIZE; }
    const size = parseInt(stored, 10);
    // Out-of-range values are rejected rather than clamped: they mean the
    // stored value predates the current range and is not a real choice.
    return size >= MIN_FONT_SIZE && size <= MAX_FONT_SIZE ? size : DEFAULT_FONT_SIZE;
  }

  // ─── localStorage plumbing ─────────────────────────────────────────────

  private read(key: string): string | null {
    if (!this.isBrowser) { return null; }
    try {
      return localStorage.getItem(key);
    } catch {
      return null; // storage disabled (private mode / blocked cookies)
    }
  }

  private write(key: string, value: string): void {
    if (!this.isBrowser) { return; }
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage full or unavailable — the in-memory setting still applies.
    }
  }
}
