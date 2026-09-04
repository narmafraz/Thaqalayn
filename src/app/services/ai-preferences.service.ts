import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { ResetAiPreferences, SetAiPreference } from '@store/settings/settings.actions';
import { SettingsState } from '@store/settings/settings.state';
import { Observable } from 'rxjs';

export type { AiPreferences, ViewMode } from '@store/settings/settings.model';
import type { AiPreferences } from '@store/settings/settings.model';
import type { ViewMode } from '@store/settings/settings.model';

/**
 * Read/write access to the reading + AI display preferences.
 *
 * The values live in `SettingsState` alongside language, theme and font size
 * (see `@store/settings`), which is what keeps a preference restored from
 * localStorage and the control that sets it from disagreeing. This service is
 * the convenience layer over that slice — nothing is cached here.
 */
@Injectable({ providedIn: 'root' })
export class AiPreferencesService {
  private readonly store = inject(Store);

  readonly preferences$: Observable<AiPreferences> =
    this.store.select(SettingsState.getAiPreferences);
  readonly viewMode$: Observable<ViewMode> = this.store.select(SettingsState.getViewMode);

  get preferences(): AiPreferences {
    return { ...this.store.selectSnapshot(SettingsState.getAiPreferences) };
  }

  get<K extends keyof AiPreferences>(key: K): AiPreferences[K] {
    return this.store.selectSnapshot(SettingsState.getAiPreferences)[key];
  }

  set<K extends keyof AiPreferences>(key: K, value: AiPreferences[K]): void {
    this.store.dispatch(new SetAiPreference(key, value));
  }

  get viewMode(): ViewMode {
    return this.store.selectSnapshot(SettingsState.getViewMode);
  }

  /** @deprecated use set('showWordByWord', boolean). Retained for legacy callers. */
  setViewMode(mode: ViewMode): void {
    this.set('viewMode', mode);
  }

  reset(): void {
    this.store.dispatch(new ResetAiPreferences());
  }
}
