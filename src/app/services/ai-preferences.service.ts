import { Injectable } from '@angular/core';
import { AiLanguage } from '@app/models/ai-content';

export interface AiPreferences {
  showDiacritizedByDefault: boolean;
  showContentTypeBadges: boolean;
  showTopicTags: boolean;
  showIsnadSeparation: boolean;
  showAiTranslationDisclaimer: boolean;
  wordByWordDefaultLang: AiLanguage;
}

const STORAGE_KEY = 'thaqalayn_ai_preferences';

const DEFAULTS: AiPreferences = {
  showDiacritizedByDefault: false,
  showContentTypeBadges: true,
  showTopicTags: true,
  showIsnadSeparation: true,
  showAiTranslationDisclaimer: true,
  wordByWordDefaultLang: 'en',
};

@Injectable({ providedIn: 'root' })
export class AiPreferencesService {
  private prefs: AiPreferences;

  constructor() {
    this.prefs = this.load();
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
  }

  reset(): void {
    this.prefs = { ...DEFAULTS };
    this.save();
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
