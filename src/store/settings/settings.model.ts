/**
 * Shared shape + constants for the global UI settings slice.
 *
 * Kept separate from `settings.state.ts` so browser-facing services
 * (storage, theme) can import the constants without pulling the NGXS
 * state class — and so `ThemeMode` has exactly one definition.
 */

import { AiLanguage } from '@app/models/ai-content';

export type ThemeMode = 'light' | 'dark';

export type ViewMode = 'plain' | 'word-by-word' | 'paragraph' | 'combined';
// 'paragraph' and 'combined' are legacy values that may exist in localStorage.
// Treated as 'plain' on read; new writes only use 'plain' or 'word-by-word'.

/** The reading/AI display toggles exposed by the Settings sheet + toolbar. */
export interface AiPreferences {
  showDiacritizedByDefault: boolean;
  showContentTypeBadges: boolean;
  showTopicTags: boolean;
  showAiTranslationDisclaimer: boolean;
  showChainDiagram: boolean;
  showWordByWord: boolean;
  sidesheetOpenOnDesktop: boolean;
  wordByWordDefaultLang: AiLanguage;
  /**
   * When true (default), verse cards the user has already read are muted
   * (~0.78 opacity + small check in the corner). Setting to false hides the
   * read-state styling globally so every verse looks the same.
   */
  muteReadVerses: boolean;
  /**
   * When true, suppress the in-app reading reminder banner that surfaces
   * when the user's streak is at risk or their daily goal is unmet. Banner
   * is opt-in (defaults to off-flag = visible). Defaults to `false` so the
   * feature is on for new users.
   */
  muteReadingBanner: boolean;
  /** @deprecated mirror of showWordByWord; kept one release for legacy migration. */
  viewMode: ViewMode;
}

/** UI settings the user can change and that survive a reload. */
export interface SettingsStateModel {
  /** Site (chrome + i18n strings) language, e.g. 'en' | 'fa'. */
  lang: string;
  theme: ThemeMode;
  /** Root font scale, as a percentage (100 = browser default). */
  fontSize: number;
  aiPreferences: AiPreferences;
}

export const LANG_STORAGE_KEY = 'thaqalayn-ui-lang';
export const THEME_STORAGE_KEY = 'thaqalayn-theme';
export const FONT_SIZE_STORAGE_KEY = 'thaqalayn-font-size';
export const AI_PREFERENCES_STORAGE_KEY = 'thaqalayn_ai_preferences';

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

export const AI_PREFERENCES_DEFAULTS: AiPreferences = {
  showDiacritizedByDefault: true,
  showContentTypeBadges: true,
  showTopicTags: true,
  showAiTranslationDisclaimer: true,
  showChainDiagram: false,
  showWordByWord: false,
  sidesheetOpenOnDesktop: false,
  wordByWordDefaultLang: 'en',
  muteReadVerses: true,
  muteReadingBanner: false,
  viewMode: 'plain',
};

export const SETTINGS_DEFAULTS: SettingsStateModel = {
  lang: DEFAULT_LANGUAGE,
  theme: DEFAULT_THEME,
  fontSize: DEFAULT_FONT_SIZE,
  // Copied, not shared: NGXS freezes state in development mode, and
  // AI_PREFERENCES_DEFAULTS is also the fallback every selector hands out.
  aiPreferences: { ...AI_PREFERENCES_DEFAULTS },
};

/**
 * Folds a stored (possibly ancient, possibly partial) preferences blob onto
 * the current defaults. Applied on read so a half-migrated state can never
 * reach the UI.
 */
export function normalizeAiPreferences(stored: unknown): AiPreferences {
  const parsed = (stored && typeof stored === 'object' ? stored : {}) as Partial<AiPreferences>;
  const merged: AiPreferences = { ...AI_PREFERENCES_DEFAULTS, ...parsed };

  // Pre-showWordByWord prefs only had viewMode. Reflect a stored
  // 'word-by-word' viewMode into the new boolean so the UI agrees with what
  // the user saved before the upgrade.
  if (parsed.showWordByWord === undefined && parsed.viewMode === 'word-by-word') {
    merged.showWordByWord = true;
  }
  // Keep the two in sync so a partially-migrated state can't produce
  // conflicting values downstream.
  merged.viewMode = merged.showWordByWord ? 'word-by-word' : 'plain';
  // Drop the deprecated showIsnadSeparation if present (unused since dfdab29).
  delete (merged as Partial<AiPreferences> & { showIsnadSeparation?: unknown }).showIsnadSeparation;
  return merged;
}

/**
 * Applies one preference change, keeping the deprecated `viewMode` mirror in
 * step with `showWordByWord` in both directions.
 */
export function withAiPreference<K extends keyof AiPreferences>(
  prefs: AiPreferences, key: K, value: AiPreferences[K],
): AiPreferences {
  const next: AiPreferences = { ...prefs, [key]: value };
  if (key === 'showWordByWord') {
    next.viewMode = value ? 'word-by-word' : 'plain';
  } else if (key === 'viewMode') {
    next.showWordByWord = value === 'word-by-word';
  }
  return next;
}

/** Clamps an arbitrary number into the supported font-scale range. */
export function clampFontSize(size: number): number {
  if (!Number.isFinite(size)) { return DEFAULT_FONT_SIZE; }
  return Math.min(Math.max(Math.round(size), MIN_FONT_SIZE), MAX_FONT_SIZE);
}
