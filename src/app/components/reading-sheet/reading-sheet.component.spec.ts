import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NgxsModule, Store } from '@ngxs/store';
import { SetLanguage } from '@store/settings/settings.actions';
import { SUPPORTED_UI_LANGUAGES } from '@store/settings/settings.model';
import { SettingsState } from '@store/settings/settings.state';

import { ReadingSheetComponent } from './reading-sheet.component';
import { ReadingSheetService } from '@app/services/reading-sheet.service';
import { AiPreferencesService } from '@app/services/ai-preferences.service';
import { ThemeService } from '@app/services/theme.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

describe('ReadingSheetComponent', () => {
  let component: ReadingSheetComponent;
  let fixture: ComponentFixture<ReadingSheetComponent>;
  let sheet: ReadingSheetService;
  let prefs: AiPreferencesService;
  let theme: ThemeService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      declarations: [ReadingSheetComponent, TranslatePipe],
      imports: [FormsModule, MatTooltipModule, HttpClientTestingModule, RouterTestingModule, NgxsModule.forRoot([SettingsState])],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingSheetComponent);
    component = fixture.componentInstance;
    sheet = TestBed.inject(ReadingSheetService);
    prefs = TestBed.inject(AiPreferencesService);
    theme = TestBed.inject(ThemeService);
    fixture.detectChanges();
  });

  it('starts hidden', () => {
    const panel = fixture.nativeElement.querySelector('.reading-sheet-panel');
    expect(panel.classList.contains('open')).toBe(false);
    expect(fixture.nativeElement.querySelector('.reading-sheet-backdrop')).toBeNull();
  });

  it('opens when ReadingSheetService.open() is called', () => {
    sheet.open();
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('.reading-sheet-panel');
    expect(panel.classList.contains('open')).toBe(true);
    expect(fixture.nativeElement.querySelector('.reading-sheet-backdrop')).not.toBeNull();
  });

  it('close() flips state to false', () => {
    sheet.open();
    component.close();
    expect(sheet.isOpen).toBe(false);
  });

  it('Escape key closes when open', () => {
    sheet.open();
    expect(sheet.isOpen).toBe(true);
    component.onEscape();
    expect(sheet.isOpen).toBe(false);
  });

  it('Escape key is a no-op when already closed', () => {
    expect(sheet.isOpen).toBe(false);
    component.onEscape();
    expect(sheet.isOpen).toBe(false);
  });

  it('checkbox change writes to AiPreferencesService', () => {
    expect(prefs.get('showContentTypeBadges')).toBe(true);
    component.onPrefChange('showContentTypeBadges', false);
    expect(prefs.get('showContentTypeBadges')).toBe(false);
  });

  it('onWordByWordLangChange writes wordByWordDefaultLang', () => {
    component.onWordByWordLangChange('ur');
    expect(prefs.get('wordByWordDefaultLang')).toBe('ur');
  });

  describe('display section', () => {
    it('toggleTheme delegates to ThemeService', () => {
      const before = theme.currentTheme;
      component.toggleTheme();
      expect(theme.currentTheme).not.toBe(before);
    });

    it('font controls delegate to ThemeService', () => {
      const initial = theme.currentFontSize;
      component.increaseFontSize();
      expect(theme.currentFontSize).toBeGreaterThan(initial);
      const grown = theme.currentFontSize;
      component.decreaseFontSize();
      expect(theme.currentFontSize).toBeLessThan(grown);
      component.resetFontSize();
      expect(theme.currentFontSize).toBe(100);
    });
  });

  describe('language section', () => {
    it('onUiLanguageChange sets the site language', () => {
      component.onUiLanguageChange('fa');
      component.currentLang$.subscribe(l => {
        expect(l).toBe('fa');
      }).unsubscribe();
    });

    it('the picker shows the language currently in effect, not the first option', async () => {
      // REGRESSION: with a plain [value] binding the assignment ran before
      // @for had created the <option>s, so a language restored from
      // localStorage (or ?lang=) was dropped and the control showed
      // English — while the rest of the page was in the real language.
      TestBed.inject(Store).dispatch(new SetLanguage('fa'));
      sheet.open();
      fixture.detectChanges();
      await fixture.whenStable(); // ngModel writes the value on a microtask

      const select: HTMLSelectElement =
        fixture.nativeElement.querySelector('select.reading-sheet-select');
      expect(select.value).toBe('fa');
      expect(select.options[select.selectedIndex].value).toBe('fa');
    });

    it('the picker follows a later language change', async () => {
      sheet.open();
      fixture.detectChanges();
      await fixture.whenStable();
      const select: HTMLSelectElement =
        fixture.nativeElement.querySelector('select.reading-sheet-select');
      expect(select.value).toBe('en');

      TestBed.inject(Store).dispatch(new SetLanguage('tr'));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(select.value).toBe('tr');
    });

    it('offers every supported UI language', () => {
      sheet.open();
      fixture.detectChanges();
      const select: HTMLSelectElement =
        fixture.nativeElement.querySelector('select.reading-sheet-select');
      expect(Array.from(select.options).map(o => o.value)).toEqual([...SUPPORTED_UI_LANGUAGES]);
    });
  });

  describe('navigate section', () => {
    it('exposes the top-level route list', () => {
      expect(component.navLinks.some(l => l.route === '/books')).toBe(true);
      expect(component.navLinks.some(l => l.route === '/about')).toBe(true);
      expect(component.navLinks.some(l => l.route === '/people/narrators')).toBe(true);
    });

    it('renders one router-link per entry', () => {
      sheet.open();
      fixture.detectChanges();
      const links = fixture.nativeElement.querySelectorAll('.reading-sheet-nav-link');
      expect(links.length).toBe(component.navLinks.length);
    });
  });

  describe('focus management', () => {
    it('restores focus to the trigger element when the sheet closes', () => {
      // Stand in for an external trigger button (e.g. the header View icon).
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      trigger.focus();
      expect(document.activeElement).toBe(trigger);

      sheet.open();
      // Open should remember the trigger as the focus to restore.
      sheet.close();
      expect(document.activeElement).toBe(trigger);

      document.body.removeChild(trigger);
    });

    it('Tab from the last focusable cycles to the first', () => {
      sheet.open();
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      const focusables = Array.from(
        host.querySelectorAll<HTMLElement>(
          '.reading-sheet-panel button, .reading-sheet-panel input, .reading-sheet-panel select, .reading-sheet-panel a[href]'
        )
      ).filter(el => el.offsetParent !== null);
      expect(focusables.length).toBeGreaterThan(1);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      last.focus();
      expect(document.activeElement).toBe(last);

      const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
      component.onTab(event);
      expect(document.activeElement).toBe(first);
    });

    it('Shift+Tab from the first focusable cycles to the last', () => {
      sheet.open();
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      const focusables = Array.from(
        host.querySelectorAll<HTMLElement>(
          '.reading-sheet-panel button, .reading-sheet-panel input, .reading-sheet-panel select, .reading-sheet-panel a[href]'
        )
      ).filter(el => el.offsetParent !== null);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      first.focus();

      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
      component.onTab(event);
      expect(document.activeElement).toBe(last);
    });

    it('Tab handler is a no-op when the sheet is closed', () => {
      const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
      component.onTab(event);
      // Nothing to assert beyond "does not throw / does not prevent default".
      expect(event.defaultPrevented).toBe(false);
    });
  });
});
