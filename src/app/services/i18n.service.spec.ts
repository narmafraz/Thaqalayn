import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  let service: I18nService;
  let httpMock: HttpTestingController;
  let localStorageStore: Record<string, string>;
  let originalURLSearchParams: typeof URLSearchParams;

  // Sample i18n string data
  const mockEnStrings: Record<string, unknown> = {
    nav: {
      home: 'Home',
      about: 'About',
      books: 'Books',
    },
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
    },
    annotation: {
      add: 'Add note',
      save: 'Save',
    },
    simple: 'Simple value',
  };

  const mockArStrings: Record<string, unknown> = {
    nav: {
      home: '\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629',
      about: '\u062D\u0648\u0644',
      books: '\u0643\u062A\u0628',
    },
    common: {
      loading: '\u062C\u0627\u0631\u064D \u0627\u0644\u062A\u062D\u0645\u064A\u0644...',
    },
    simple: '\u0642\u064A\u0645\u0629 \u0628\u0633\u064A\u0637\u0629',
  };

  const mockFrStrings: Record<string, unknown> = {
    nav: {
      home: 'Accueil',
      about: '\u00C0 propos',
      books: 'Livres',
    },
    simple: 'Valeur simple',
  };

  /**
   * Helper: sets up the URLSearchParams mock to simulate a given query string.
   * Must be called BEFORE creating the service (TestBed.inject).
   */
  function mockUrlSearchParams(search: string): void {
    // Replace the global URLSearchParams with one that always returns the provided search string
    (window as any).URLSearchParams = class MockURLSearchParams extends originalURLSearchParams {
      constructor(_init?: any) {
        super(search);
      }
    };
  }

  /**
   * Helper: creates the service and flushes the initial loadStrings HTTP request.
   * By default, detectLanguage returns 'en' (no URL param, no localStorage, no browser match).
   */
  function createServiceAndFlushInitialLoad(
    initialStrings: Record<string, unknown> = mockEnStrings,
    expectedLang: string = 'en'
  ): void {
    service = TestBed.inject(I18nService);
    httpMock = TestBed.inject(HttpTestingController);

    if (expectedLang === 'en') {
      // For English, only one request is made
      const req = httpMock.expectOne(`assets/i18n/en.json`);
      req.flush(initialStrings);
    } else {
      // For non-English initial load, forkJoin makes two requests: en.json + locale.json
      const requests = httpMock.match((r) =>
        r.url === 'assets/i18n/en.json' || r.url === `assets/i18n/${expectedLang}.json`
      );
      for (const req of requests) {
        if (req.request.url === 'assets/i18n/en.json') {
          req.flush(mockEnStrings);
        } else {
          req.flush(initialStrings);
        }
      }
    }
  }

  /**
   * Helper: flushes requests after setLanguage() for a non-English language.
   * When en is already cached, only the locale request is made.
   * When en is NOT cached, both en.json and locale.json requests are made.
   */
  function flushNonEnglishLoad(
    lang: string,
    langStrings: Record<string, unknown>,
    enCached: boolean = true
  ): void {
    if (enCached) {
      // Only the locale request is made (en is served from cache via of())
      const req = httpMock.expectOne(`assets/i18n/${lang}.json`);
      req.flush(langStrings);
    } else {
      // Both requests are made via forkJoin
      const requests = httpMock.match((r) =>
        r.url === 'assets/i18n/en.json' || r.url === `assets/i18n/${lang}.json`
      );
      for (const req of requests) {
        if (req.request.url === 'assets/i18n/en.json') {
          req.flush(mockEnStrings);
        } else {
          req.flush(langStrings);
        }
      }
    }
  }

  beforeEach(() => {
    // Save original URLSearchParams
    originalURLSearchParams = window.URLSearchParams;

    // Default: no URL params (empty search string)
    mockUrlSearchParams('');

    // Mock localStorage
    localStorageStore = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      return localStorageStore[key] ?? null;
    });
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      localStorageStore[key] = value;
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
  });

  afterEach(() => {
    // Restore original URLSearchParams
    (window as any).URLSearchParams = originalURLSearchParams;

    if (httpMock) {
      httpMock.verify();
    }
  });

  // ─── Creation ────────────────────────────────────────────────────────

  it('should be created', () => {
    createServiceAndFlushInitialLoad();
    expect(service).toBeTruthy();
  });

  // ─── get() — Dot-Notation Key Lookup ─────────────────────────────────

  describe('get(key)', () => {
    beforeEach(() => {
      createServiceAndFlushInitialLoad();
    });

    it('should return a top-level string value', () => {
      expect(service.get('simple')).toBe('Simple value');
    });

    it('should return a nested value using dot notation', () => {
      expect(service.get('nav.home')).toBe('Home');
    });

    it('should return a deeply nested value', () => {
      expect(service.get('common.loading')).toBe('Loading...');
    });

    it('should return the key itself when the key is not found', () => {
      expect(service.get('nonexistent.key')).toBe('nonexistent.key');
    });

    it('should return the key when only the first part exists but the rest does not', () => {
      expect(service.get('nav.nonexistent')).toBe('nav.nonexistent');
    });

    it('should return the key when the resolved value is an object, not a string', () => {
      // 'nav' resolves to an object { home: 'Home', ... }, not a string
      expect(service.get('nav')).toBe('nav');
    });

    it('should return the key for an empty string key', () => {
      expect(service.get('')).toBe('');
    });

    it('should handle keys with multiple dot segments beyond what exists', () => {
      expect(service.get('nav.home.extra')).toBe('nav.home.extra');
    });
  });

  // ─── get() After Language Change ──────────────────────────────────────

  describe('get() after language change', () => {
    beforeEach(() => {
      createServiceAndFlushInitialLoad();
    });

    it('should return Arabic strings after switching to Arabic', () => {
      service.setLanguage('ar');
      flushNonEnglishLoad('ar', mockArStrings);

      expect(service.get('nav.home')).toBe('\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629');
    });

    it('should return French strings after switching to French', () => {
      service.setLanguage('fr');
      flushNonEnglishLoad('fr', mockFrStrings);

      expect(service.get('nav.home')).toBe('Accueil');
    });
  });

  // ─── setLanguage ──────────────────────────────────────────────────────

  describe('setLanguage', () => {
    beforeEach(() => {
      createServiceAndFlushInitialLoad();
    });

    it('should save language to localStorage', () => {
      service.setLanguage('ar');
      flushNonEnglishLoad('ar', mockArStrings);

      expect(localStorage.setItem).toHaveBeenCalledWith('thaqalayn-ui-lang', 'ar');
    });

    it('should emit new language on currentLang$ observable', () => {
      const emissions: string[] = [];
      service.currentLang$.subscribe(lang => emissions.push(lang));

      service.setLanguage('fr');
      flushNonEnglishLoad('fr', mockFrStrings);

      // First emission is 'en' (initial), second is 'fr'
      expect(emissions).toEqual(['en', 'fr']);
    });

    it('should make an HTTP request to load new language strings', () => {
      service.setLanguage('ar');
      const req = httpMock.expectOne('assets/i18n/ar.json');
      expect(req.request.method).toBe('GET');
      req.flush(mockArStrings);
    });

    it('should emit on stringsChanged$ when new strings are loaded', () => {
      let stringsChangedCount = 0;
      service.stringsChanged$.subscribe(() => stringsChangedCount++);

      // stringsChanged$ is a Subject (not BehaviorSubject), so we only see emissions after subscribing.
      // The initial load already happened before we subscribed, so count starts at 0.

      service.setLanguage('ar');
      flushNonEnglishLoad('ar', mockArStrings);

      expect(stringsChangedCount).toBe(1);
    });
  });

  // ─── Language Detection Priority ──────────────────────────────────────

  describe('language detection priority', () => {
    it('should use URL ?lang= parameter as highest priority', () => {
      // Override URLSearchParams mock to return ?lang=fr
      (window as any).URLSearchParams = originalURLSearchParams;
      mockUrlSearchParams('?lang=fr');

      TestBed.resetTestingModule();
      localStorageStore = {};
      // Reconfigure existing spies (do not call spyOn again — already spied in outer beforeEach)
      (localStorage.getItem as jasmine.Spy).and.callFake((key: string) => localStorageStore[key] ?? null);
      (localStorage.setItem as jasmine.Spy).and.callFake((key: string, value: string) => { localStorageStore[key] = value; });

      TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
      service = TestBed.inject(I18nService);
      httpMock = TestBed.inject(HttpTestingController);

      // Non-English initial load: forkJoin fetches both en.json and fr.json
      const requests = httpMock.match((r) =>
        r.url === 'assets/i18n/en.json' || r.url === 'assets/i18n/fr.json'
      );
      for (const req of requests) {
        if (req.request.url === 'assets/i18n/en.json') {
          req.flush(mockEnStrings);
        } else {
          req.flush(mockFrStrings);
        }
      }

      let currentLang = '';
      service.currentLang$.subscribe(lang => currentLang = lang);
      expect(currentLang).toBe('fr');

      // Should also save to localStorage
      expect(localStorage.setItem).toHaveBeenCalledWith('thaqalayn-ui-lang', 'fr');
    });

    it('should use localStorage as second priority when no URL param', () => {
      TestBed.resetTestingModule();
      localStorageStore = { 'thaqalayn-ui-lang': 'ar' };
      // Reconfigure existing spies
      (localStorage.getItem as jasmine.Spy).and.callFake((key: string) => localStorageStore[key] ?? null);
      (localStorage.setItem as jasmine.Spy).and.callFake((key: string, value: string) => { localStorageStore[key] = value; });

      TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
      service = TestBed.inject(I18nService);
      httpMock = TestBed.inject(HttpTestingController);

      // Non-English initial load: forkJoin fetches both en.json and ar.json
      const requests = httpMock.match((r) =>
        r.url === 'assets/i18n/en.json' || r.url === 'assets/i18n/ar.json'
      );
      for (const req of requests) {
        if (req.request.url === 'assets/i18n/en.json') {
          req.flush(mockEnStrings);
        } else {
          req.flush(mockArStrings);
        }
      }

      let currentLang = '';
      service.currentLang$.subscribe(lang => currentLang = lang);
      expect(currentLang).toBe('ar');
    });

    it('should default to en when no URL param, no localStorage, and no browser match', () => {
      createServiceAndFlushInitialLoad();

      let currentLang = '';
      service.currentLang$.subscribe(lang => currentLang = lang);
      expect(currentLang).toBe('en');
    });
  });

  // ─── RTL Detection ────────────────────────────────────────────────────

  describe('RTL detection (isRtl$)', () => {
    beforeEach(() => {
      createServiceAndFlushInitialLoad();
    });

    it('should emit false for English (LTR)', (done: DoneFn) => {
      service.isRtl$.subscribe(isRtl => {
        expect(isRtl).toBeFalse();
        done();
      });
    });

    it('should emit true for Arabic (RTL)', () => {
      service.setLanguage('ar');
      flushNonEnglishLoad('ar', mockArStrings);

      let latestRtl = false;
      service.isRtl$.subscribe(isRtl => latestRtl = isRtl);
      expect(latestRtl).toBeTrue();
    });

    it('should emit true for Farsi (RTL)', () => {
      service.setLanguage('fa');
      flushNonEnglishLoad('fa', {});

      let latestRtl = false;
      service.isRtl$.subscribe(isRtl => latestRtl = isRtl);
      expect(latestRtl).toBeTrue();
    });

    it('should emit true for Urdu (RTL)', () => {
      service.setLanguage('ur');
      flushNonEnglishLoad('ur', {});

      let latestRtl = false;
      service.isRtl$.subscribe(isRtl => latestRtl = isRtl);
      expect(latestRtl).toBeTrue();
    });

    it('should emit false for French (LTR)', () => {
      service.setLanguage('fr');
      flushNonEnglishLoad('fr', mockFrStrings);

      let latestRtl = false;
      service.isRtl$.subscribe(isRtl => latestRtl = isRtl);
      expect(latestRtl).toBeFalse();
    });

    it('should switch from LTR to RTL when language changes from en to ar', () => {
      const rtlValues: boolean[] = [];
      service.isRtl$.subscribe(isRtl => rtlValues.push(isRtl));

      service.setLanguage('ar');
      flushNonEnglishLoad('ar', mockArStrings);

      // First emission: false (en), second: true (ar)
      expect(rtlValues).toEqual([false, true]);
    });

    it('should switch from RTL to LTR when language changes from ar to en', () => {
      const rtlValues: boolean[] = [];
      service.isRtl$.subscribe(isRtl => rtlValues.push(isRtl));

      service.setLanguage('ar');
      flushNonEnglishLoad('ar', mockArStrings);

      service.setLanguage('en');
      httpMock.expectOne('assets/i18n/en.json').flush(mockEnStrings);

      expect(rtlValues).toEqual([false, true, false]);
    });
  });

  // ─── String Loading (HTTP) ────────────────────────────────────────────

  describe('loadStrings (HTTP loading)', () => {
    it('should load strings via HTTP GET on construction', () => {
      service = TestBed.inject(I18nService);
      httpMock = TestBed.inject(HttpTestingController);

      const req = httpMock.expectOne('assets/i18n/en.json');
      expect(req.request.method).toBe('GET');
      req.flush(mockEnStrings);
    });

    it('should load strings for a specific language', () => {
      createServiceAndFlushInitialLoad();

      service.setLanguage('ar');
      const req = httpMock.expectOne('assets/i18n/ar.json');
      expect(req.request.url).toBe('assets/i18n/ar.json');
      req.flush(mockArStrings);
    });

    it('should merge locale strings on top of English base (locale keys override English)', () => {
      createServiceAndFlushInitialLoad();
      expect(service.get('nav.home')).toBe('Home');

      service.setLanguage('ar');
      flushNonEnglishLoad('ar', mockArStrings);

      // Arabic key should override English
      expect(service.get('nav.home')).toBe('\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629');
      // English key missing from Arabic should still resolve via merge
      expect(service.get('common.error')).toBe('An error occurred');
    });
  });

  // ─── Fallback to English on Error ─────────────────────────────────────

  describe('fallback to English on HTTP error', () => {
    it('should fall back to English when non-English language fails to load', () => {
      createServiceAndFlushInitialLoad();

      service.setLanguage('ar');

      // Fail the Arabic request (en is cached, so only ar.json request exists)
      const arReq = httpMock.expectOne('assets/i18n/ar.json');
      arReq.flush('Not found', { status: 404, statusText: 'Not Found' });

      // With merge strategy, cached English is used as fallback
      expect(service.get('nav.home')).toBe('Home');
    });

    it('should not retry English fallback when English itself fails', () => {
      // Create service which loads English initially
      service = TestBed.inject(I18nService);
      httpMock = TestBed.inject(HttpTestingController);

      // Fail the initial English load
      const req = httpMock.expectOne('assets/i18n/en.json');
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      // Should NOT make another request (no infinite loop)
      httpMock.expectNone('assets/i18n/en.json');
      // Explicit expectation so Jasmine does not warn about no expectations
      expect(service.get('anything')).toBe('anything');
    });

    it('should emit stringsChanged$ after fallback strings are loaded', () => {
      createServiceAndFlushInitialLoad();

      let changedCount = 0;
      service.stringsChanged$.subscribe(() => changedCount++);

      service.setLanguage('fr');

      // Fail French (en is cached, so only fr.json request exists)
      httpMock.expectOne('assets/i18n/fr.json').flush('Error', { status: 500, statusText: 'Error' });

      // stringsChanged$ should have been emitted (with English fallback from cache)
      expect(changedCount).toBe(1);
    });

    it('should load fallback English strings that are usable via get()', () => {
      createServiceAndFlushInitialLoad();

      // Switch to a language that will fail
      service.setLanguage('de');
      httpMock.expectOne('assets/i18n/de.json').flush('Not found', { status: 404, statusText: 'Not Found' });

      // English from cache is the fallback
      expect(service.get('nav.about')).toBe('About');
      expect(service.get('common.loading')).toBe('Loading...');
    });
  });

  // ─── English Merge Strategy ────────────────────────────────────────────

  describe('English merge strategy (FIX-06)', () => {
    beforeEach(() => {
      createServiceAndFlushInitialLoad();
    });

    it('should fall back to English for keys missing in locale', () => {
      // mockArStrings is missing 'common.error' and 'annotation.*'
      service.setLanguage('ar');
      flushNonEnglishLoad('ar', mockArStrings);

      // These keys exist only in English but should still resolve
      expect(service.get('common.error')).toBe('An error occurred');
      expect(service.get('annotation.add')).toBe('Add note');
      expect(service.get('annotation.save')).toBe('Save');
    });

    it('should use locale value when it exists, not English', () => {
      service.setLanguage('ar');
      flushNonEnglishLoad('ar', mockArStrings);

      // Arabic should override English where present
      expect(service.get('nav.home')).toBe('\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629');
      expect(service.get('simple')).toBe('\u0642\u064A\u0645\u0629 \u0628\u0633\u064A\u0637\u0629');
    });

    it('should deep merge nested objects', () => {
      // French has nav.home, nav.about, nav.books but no common.*
      service.setLanguage('fr');
      flushNonEnglishLoad('fr', mockFrStrings);

      // French overrides
      expect(service.get('nav.home')).toBe('Accueil');
      // English fallback for missing nested keys
      expect(service.get('common.loading')).toBe('Loading...');
      expect(service.get('common.error')).toBe('An error occurred');
    });

    it('should never return a raw i18n key pattern when English has the key', () => {
      service.setLanguage('fa');
      // Farsi file with no keys at all
      flushNonEnglishLoad('fa', {});

      // All English keys should still resolve
      const rawKeyPattern = /^(annotation|bookmark|pwa|nav|search|settings|footer|translation)\.\w+$/;
      const testKeys = ['nav.home', 'nav.about', 'common.loading', 'annotation.add', 'annotation.save'];
      for (const key of testKeys) {
        const result = service.get(key);
        expect(result).not.toMatch(rawKeyPattern);
      }
    });
  });

  // ─── deepMerge ─────────────────────────────────────────────────────────

  describe('deepMerge', () => {
    beforeEach(() => {
      createServiceAndFlushInitialLoad();
    });

    it('should merge flat objects', () => {
      const result = service.deepMerge({ a: '1', b: '2' }, { b: '3', c: '4' });
      expect(result).toEqual({ a: '1', b: '3', c: '4' });
    });

    it('should deep merge nested objects', () => {
      const base = { nav: { home: 'Home', about: 'About' }, other: 'x' };
      const override = { nav: { home: 'Accueil' } };
      const result = service.deepMerge(base, override);
      expect(result).toEqual({ nav: { home: 'Accueil', about: 'About' }, other: 'x' });
    });

    it('should not mutate the base object', () => {
      const base = { a: '1' };
      service.deepMerge(base, { a: '2' });
      expect(base.a).toBe('1');
    });

    it('should handle empty override', () => {
      const base = { a: '1', b: { c: '2' } };
      const result = service.deepMerge(base, {});
      expect(result).toEqual({ a: '1', b: { c: '2' } });
    });

    it('should handle empty base', () => {
      const result = service.deepMerge({}, { a: '1' });
      expect(result).toEqual({ a: '1' });
    });
  });

  // ─── Browser Language Detection ───────────────────────────────────────

  describe('detectBrowserLanguage', () => {
    it('should detect a supported browser language from navigator.languages', () => {
      TestBed.resetTestingModule();
      localStorageStore = {};
      (localStorage.getItem as jasmine.Spy).and.callFake((key: string) => localStorageStore[key] ?? null);
      (localStorage.setItem as jasmine.Spy).and.callFake((key: string, value: string) => { localStorageStore[key] = value; });

      const originalLanguages = navigator.languages;
      Object.defineProperty(navigator, 'languages', {
        get: () => ['fr-FR', 'en-US'],
        configurable: true,
      });

      TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
      service = TestBed.inject(I18nService);
      httpMock = TestBed.inject(HttpTestingController);

      // Should detect 'fr' from 'fr-FR' — non-English initial load: forkJoin fetches en + fr
      const requests = httpMock.match((r) =>
        r.url === 'assets/i18n/en.json' || r.url === 'assets/i18n/fr.json'
      );
      for (const req of requests) {
        if (req.request.url === 'assets/i18n/en.json') {
          req.flush(mockEnStrings);
        } else {
          req.flush(mockFrStrings);
        }
      }

      let currentLang = '';
      service.currentLang$.subscribe(lang => currentLang = lang);
      expect(currentLang).toBe('fr');

      // Restore
      Object.defineProperty(navigator, 'languages', {
        get: () => originalLanguages,
        configurable: true,
      });
    });

    it('should skip unsupported browser languages and use the first supported one', () => {
      TestBed.resetTestingModule();
      localStorageStore = {};
      (localStorage.getItem as jasmine.Spy).and.callFake((key: string) => localStorageStore[key] ?? null);
      (localStorage.setItem as jasmine.Spy).and.callFake((key: string, value: string) => { localStorageStore[key] = value; });

      const originalLanguages = navigator.languages;
      // 'ja' is not in the supported list, 'ar' is
      Object.defineProperty(navigator, 'languages', {
        get: () => ['ja-JP', 'ar-SA'],
        configurable: true,
      });

      TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
      service = TestBed.inject(I18nService);
      httpMock = TestBed.inject(HttpTestingController);

      // Non-English initial load: forkJoin fetches en + ar
      const requests = httpMock.match((r) =>
        r.url === 'assets/i18n/en.json' || r.url === 'assets/i18n/ar.json'
      );
      for (const req of requests) {
        if (req.request.url === 'assets/i18n/en.json') {
          req.flush(mockEnStrings);
        } else {
          req.flush(mockArStrings);
        }
      }

      let currentLang = '';
      service.currentLang$.subscribe(lang => currentLang = lang);
      expect(currentLang).toBe('ar');

      // Restore
      Object.defineProperty(navigator, 'languages', {
        get: () => originalLanguages,
        configurable: true,
      });
    });

    it('should default to en when no browser language matches supported list', () => {
      TestBed.resetTestingModule();
      localStorageStore = {};
      (localStorage.getItem as jasmine.Spy).and.callFake((key: string) => localStorageStore[key] ?? null);
      (localStorage.setItem as jasmine.Spy).and.callFake((key: string, value: string) => { localStorageStore[key] = value; });

      const originalLanguages = navigator.languages;
      Object.defineProperty(navigator, 'languages', {
        get: () => ['ja-JP', 'ko-KR'],
        configurable: true,
      });

      TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
      service = TestBed.inject(I18nService);
      httpMock = TestBed.inject(HttpTestingController);

      const req = httpMock.expectOne('assets/i18n/en.json');
      req.flush(mockEnStrings);

      let currentLang = '';
      service.currentLang$.subscribe(lang => currentLang = lang);
      expect(currentLang).toBe('en');

      // Restore
      Object.defineProperty(navigator, 'languages', {
        get: () => originalLanguages,
        configurable: true,
      });
    });
  });

  // ─── Observable Streams ──────────────────────────────────────────────

  describe('observable streams', () => {
    beforeEach(() => {
      createServiceAndFlushInitialLoad();
    });

    it('currentLang$ should be a BehaviorSubject emitting current value immediately', (done: DoneFn) => {
      service.currentLang$.subscribe(lang => {
        expect(lang).toBe('en');
        done();
      });
    });

    it('currentLang$ should emit all language changes', () => {
      const langs: string[] = [];
      service.currentLang$.subscribe(lang => langs.push(lang));

      service.setLanguage('ar');
      flushNonEnglishLoad('ar', mockArStrings);

      service.setLanguage('fr');
      flushNonEnglishLoad('fr', mockFrStrings);

      expect(langs).toEqual(['en', 'ar', 'fr']);
    });

    it('isRtl$ should derive from currentLang$ changes', () => {
      const rtlValues: boolean[] = [];
      service.isRtl$.subscribe(isRtl => rtlValues.push(isRtl));

      service.setLanguage('ar');
      flushNonEnglishLoad('ar', mockArStrings);

      service.setLanguage('fr');
      flushNonEnglishLoad('fr', mockFrStrings);

      service.setLanguage('fa');
      flushNonEnglishLoad('fa', {});

      // en=false, ar=true, fr=false, fa=true
      expect(rtlValues).toEqual([false, true, false, true]);
    });
  });

  // ─── Multiple Language Switches ───────────────────────────────────────

  describe('rapid language switching', () => {
    beforeEach(() => {
      createServiceAndFlushInitialLoad();
    });

    it('should handle switching between multiple languages', () => {
      service.setLanguage('ar');
      flushNonEnglishLoad('ar', mockArStrings);
      expect(service.get('nav.home')).toBe('\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629');

      service.setLanguage('fr');
      flushNonEnglishLoad('fr', mockFrStrings);
      expect(service.get('nav.home')).toBe('Accueil');

      service.setLanguage('en');
      httpMock.expectOne('assets/i18n/en.json').flush(mockEnStrings);
      expect(service.get('nav.home')).toBe('Home');
    });

    it('should persist the last selected language in localStorage', () => {
      service.setLanguage('ar');
      flushNonEnglishLoad('ar', mockArStrings);

      service.setLanguage('fr');
      flushNonEnglishLoad('fr', mockFrStrings);

      expect(localStorageStore['thaqalayn-ui-lang']).toBe('fr');
    });
  });
});
