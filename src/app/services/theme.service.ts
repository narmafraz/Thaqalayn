import { Injectable } from '@angular/core';
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

  theme$: Observable<ThemeMode>;
  fontSize$: Observable<number>;

  constructor() {
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
    localStorage.setItem(THEME_KEY, theme);
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
    localStorage.setItem(FONT_SIZE_KEY, String(size));
    this.applyFontSize(size);
    this.fontSizeSubject.next(size);
  }

  private detectTheme(): ThemeMode {
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
    document.body.classList.toggle('dark-theme', theme === 'dark');
    // Update meta theme-color for mobile browsers
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#1a1a2e' : '#7ba7a7');
    }
  }

  private applyFontSize(size: number): void {
    document.documentElement.style.setProperty('--font-scale', String(size / 100));
  }
}
