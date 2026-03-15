import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AiLanguage } from '@app/models/ai-content';

export type ViewMode = 'plain' | 'word-by-word' | 'paragraph' | 'combined';
// Note: 'paragraph' and 'combined' are legacy values that may exist in localStorage.
// They are treated as 'plain' by applyViewMode() since paragraph view was removed.

export interface AiPreferences {
  showDiacritizedByDefault: boolean;
  showContentTypeBadges: boolean;
  showTopicTags: boolean;
  showIsnadSeparation: boolean;
  showAiTranslationDisclaimer: boolean;
  wordByWordDefaultLang: AiLanguage;
  viewMode: ViewMode;
}

const STORAGE_KEY = 'thaqalayn_ai_preferences';

const DEFAULTS: AiPreferences = {
  showDiacritizedByDefault: false,
  showContentTypeBadges: true,
  showTopicTags: true,
  showIsnadSeparation: true,
  showAiTranslationDisclaimer: true,
  wordByWordDefaultLang: 'en',
  viewMode: 'plain',
};

@Injectable({ providedIn: 'root' })
export class AiPreferencesService {
  private prefs: AiPreferences;
  private viewModeSubject: BehaviorSubject<ViewMode>;
  private prefsSubject: BehaviorSubject<AiPreferences>;
  viewMode$ = new BehaviorSubject<ViewMode>('paragraph').asObservable();
  /** Emits current preferences on subscribe and whenever any preference changes. */
  preferences$;

  constructor() {
    this.prefs = this.load();
    this.viewModeSubject = new BehaviorSubject<ViewMode>(this.prefs.viewMode || 'paragraph');
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
    this.save();
    this.prefsSubject.next({ ...this.prefs });
  }

  get viewMode(): ViewMode {
    return this.prefs.viewMode || 'paragraph';
  }

  setViewMode(mode: ViewMode): void {
    this.prefs.viewMode = mode;
    this.save();
    this.viewModeSubject.next(mode);
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
        return { ...DEFAULTS, ...JSON.parse(stored) };
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
