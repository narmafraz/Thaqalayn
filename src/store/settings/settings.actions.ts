import { SettingsStateModel, ThemeMode } from './settings.model';

/**
 * Loads the persisted settings into the store. Dispatched once during NGXS
 * bootstrap; tests (and any future "reset to saved") can dispatch it with an
 * explicit payload instead of going through storage.
 */
export class HydrateSettings {
  static readonly type = '[Settings] Hydrate';
  constructor(public settings?: Partial<SettingsStateModel>) {}
}

export class SetLanguage {
  static readonly type = '[Settings] Set language';
  constructor(public lang: string) {}
}

export class SetTheme {
  static readonly type = '[Settings] Set theme';
  constructor(public theme: ThemeMode) {}
}

export class ToggleTheme {
  static readonly type = '[Settings] Toggle theme';
}

export class SetFontSize {
  static readonly type = '[Settings] Set font size';
  constructor(public size: number) {}
}

export class IncreaseFontSize {
  static readonly type = '[Settings] Increase font size';
}

export class DecreaseFontSize {
  static readonly type = '[Settings] Decrease font size';
}

export class ResetFontSize {
  static readonly type = '[Settings] Reset font size';
}
