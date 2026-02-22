import { TestBed } from '@angular/core/testing';
import { ThemeService, ThemeMode } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let localStorageStore: Record<string, string>;
  let matchMediaResult: boolean;

  beforeEach(() => {
    // Reset localStorage mock
    localStorageStore = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      return localStorageStore[key] ?? null;
    });
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      localStorageStore[key] = value;
    });

    // Default matchMedia to not prefer dark
    matchMediaResult = false;
    spyOn(window, 'matchMedia').and.callFake((query: string) => {
      return { matches: matchMediaResult } as MediaQueryList;
    });

    // Clean up body classes and meta tag from previous tests
    document.body.classList.remove('dark-theme');
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      meta.setAttribute('content', '#7ba7a7');
      document.head.appendChild(meta);
    }

    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    // Clean up after each test
    document.body.classList.remove('dark-theme');
    document.documentElement.style.removeProperty('--font-scale');
  });

  // ─── Creation ────────────────────────────────────────────────────────

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── Theme Detection ────────────────────────────────────────────────

  describe('theme detection on construction', () => {
    it('should default to light theme when localStorage is empty and system prefers light', () => {
      // Service was already created in beforeEach with default mocks
      expect(service.currentTheme).toBe('light');
    });

    it('should use dark theme from localStorage when saved', () => {
      // Need to recreate the service with 'dark' in localStorage
      localStorageStore['thaqalayn-theme'] = 'dark';

      // Recreate the service
      const freshService = new ThemeService('browser' as unknown as object);
      expect(freshService.currentTheme).toBe('dark');
    });

    it('should use light theme from localStorage when saved', () => {
      localStorageStore['thaqalayn-theme'] = 'light';

      const freshService = new ThemeService('browser' as unknown as object);
      expect(freshService.currentTheme).toBe('light');
    });

    it('should fall back to system dark preference when localStorage has no theme', () => {
      matchMediaResult = true;
      (window.matchMedia as jasmine.Spy).and.callFake((query: string) => {
        return { matches: true } as MediaQueryList;
      });

      const freshService = new ThemeService('browser' as unknown as object);
      expect(freshService.currentTheme).toBe('dark');
    });

    it('should ignore invalid localStorage theme values and use system preference', () => {
      localStorageStore['thaqalayn-theme'] = 'blue';
      matchMediaResult = true;
      (window.matchMedia as jasmine.Spy).and.callFake(() => {
        return { matches: true } as MediaQueryList;
      });

      const freshService = new ThemeService('browser' as unknown as object);
      expect(freshService.currentTheme).toBe('dark');
    });

    it('should default to light when localStorage is invalid and system has no preference', () => {
      localStorageStore['thaqalayn-theme'] = 'invalid';

      const freshService = new ThemeService('browser' as unknown as object);
      expect(freshService.currentTheme).toBe('light');
    });
  });

  // ─── Toggle ──────────────────────────────────────────────────────────

  describe('toggleTheme', () => {
    it('should switch from light to dark', () => {
      expect(service.currentTheme).toBe('light');
      service.toggleTheme();
      expect(service.currentTheme).toBe('dark');
    });

    it('should switch from dark to light', () => {
      service.setTheme('dark');
      expect(service.currentTheme).toBe('dark');
      service.toggleTheme();
      expect(service.currentTheme).toBe('light');
    });

    it('should toggle back and forth repeatedly', () => {
      expect(service.currentTheme).toBe('light');
      service.toggleTheme();
      expect(service.currentTheme).toBe('dark');
      service.toggleTheme();
      expect(service.currentTheme).toBe('light');
      service.toggleTheme();
      expect(service.currentTheme).toBe('dark');
    });
  });

  // ─── setTheme ────────────────────────────────────────────────────────

  describe('setTheme', () => {
    it('should save theme to localStorage', () => {
      service.setTheme('dark');
      expect(localStorage.setItem).toHaveBeenCalledWith('thaqalayn-theme', 'dark');
    });

    it('should emit new theme on theme$ observable', (done: DoneFn) => {
      const emissions: ThemeMode[] = [];
      service.theme$.subscribe(theme => {
        emissions.push(theme);
        // First emission is the initial 'light', second is 'dark' from setTheme
        if (emissions.length === 2) {
          expect(emissions[0]).toBe('light');
          expect(emissions[1]).toBe('dark');
          done();
        }
      });
      service.setTheme('dark');
    });

    it('should update currentTheme getter', () => {
      service.setTheme('dark');
      expect(service.currentTheme).toBe('dark');
      service.setTheme('light');
      expect(service.currentTheme).toBe('light');
    });
  });

  // ─── CSS Class Application (applyTheme) ──────────────────────────────

  describe('applyTheme (CSS class and meta tag)', () => {
    it('should add dark-theme class to body when theme is dark', () => {
      service.setTheme('dark');
      expect(document.body.classList.contains('dark-theme')).toBeTrue();
    });

    it('should remove dark-theme class from body when theme is light', () => {
      service.setTheme('dark');
      expect(document.body.classList.contains('dark-theme')).toBeTrue();
      service.setTheme('light');
      expect(document.body.classList.contains('dark-theme')).toBeFalse();
    });

    it('should not have dark-theme class on body for initial light theme', () => {
      // Service initializes as light in this test suite
      expect(document.body.classList.contains('dark-theme')).toBeFalse();
    });

    it('should update meta theme-color to dark value for dark theme', () => {
      service.setTheme('dark');
      const meta = document.querySelector('meta[name="theme-color"]');
      expect(meta).toBeTruthy();
      expect(meta!.getAttribute('content')).toBe('#1a1a2e');
    });

    it('should update meta theme-color to light value for light theme', () => {
      service.setTheme('dark');
      service.setTheme('light');
      const meta = document.querySelector('meta[name="theme-color"]');
      expect(meta).toBeTruthy();
      expect(meta!.getAttribute('content')).toBe('#7ba7a7');
    });

    it('should apply theme on construction', () => {
      // The service was constructed with 'light', so dark-theme should not be set
      expect(document.body.classList.contains('dark-theme')).toBeFalse();
    });
  });

  // ─── Font Size ───────────────────────────────────────────────────────

  describe('font size management', () => {
    it('should start with default font size of 100', () => {
      expect(service.currentFontSize).toBe(100);
    });

    it('should emit initial font size on fontSize$ observable', (done: DoneFn) => {
      service.fontSize$.subscribe(size => {
        expect(size).toBe(100);
        done();
      });
    });
  });

  // ─── increaseFontSize ────────────────────────────────────────────────

  describe('increaseFontSize', () => {
    it('should increase font size by 10', () => {
      service.increaseFontSize();
      expect(service.currentFontSize).toBe(110);
    });

    it('should increase font size multiple times', () => {
      service.increaseFontSize();
      service.increaseFontSize();
      expect(service.currentFontSize).toBe(120);
    });

    it('should not exceed MAX_FONT_SIZE of 150', () => {
      // Start at 100, increase 6 times: 110, 120, 130, 140, 150, 150
      for (let i = 0; i < 6; i++) {
        service.increaseFontSize();
      }
      expect(service.currentFontSize).toBe(150);
    });

    it('should clamp at exactly MAX_FONT_SIZE when stepping would exceed it', () => {
      // Start at 100, go to 150
      for (let i = 0; i < 5; i++) {
        service.increaseFontSize();
      }
      expect(service.currentFontSize).toBe(150);
      // One more should still be 150
      service.increaseFontSize();
      expect(service.currentFontSize).toBe(150);
    });

    it('should save increased font size to localStorage', () => {
      service.increaseFontSize();
      expect(localStorage.setItem).toHaveBeenCalledWith('thaqalayn-font-size', '110');
    });

    it('should emit new size on fontSize$ observable', (done: DoneFn) => {
      const emissions: number[] = [];
      service.fontSize$.subscribe(size => {
        emissions.push(size);
        if (emissions.length === 2) {
          expect(emissions[0]).toBe(100);
          expect(emissions[1]).toBe(110);
          done();
        }
      });
      service.increaseFontSize();
    });
  });

  // ─── decreaseFontSize ────────────────────────────────────────────────

  describe('decreaseFontSize', () => {
    it('should decrease font size by 10', () => {
      service.decreaseFontSize();
      expect(service.currentFontSize).toBe(90);
    });

    it('should decrease font size multiple times', () => {
      service.decreaseFontSize();
      service.decreaseFontSize();
      expect(service.currentFontSize).toBe(80);
    });

    it('should not go below MIN_FONT_SIZE of 75', () => {
      // Start at 100, decrease 4 times: 90, 80, 75, 75
      for (let i = 0; i < 4; i++) {
        service.decreaseFontSize();
      }
      expect(service.currentFontSize).toBe(75);
    });

    it('should clamp at exactly MIN_FONT_SIZE when stepping would go below it', () => {
      // Decrease to 80
      service.decreaseFontSize();
      service.decreaseFontSize();
      expect(service.currentFontSize).toBe(80);
      // Next decrease would be 70, but should clamp to 75
      service.decreaseFontSize();
      expect(service.currentFontSize).toBe(75);
      // One more should still be 75
      service.decreaseFontSize();
      expect(service.currentFontSize).toBe(75);
    });

    it('should save decreased font size to localStorage', () => {
      service.decreaseFontSize();
      expect(localStorage.setItem).toHaveBeenCalledWith('thaqalayn-font-size', '90');
    });
  });

  // ─── resetFontSize ───────────────────────────────────────────────────

  describe('resetFontSize', () => {
    it('should reset font size to 100 from a higher value', () => {
      service.increaseFontSize();
      service.increaseFontSize();
      expect(service.currentFontSize).toBe(120);
      service.resetFontSize();
      expect(service.currentFontSize).toBe(100);
    });

    it('should reset font size to 100 from a lower value', () => {
      service.decreaseFontSize();
      service.decreaseFontSize();
      expect(service.currentFontSize).toBe(80);
      service.resetFontSize();
      expect(service.currentFontSize).toBe(100);
    });

    it('should save reset font size to localStorage', () => {
      service.increaseFontSize();
      service.resetFontSize();
      expect(localStorage.setItem).toHaveBeenCalledWith('thaqalayn-font-size', '100');
    });

    it('should be a no-op when already at default', () => {
      expect(service.currentFontSize).toBe(100);
      service.resetFontSize();
      expect(service.currentFontSize).toBe(100);
    });
  });

  // ─── Font Size CSS Application (applyFontSize) ──────────────────────

  describe('applyFontSize (CSS variable)', () => {
    it('should set --font-scale CSS variable to 1 for default size 100', () => {
      const value = document.documentElement.style.getPropertyValue('--font-scale');
      expect(value).toBe('1');
    });

    it('should set --font-scale CSS variable to 1.1 for size 110', () => {
      service.increaseFontSize();
      const value = document.documentElement.style.getPropertyValue('--font-scale');
      expect(value).toBe('1.1');
    });

    it('should set --font-scale CSS variable to 0.9 for size 90', () => {
      service.decreaseFontSize();
      const value = document.documentElement.style.getPropertyValue('--font-scale');
      expect(value).toBe('0.9');
    });

    it('should set --font-scale CSS variable to 1.5 for max size 150', () => {
      for (let i = 0; i < 5; i++) {
        service.increaseFontSize();
      }
      const value = document.documentElement.style.getPropertyValue('--font-scale');
      expect(value).toBe('1.5');
    });

    it('should set --font-scale CSS variable to 0.75 for min size 75', () => {
      for (let i = 0; i < 3; i++) {
        service.decreaseFontSize();
      }
      const value = document.documentElement.style.getPropertyValue('--font-scale');
      expect(value).toBe('0.75');
    });
  });

  // ─── Font Size Persistence (loadFontSize) ────────────────────────────

  describe('font size persistence', () => {
    it('should load saved font size from localStorage on creation', () => {
      localStorageStore['thaqalayn-font-size'] = '120';

      const freshService = new ThemeService('browser' as unknown as object);
      expect(freshService.currentFontSize).toBe(120);
    });

    it('should default to 100 when localStorage font size is invalid', () => {
      localStorageStore['thaqalayn-font-size'] = 'abc';

      const freshService = new ThemeService('browser' as unknown as object);
      expect(freshService.currentFontSize).toBe(100);
    });

    it('should default to 100 when localStorage font size is below minimum', () => {
      localStorageStore['thaqalayn-font-size'] = '50';

      const freshService = new ThemeService('browser' as unknown as object);
      expect(freshService.currentFontSize).toBe(100);
    });

    it('should default to 100 when localStorage font size exceeds maximum', () => {
      localStorageStore['thaqalayn-font-size'] = '200';

      const freshService = new ThemeService('browser' as unknown as object);
      expect(freshService.currentFontSize).toBe(100);
    });

    it('should accept font size at exact minimum boundary (75)', () => {
      localStorageStore['thaqalayn-font-size'] = '75';

      const freshService = new ThemeService('browser' as unknown as object);
      expect(freshService.currentFontSize).toBe(75);
    });

    it('should accept font size at exact maximum boundary (150)', () => {
      localStorageStore['thaqalayn-font-size'] = '150';

      const freshService = new ThemeService('browser' as unknown as object);
      expect(freshService.currentFontSize).toBe(150);
    });
  });

  // ─── Observable Streams ──────────────────────────────────────────────

  describe('observable streams', () => {
    it('should emit all theme changes through theme$ observable', () => {
      const themes: ThemeMode[] = [];
      const sub = service.theme$.subscribe(t => themes.push(t));

      service.setTheme('dark');
      service.setTheme('light');
      service.setTheme('dark');

      expect(themes).toEqual(['light', 'dark', 'light', 'dark']);
      sub.unsubscribe();
    });

    it('should emit all font size changes through fontSize$ observable', () => {
      const sizes: number[] = [];
      const sub = service.fontSize$.subscribe(s => sizes.push(s));

      service.increaseFontSize();
      service.decreaseFontSize();
      service.resetFontSize();

      expect(sizes).toEqual([100, 110, 100, 100]);
      sub.unsubscribe();
    });

    it('should provide current value immediately to new subscribers (BehaviorSubject)', (done: DoneFn) => {
      service.setTheme('dark');
      service.theme$.subscribe(theme => {
        expect(theme).toBe('dark');
        done();
      });
    });
  });

  // ─── Combined Scenarios ──────────────────────────────────────────────

  describe('combined scenarios', () => {
    it('should handle theme toggle and font size changes independently', () => {
      service.setTheme('dark');
      service.increaseFontSize();
      expect(service.currentTheme).toBe('dark');
      expect(service.currentFontSize).toBe(110);

      service.toggleTheme();
      expect(service.currentTheme).toBe('light');
      expect(service.currentFontSize).toBe(110);

      service.resetFontSize();
      expect(service.currentTheme).toBe('light');
      expect(service.currentFontSize).toBe(100);
    });

    it('should persist both theme and font size to localStorage', () => {
      service.setTheme('dark');
      service.increaseFontSize();
      service.increaseFontSize();

      expect(localStorageStore['thaqalayn-theme']).toBe('dark');
      expect(localStorageStore['thaqalayn-font-size']).toBe('120');
    });
  });
});
