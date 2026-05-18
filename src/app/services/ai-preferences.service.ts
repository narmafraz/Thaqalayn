import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AiLanguage } from '@app/models/ai-content';

export type ViewMode = 'plain' | 'word-by-word' | 'paragraph' | 'combined';
// 'paragraph' and 'combined' are legacy values that may exist in localStorage.
// Treated as 'plain' on read; new writes only use 'plain' or 'word-by-word'.

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
   * (~0.78 opacity + small ✓ in the corner). Setting to false hides the
   * read-state styling globally so every verse looks the same.
   */
  muteReadVerses: boolean;
  /** @deprecated mirror of showWordByWord; kept one release for legacy migration. */
  viewMode: ViewMode;
}

const STORAGE_KEY = 'thaqalayn_ai_preferences';

const DEFAULTS: AiPreferences = {
  showDiacritizedByDefault: true,
  showContentTypeBadges: true,
  showTopicTags: true,
  showAiTranslationDisclaimer: true,
  showChainDiagram: false,
  showWordByWord: false,
  sidesheetOpenOnDesktop: false,
  wordByWordDefaultLang: 'en',
  muteReadVerses: true,
  viewMode: 'plain',
};

@Injectable({ providedIn: 'root' })
export class AiPreferencesService {
  private prefs: AiPreferences;
  private viewModeSubject: BehaviorSubject<ViewMode>;
  private prefsSubject: BehaviorSubject<AiPreferences>;
  viewMode$: Observable<ViewMode>;
  preferences$: Observable<AiPreferences>;

  constructor() {
    this.prefs = this.load();
    this.viewModeSubject = new BehaviorSubject<ViewMode>(this.prefs.viewMode);
    this.viewMode$ = this.viewModeSubject.asObservable();
    this.prefsSubject = new BehaviorSubject<AiPreferences>({ ...this.prefs });
    this.preferences$ = this.prefsSubject.asObservable();
  }

  get preferences(): AiPreferences {
    return { ...this.prefs };
  }

  get<K extends keyof AiPreferences>(key: K): AiPreferences[K] {
    return this.prefs[key];
  }

  set<K extends keyof AiPreferences>(key: K, value: AiPreferences[K]): void {
    this.prefs[key] = value;
    // Keep showWordByWord and the deprecated viewMode in sync so legacy
    // viewMode$ subscribers (chapter-content WBW button) keep working until
    // those callsites are migrated.
    if (key === 'showWordByWord') {
      const mode: ViewMode = value ? 'word-by-word' : 'plain';
      this.prefs.viewMode = mode;
      this.viewModeSubject.next(mode);
    } else if (key === 'viewMode') {
      this.prefs.showWordByWord = value === 'word-by-word';
      this.viewModeSubject.next(value as ViewMode);
    }
    this.save();
    this.prefsSubject.next({ ...this.prefs });
  }

  get viewMode(): ViewMode {
    return this.prefs.viewMode;
  }

  /** @deprecated use set('showWordByWord', boolean). Retained for legacy callers. */
  setViewMode(mode: ViewMode): void {
    this.set('viewMode', mode);
  }

  reset(): void {
    this.prefs = { ...DEFAULTS };
    this.save();
    this.viewModeSubject.next(this.prefs.viewMode);
    this.prefsSubject.next({ ...this.prefs });
  }

  private load(): AiPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged: AiPreferences = { ...DEFAULTS, ...parsed };
        // Migration: pre-showWordByWord prefs only had viewMode. Reflect
        // a stored 'word-by-word' viewMode into the new boolean so the
        // subscribed UI agrees with what the user saved before the upgrade.
        if (parsed.showWordByWord === undefined && parsed.viewMode === 'word-by-word') {
          merged.showWordByWord = true;
        }
        // Keep the two in sync on read so a partially-migrated state can't
        // produce conflicting values downstream.
        merged.viewMode = merged.showWordByWord ? 'word-by-word' : 'plain';
        // Strip the deprecated showIsnadSeparation if present (unused since dfdab29).
        delete (merged as Partial<AiPreferences> & { showIsnadSeparation?: unknown }).showIsnadSeparation;
        return merged;
      }
    } catch {
      // Invalid stored data, use defaults
    }
    return { ...DEFAULTS };
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.prefs));
    } catch {
      // Storage full or unavailable
    }
  }
}
