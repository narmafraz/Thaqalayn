import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'thaqalayn-theme';
const FONT_SIZE_KEY = 'thaqalayn-font-size';
const DEFAULT_FONT_SIZE = 100; // percentage
const MIN_FONT_SIZE = 75;
const MAX_FONT_SIZE = 150;
const FONT_STEP = 10;

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeSubject: BehaviorSubject<ThemeMode>;
  private fontSizeSubject: BehaviorSubject<number>;
  private isBrowser: boolean;

  theme$: Observable<ThemeMode>;
  fontSize$: Observable<number>;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);

    const savedTheme = this.detectTheme();
    this.themeSubject = new BehaviorSubject<ThemeMode>(savedTheme);
    this.theme$ = this.themeSubject.asObservable();

    const savedFontSize = this.loadFontSize();
    this.fontSizeSubject = new BehaviorSubject<number>(savedFontSize);
    this.fontSize$ = this.fontSizeSubject.asObservable();

    this.applyTheme(savedTheme);
    this.applyFontSize(savedFontSize);
  }

  get currentTheme(): ThemeMode {
    return this.themeSubject.value;
  }

  get currentFontSize(): number {
    return this.fontSizeSubject.value;
  }

  toggleTheme(): void {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  setTheme(theme: ThemeMode): void {
    if (this.isBrowser) {
      localStorage.setItem(THEME_KEY, theme);
    }
    this.applyTheme(theme);
    this.themeSubject.next(theme);
  }

  increaseFontSize(): void {
    const newSize = Math.min(this.currentFontSize + FONT_STEP, MAX_FONT_SIZE);
    this.setFontSize(newSize);
  }

  decreaseFontSize(): void {
    const newSize = Math.max(this.currentFontSize - FONT_STEP, MIN_FONT_SIZE);
    this.setFontSize(newSize);
  }

  resetFontSize(): void {
    this.setFontSize(DEFAULT_FONT_SIZE);
  }

  private setFontSize(size: number): void {
    if (this.isBrowser) {
      localStorage.setItem(FONT_SIZE_KEY, String(size));
    }
    this.applyFontSize(size);
    this.fontSizeSubject.next(size);
  }

  private detectTheme(): ThemeMode {
    if (!this.isBrowser) {
      return 'light';
    }
    const saved = localStorage.getItem(THEME_KEY) as ThemeMode;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    // Respect system preference
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  private loadFontSize(): number {
    if (!this.isBrowser) {
      return DEFAULT_FONT_SIZE;
    }
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    if (saved) {
      const size = parseInt(saved, 10);
      if (size >= MIN_FONT_SIZE && size <= MAX_FONT_SIZE) {
        return size;
      }
    }
    return DEFAULT_FONT_SIZE;
  }

  private applyTheme(theme: ThemeMode): void {
    if (!this.isBrowser) { return; }
    document.body.classList.toggle('dark-theme', theme === 'dark');
    // Update meta theme-color for mobile browsers
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#1a1a2e' : '#7ba7a7');
    }
  }

  private applyFontSize(size: number): void {
    if (!this.isBrowser) { return; }
    document.documentElement.style.setProperty('--font-scale', String(size / 100));
  }
}
