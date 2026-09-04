import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Store } from '@ngxs/store';
import {
  DecreaseFontSize, IncreaseFontSize, ResetFontSize, SetTheme, ToggleTheme,
} from '@store/settings/settings.actions';
import { SettingsState } from '@store/settings/settings.state';
import { Observable } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

export type { ThemeMode } from '@store/settings/settings.model';
import type { ThemeMode } from '@store/settings/settings.model';

/**
 * Applies the theme and font scale to the document.
 *
 * `SettingsState` owns the values (and their persistence); this service
 * subscribes to them and performs the DOM side effects, and its setters are
 * thin dispatches. Keeping the reads on the store means a value restored
 * from localStorage reaches the toggle in the header as well as the page.
 */
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isBrowser: boolean;

  theme$: Observable<ThemeMode>;
  fontSize$: Observable<number>;

  constructor(@Inject(PLATFORM_ID) platformId: object, private store: Store) {
    this.isBrowser = isPlatformBrowser(platformId);

    this.theme$ = this.store.select(SettingsState.getTheme);
    this.fontSize$ = this.store.select(SettingsState.getFontSize);

    this.theme$.pipe(distinctUntilChanged()).subscribe(theme => this.applyTheme(theme));
    this.fontSize$.pipe(distinctUntilChanged()).subscribe(size => this.applyFontSize(size));
  }

  get currentTheme(): ThemeMode {
    return this.store.selectSnapshot(SettingsState.getTheme);
  }

  get currentFontSize(): number {
    return this.store.selectSnapshot(SettingsState.getFontSize);
  }

  toggleTheme(): void {
    this.store.dispatch(new ToggleTheme());
  }

  setTheme(theme: ThemeMode): void {
    this.store.dispatch(new SetTheme(theme));
  }

  increaseFontSize(): void {
    this.store.dispatch(new IncreaseFontSize());
  }

  decreaseFontSize(): void {
    this.store.dispatch(new DecreaseFontSize());
  }

  resetFontSize(): void {
    this.store.dispatch(new ResetFontSize());
  }

  private applyTheme(theme: ThemeMode): void {
    if (!this.isBrowser) { return; }
    document.body.classList.toggle('dark-theme', theme === 'dark');
    // Update meta theme-color for mobile browsers
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#7ba7a7');
    }
  }

  private applyFontSize(size: number): void {
    if (!this.isBrowser) { return; }
    document.documentElement.style.setProperty('--font-scale', String(size / 100));
  }
}
