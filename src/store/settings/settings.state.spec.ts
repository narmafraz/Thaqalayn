import { TestBed } from '@angular/core/testing';
import { SettingsStorageService } from '@app/services/settings-storage.service';
import { RouterNavigation } from '@ngxs/router-plugin';
import { NgxsModule, Store } from '@ngxs/store';

import {
  DecreaseFontSize, HydrateSettings, IncreaseFontSize, ResetFontSize,
  SetFontSize, SetLanguage, SetTheme, ToggleTheme,
} from './settings.actions';
import { SettingsStateModel } from './settings.model';
import { SettingsState } from './settings.state';

/** Stands in for localStorage so hydration is deterministic per test. */
class StubStorage {
  initial: SettingsStateModel = { lang: 'en', theme: 'light', fontSize: 100 };
  saved: Partial<Record<'lang' | 'theme' | 'fontSize', unknown>> = {};

  resolveInitial(): SettingsStateModel { return { ...this.initial }; }
  saveLanguage(lang: string): void { this.saved.lang = lang; }
  saveTheme(theme: string): void { this.saved.theme = theme; }
  saveFontSize(size: number): void { this.saved.fontSize = size; }
}

/** Minimal RouterNavigation carrying just the query params we care about. */
function navigationWithLang(lang: string | null): RouterNavigation {
  const routerState = {
    root: { queryParamMap: { get: (k: string) => (k === 'lang' ? lang : null) } },
  };
  return new RouterNavigation(routerState as never, undefined as never);
}

describe('SettingsState', () => {
  let store: Store;
  let storage: StubStorage;

  /** Boots a store whose hydration returns `initial`. */
  function boot(initial?: Partial<SettingsStateModel>): void {
    TestBed.resetTestingModule();
    storage = new StubStorage();
    if (initial) { storage.initial = { ...storage.initial, ...initial }; }
    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([SettingsState])],
      providers: [{ provide: SettingsStorageService, useValue: storage }],
    });
    store = TestBed.inject(Store);
  }

  const snapshot = (): SettingsStateModel => store.selectSnapshot(state => state.settings);

  beforeEach(() => boot());

  describe('hydration', () => {
    it('loads the persisted settings at bootstrap', () => {
      boot({ lang: 'fa', theme: 'dark', fontSize: 120 });
      expect(snapshot()).toEqual({ lang: 'fa', theme: 'dark', fontSize: 120 });
    });

    it('exposes the hydrated language through the selector, not the default', () => {
      boot({ lang: 'fa' });
      expect(store.selectSnapshot(SettingsState.getLanguage)).toBe('fa');
    });

    it('accepts an explicit payload instead of going to storage', () => {
      store.dispatch(new HydrateSettings({ lang: 'tr' }));
      expect(store.selectSnapshot(SettingsState.getLanguage)).toBe('tr');
    });
  });

  describe('language', () => {
    it('sets and persists', () => {
      store.dispatch(new SetLanguage('ur'));
      expect(store.selectSnapshot(SettingsState.getLanguage)).toBe('ur');
      expect(storage.saved.lang).toBe('ur');
    });

    it('normalises case', () => {
      store.dispatch(new SetLanguage('FA'));
      expect(store.selectSnapshot(SettingsState.getLanguage)).toBe('fa');
    });

    it('ignores an empty value', () => {
      store.dispatch(new SetLanguage(''));
      expect(store.selectSnapshot(SettingsState.getLanguage)).toBe('en');
      expect(storage.saved.lang).toBeUndefined();
    });

    it('reports RTL for ar/fa/ur only', () => {
      for (const lang of ['ar', 'fa', 'ur']) {
        store.dispatch(new SetLanguage(lang));
        expect(store.selectSnapshot(SettingsState.isRtl)).withContext(lang).toBe(true);
      }
      for (const lang of ['en', 'fr', 'zh']) {
        store.dispatch(new SetLanguage(lang));
        expect(store.selectSnapshot(SettingsState.isRtl)).withContext(lang).toBe(false);
      }
    });
  });

  describe('theme', () => {
    it('sets and persists', () => {
      store.dispatch(new SetTheme('dark'));
      expect(store.selectSnapshot(SettingsState.getTheme)).toBe('dark');
      expect(storage.saved.theme).toBe('dark');
    });

    it('toggles both ways', () => {
      store.dispatch(new ToggleTheme());
      expect(store.selectSnapshot(SettingsState.getTheme)).toBe('dark');
      store.dispatch(new ToggleTheme());
      expect(store.selectSnapshot(SettingsState.getTheme)).toBe('light');
    });
  });

  describe('font size', () => {
    it('steps up and down by 10', () => {
      store.dispatch(new IncreaseFontSize());
      expect(store.selectSnapshot(SettingsState.getFontSize)).toBe(110);
      store.dispatch(new DecreaseFontSize());
      expect(store.selectSnapshot(SettingsState.getFontSize)).toBe(100);
    });

    it('clamps to the supported range', () => {
      store.dispatch(new SetFontSize(1000));
      expect(store.selectSnapshot(SettingsState.getFontSize)).toBe(150);
      store.dispatch(new SetFontSize(1));
      expect(store.selectSnapshot(SettingsState.getFontSize)).toBe(75);
    });

    it('resets to 100', () => {
      store.dispatch(new SetFontSize(140));
      store.dispatch(new ResetFontSize());
      expect(store.selectSnapshot(SettingsState.getFontSize)).toBe(100);
      expect(storage.saved.fontSize).toBe(100);
    });
  });

  describe('?lang= on navigation', () => {
    it('switches the language when the URL asks for a different one', () => {
      store.dispatch(navigationWithLang('de'));
      expect(store.selectSnapshot(SettingsState.getLanguage)).toBe('de');
      expect(storage.saved.lang).toBe('de');
    });

    it('ignores an unsupported code', () => {
      store.dispatch(navigationWithLang('xx'));
      expect(store.selectSnapshot(SettingsState.getLanguage)).toBe('en');
    });

    it('ignores a navigation without ?lang=', () => {
      boot({ lang: 'fa' });
      store.dispatch(navigationWithLang(null));
      expect(store.selectSnapshot(SettingsState.getLanguage)).toBe('fa');
    });
  });
});
