/**
 * Shared shape + constants for the global UI settings slice.
 *
 * Kept separate from `settings.state.ts` so browser-facing services
 * (storage, theme) can import the constants without pulling the NGXS
 * state class — and so `ThemeMode` has exactly one definition.
 */

export type ThemeMode = 'light' | 'dark';

/** UI settings the user can change and that survive a reload. */
export interface SettingsStateModel {
  /** Site (chrome + i18n strings) language, e.g. 'en' | 'fa'. */
  lang: string;
  theme: ThemeMode;
  /** Root font scale, as a percentage (100 = browser default). */
  fontSize: number;
}

export const LANG_STORAGE_KEY = 'thaqalayn-ui-lang';
export const THEME_STORAGE_KEY = 'thaqalayn-theme';
export const FONT_SIZE_STORAGE_KEY = 'thaqalayn-font-size';

export const DEFAULT_FONT_SIZE = 100;
export const MIN_FONT_SIZE = 75;
export const MAX_FONT_SIZE = 150;
export const FONT_STEP = 10;

export const DEFAULT_LANGUAGE = 'en';
export const DEFAULT_THEME: ThemeMode = 'light';

/** A site language the user can pick, with its endonym for the picker. */
export interface UiLanguage {
  code: string;
  name: string;
}

/**
 * The site languages, in picker order. Single list so the header picker and
 * the Settings sheet cannot drift apart; each has `assets/i18n/{code}.json`
 * (at least partially translated, English fills the gaps).
 */
export const UI_LANGUAGES: readonly UiLanguage[] = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'العربية' },
  { code: 'fa', name: 'فارسی' },
  { code: 'fr', name: 'Français' },
  { code: 'ur', name: 'اردو' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '中文' },
];

/** Languages that have (at least partial) `assets/i18n/{code}.json` strings. */
export const SUPPORTED_UI_LANGUAGES: readonly string[] = UI_LANGUAGES.map(l => l.code);

/** Subset of SUPPORTED_UI_LANGUAGES written right-to-left. */
export const RTL_LANGUAGES: readonly string[] = ['ar', 'fa', 'ur'];

export const SETTINGS_DEFAULTS: SettingsStateModel = {
  lang: DEFAULT_LANGUAGE,
  theme: DEFAULT_THEME,
  fontSize: DEFAULT_FONT_SIZE,
};

/** Clamps an arbitrary number into the supported font-scale range. */
export function clampFontSize(size: number): number {
  if (!Number.isFinite(size)) { return DEFAULT_FONT_SIZE; }
  return Math.min(Math.max(Math.round(size), MIN_FONT_SIZE), MAX_FONT_SIZE);
}
