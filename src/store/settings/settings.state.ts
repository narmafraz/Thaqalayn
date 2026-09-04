import { Injectable } from '@angular/core';
import { SettingsStorageService } from '@app/services/settings-storage.service';
import { RouterNavigation } from '@ngxs/router-plugin';
import { Action, NgxsOnInit, Selector, State, StateContext } from '@ngxs/store';
import {
  DecreaseFontSize, HydrateSettings, IncreaseFontSize, ResetFontSize,
  SetFontSize, SetLanguage, SetTheme, ToggleTheme,
} from './settings.actions';
import {
  clampFontSize, DEFAULT_FONT_SIZE, DEFAULT_LANGUAGE, DEFAULT_THEME, FONT_STEP,
  RTL_LANGUAGES, SETTINGS_DEFAULTS, SUPPORTED_UI_LANGUAGES, SettingsStateModel, ThemeMode,
} from './settings.model';

/**
 * Single source of truth for the global UI settings (site language, theme,
 * font scale).
 *
 * Everything that *reads* a setting — the header language picker, the
 * Settings sheet, `I18nService`, `ThemeService`, `IndexState`, `SearchState`
 * — reads it from here, so a value restored from localStorage or lifted off
 * `?lang=` shows up in the controls as well as in the page. Everything that
 * *writes* one dispatches an action here, which is also the only place that
 * persists.
 *
 * Registered first in `STATES_MODULES` so `ngxsOnInit` has hydrated the
 * saved values before any other state (or any service) reads them.
 */
@State<SettingsStateModel>({
  name: 'settings',
  defaults: SETTINGS_DEFAULTS,
})
@Injectable()
export class SettingsState implements NgxsOnInit {
  constructor(private storage: SettingsStorageService) {}

  ngxsOnInit(ctx: StateContext<SettingsStateModel>): void {
    ctx.dispatch(new HydrateSettings());
  }

  // ─── Selectors ─────────────────────────────────────────────────────────
  // All guarded: services resolve during NGXS bootstrap, when the slice can
  // still be missing from the state stream.

  @Selector()
  static getLanguage(state: SettingsStateModel): string {
    return state?.lang || DEFAULT_LANGUAGE;
  }

  @Selector([SettingsState.getLanguage])
  static isRtl(lang: string): boolean {
    return RTL_LANGUAGES.includes(lang);
  }

  @Selector()
  static getTheme(state: SettingsStateModel): ThemeMode {
    return state?.theme || DEFAULT_THEME;
  }

  @Selector()
  static getFontSize(state: SettingsStateModel): number {
    return state?.fontSize ?? DEFAULT_FONT_SIZE;
  }

  // ─── Actions ───────────────────────────────────────────────────────────

  @Action(HydrateSettings)
  hydrate(ctx: StateContext<SettingsStateModel>, action: HydrateSettings): void {
    ctx.patchState(action.settings ?? this.storage.resolveInitial());
  }

  @Action(SetLanguage)
  setLanguage(ctx: StateContext<SettingsStateModel>, action: SetLanguage): void {
    const lang = action.lang?.toLowerCase();
    if (!lang) { return; }
    ctx.patchState({ lang });
    this.storage.saveLanguage(lang);
  }

  @Action(SetTheme)
  setTheme(ctx: StateContext<SettingsStateModel>, action: SetTheme): void {
    ctx.patchState({ theme: action.theme });
    this.storage.saveTheme(action.theme);
  }

  @Action(ToggleTheme)
  toggleTheme(ctx: StateContext<SettingsStateModel>): void {
    const next: ThemeMode = ctx.getState().theme === 'dark' ? 'light' : 'dark';
    ctx.dispatch(new SetTheme(next));
  }

  @Action(SetFontSize)
  setFontSize(ctx: StateContext<SettingsStateModel>, action: SetFontSize): void {
    const fontSize = clampFontSize(action.size);
    ctx.patchState({ fontSize });
    this.storage.saveFontSize(fontSize);
  }

  @Action(IncreaseFontSize)
  increaseFontSize(ctx: StateContext<SettingsStateModel>): void {
    ctx.dispatch(new SetFontSize(ctx.getState().fontSize + FONT_STEP));
  }

  @Action(DecreaseFontSize)
  decreaseFontSize(ctx: StateContext<SettingsStateModel>): void {
    ctx.dispatch(new SetFontSize(ctx.getState().fontSize - FONT_STEP));
  }

  @Action(ResetFontSize)
  resetFontSize(ctx: StateContext<SettingsStateModel>): void {
    ctx.dispatch(new SetFontSize(DEFAULT_FONT_SIZE));
  }

  /**
   * `?lang=` on any in-app navigation — not just the first load — switches
   * the site language, so a shared deep link works whether it is pasted
   * into the address bar or followed from inside the app.
   */
  @Action(RouterNavigation)
  languageFromNavigation(ctx: StateContext<SettingsStateModel>, action: RouterNavigation): void {
    const urlLang = action.routerState?.root?.queryParamMap?.get('lang')?.toLowerCase();
    if (!urlLang || urlLang === ctx.getState().lang) { return; }
    if (!SUPPORTED_UI_LANGUAGES.includes(urlLang)) { return; }
    ctx.dispatch(new SetLanguage(urlLang));
  }
}
