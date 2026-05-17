import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ReadingToolbarComponent } from './reading-toolbar.component';
import { AiPreferencesService } from '@app/services/ai-preferences.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

describe('ReadingToolbarComponent', () => {
  let component: ReadingToolbarComponent;
  let fixture: ComponentFixture<ReadingToolbarComponent>;
  let prefs: AiPreferencesService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      declarations: [ReadingToolbarComponent, TranslatePipe],
      imports: [MatTooltipModule, HttpClientTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingToolbarComponent);
    component = fixture.componentInstance;
    prefs = TestBed.inject(AiPreferencesService);
    fixture.detectChanges();
  });

  it('initialises toggle state from AiPreferencesService', () => {
    expect(component.showChainDiagram).toBe(false);
    expect(component.showDiacritics).toBe(true); // default
    expect(component.showWordAnalysis).toBe(false);
  });

  it('toggleChainDiagram writes through to the service', () => {
    component.toggleChainDiagram();
    expect(prefs.get('showChainDiagram')).toBe(true);
    component.toggleChainDiagram();
    expect(prefs.get('showChainDiagram')).toBe(false);
  });

  it('toggleDiacritics writes through to the service', () => {
    component.toggleDiacritics();
    expect(prefs.get('showDiacritizedByDefault')).toBe(false);
    component.toggleDiacritics();
    expect(prefs.get('showDiacritizedByDefault')).toBe(true);
  });

  it('toggleWordAnalysis writes through to the service', () => {
    component.toggleWordAnalysis();
    expect(prefs.get('showWordByWord')).toBe(true);
    component.toggleWordAnalysis();
    expect(prefs.get('showWordByWord')).toBe(false);
  });

  it('external preference change is reflected in component state', () => {
    prefs.set('showChainDiagram', true);
    expect(component.showChainDiagram).toBe(true);
    prefs.set('showWordByWord', true);
    expect(component.showWordAnalysis).toBe(true);
  });

  describe('hide-on-scroll behaviour', () => {
    function emitScroll(y: number): void {
      Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
      component.onScroll();
    }

    it('stays visible inside the top area (< TOP_AREA_PX)', () => {
      emitScroll(30);
      expect(component.hidden).toBe(false);
    });

    it('hides when scrolling down past the dead zone (past TOP_AREA_PX)', () => {
      emitScroll(100); // establish baseline beyond TOP_AREA_PX
      emitScroll(200); // scroll down >= dead zone
      expect(component.hidden).toBe(true);
    });

    it('reappears on any upward scroll past the dead zone', () => {
      emitScroll(100);
      emitScroll(300); // hide
      expect(component.hidden).toBe(true);
      emitScroll(280); // scroll up >= dead zone
      expect(component.hidden).toBe(false);
    });

    it('returns to visible when scrolling back into the top area', () => {
      emitScroll(100);
      emitScroll(300); // hide
      expect(component.hidden).toBe(true);
      emitScroll(20); // re-enter top area
      expect(component.hidden).toBe(false);
    });

    it('does not flicker inside the dead zone (< DEAD_ZONE_PX delta)', () => {
      emitScroll(200); // baseline
      const before = component.hidden;
      emitScroll(205); // tiny scroll, should not change state
      expect(component.hidden).toBe(before);
    });

    // Regression for the smooth-scroll bug: real browsers fire scroll
    // events with ~5px deltas during wheel/trackpad scrolling. If we
    // re-baseline lastScrollY on every event, the dead zone is
    // permanently active and hide-on-scroll never triggers.
    it('accumulates small downward ticks until the dead zone is crossed', () => {
      // First establish a baseline at y=100 with hidden=false: scroll
      // down (decisive), then back up (decisive). Now lastScrollY=100,
      // hidden=false.
      emitScroll(300);
      emitScroll(100);
      expect(component.hidden).toBe(false);
      emitScroll(105); // delta 5 — within dead zone
      expect(component.hidden).toBe(false);
      emitScroll(110); // cumulative delta 10 — still within dead zone (<=)
      expect(component.hidden).toBe(false);
      emitScroll(115); // cumulative delta 15 — exceeds dead zone, should hide
      expect(component.hidden).toBe(true);
    });

    it('accumulates small upward ticks to reveal the toolbar', () => {
      emitScroll(300); // decisive — hides, lastScrollY=300
      expect(component.hidden).toBe(true);
      emitScroll(295); // -5 within dead zone
      expect(component.hidden).toBe(true);
      emitScroll(290); // cumulative -10 still within dead zone
      expect(component.hidden).toBe(true);
      emitScroll(285); // cumulative -15 exceeds dead zone, should reveal
      expect(component.hidden).toBe(false);
    });
  });
});
