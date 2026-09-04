import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { SettingsStorageService } from './settings-storage.service';

describe('SettingsStorageService', () => {
  let store: Record<string, string>;
  let originalURLSearchParams: typeof URLSearchParams;
  let navLanguages: jasmine.Spy;

  /** Makes `new URLSearchParams(...)` always parse `search`, whatever it is given. */
  function mockUrlSearchParams(search: string): void {
    (window as unknown as { URLSearchParams: unknown }).URLSearchParams =
      class MockURLSearchParams extends originalURLSearchParams {
        constructor(_init?: unknown) { super(search); }
      };
  }

  function create(platform: 'browser' | 'server' = 'browser'): SettingsStorageService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: platform }],
    });
    return TestBed.inject(SettingsStorageService);
  }

  beforeEach(() => {
    originalURLSearchParams = window.URLSearchParams;
    mockUrlSearchParams('');
    store = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => store[key] ?? null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => { store[key] = value; });
    // Default: a browser that asks for a language we do not ship.
    navLanguages = spyOnProperty(navigator, 'languages').and.returnValue(
      ['sv-SE'] as unknown as readonly string[]);
  });

  afterEach(() => {
    (window as unknown as { URLSearchParams: unknown }).URLSearchParams = originalURLSearchParams;
  });

  describe('language resolution priority', () => {
    it('prefers ?lang= over everything else, and persists it', () => {
      store['thaqalayn-ui-lang'] = 'ar';
      mockUrlSearchParams('?lang=fr');

      expect(create().resolveInitial().lang).toBe('fr');
      expect(store['thaqalayn-ui-lang']).toBe('fr');
    });

    it('lower-cases a ?lang= value', () => {
      mockUrlSearchParams('?lang=FA');
      expect(create().resolveInitial().lang).toBe('fa');
    });

    it('ignores an unsupported ?lang= and falls through to storage', () => {
      store['thaqalayn-ui-lang'] = 'ar';
      mockUrlSearchParams('?lang=xx');
      expect(create().resolveInitial().lang).toBe('ar');
    });

    it('uses the stored language when there is no ?lang=', () => {
      store['thaqalayn-ui-lang'] = 'ur';
      expect(create().resolveInitial().lang).toBe('ur');
    });

    it('falls back to the first supported browser language', () => {
      navLanguages.and.returnValue(['sv-SE', 'de-DE', 'fr'] as unknown as readonly string[]);
      expect(create().resolveInitial().lang).toBe('de');
    });

    it('defaults to en with nothing stored and no supported browser language', () => {
      expect(create().resolveInitial().lang).toBe('en');
    });

    it('returns en on the server without touching browser APIs', () => {
      store['thaqalayn-ui-lang'] = 'fa';
      expect(create('server').resolveInitial().lang).toBe('en');
    });
  });

  describe('theme resolution', () => {
    it('reads a saved theme', () => {
      store['thaqalayn-theme'] = 'dark';
      expect(create().resolveInitial().theme).toBe('dark');
    });

    it('ignores a value that is not a theme', () => {
      store['thaqalayn-theme'] = 'blue';
      expect(create().resolveInitial().theme).toBe('light');
    });
  });

  describe('font-size resolution', () => {
    it('reads a saved size inside the supported range', () => {
      store['thaqalayn-font-size'] = '120';
      expect(create().resolveInitial().fontSize).toBe(120);
    });

    it('rejects an out-of-range size rather than clamping it', () => {
      store['thaqalayn-font-size'] = '400';
      expect(create().resolveInitial().fontSize).toBe(100);
    });

    it('rejects a non-numeric size', () => {
      store['thaqalayn-font-size'] = 'big';
      expect(create().resolveInitial().fontSize).toBe(100);
    });
  });

  describe('writes', () => {
    it('persists each setting under its own key', () => {
      const svc = create();
      svc.saveLanguage('de');
      svc.saveTheme('dark');
      svc.saveFontSize(110);

      expect(store['thaqalayn-ui-lang']).toBe('de');
      expect(store['thaqalayn-theme']).toBe('dark');
      expect(store['thaqalayn-font-size']).toBe('110');
    });

    it('survives localStorage throwing (private mode / blocked storage)', () => {
      (localStorage.setItem as jasmine.Spy).and.throwError('QuotaExceededError');
      const svc = create();
      expect(() => svc.saveLanguage('de')).not.toThrow();
    });

    it('writes nothing on the server', () => {
      create('server').saveLanguage('de');
      expect(store['thaqalayn-ui-lang']).toBeUndefined();
    });
  });
});
