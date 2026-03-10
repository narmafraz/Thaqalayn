import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxsModule, Store } from '@ngxs/store';
import { ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SearchBarComponent } from './search-bar.component';
import { TranslatePipe } from '@app/pipes/translate.pipe';
import { SearchState } from '@store/search/search.state';

describe('SearchBarComponent', () => {
  let component: SearchBarComponent;
  let fixture: ComponentFixture<SearchBarComponent>;
  let store: Store;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SearchBarComponent, TranslatePipe],
      imports: [
        NgxsModule.forRoot([SearchState]),
        RouterTestingModule,
        HttpClientTestingModule,
        MatTooltipModule,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .overrideComponent(SearchBarComponent, {
      set: { changeDetection: ChangeDetectionStrategy.Default }
    })
    .compileComponents();

    store = TestBed.inject(Store);
    fixture = TestBed.createComponent(SearchBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize activeResultIndex to -1', () => {
    expect(component.activeResultIndex).toBe(-1);
  });

  it('should reset activeResultIndex on search input', () => {
    component.activeResultIndex = 2;
    component.onSearchInput('test');
    expect(component.activeResultIndex).toBe(-1);
  });

  it('should reset activeResultIndex on clearSearch', () => {
    component.activeResultIndex = 3;
    component.clearSearch();
    expect(component.activeResultIndex).toBe(-1);
    expect(component.showDropdown).toBe(false);
  });

  it('should return null for activeDescendantId when no result is active', () => {
    component.activeResultIndex = -1;
    expect(component.getActiveDescendantId()).toBeNull();
  });

  it('should return correct activeDescendantId when a result is active', () => {
    component.activeResultIndex = 3;
    expect(component.getActiveDescendantId()).toBe('search-result-3');
  });

  describe('keyboard navigation', () => {
    it('should not navigate when dropdown is closed', () => {
      component.showDropdown = false;
      component.activeResultIndex = -1;
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      component.onKeyDown(event);
      expect(component.activeResultIndex).toBe(-1);
    });

    it('should close dropdown on Escape', () => {
      component.showDropdown = true;
      component.activeResultIndex = 2;
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.onKeyDown(event);
      expect(component.showDropdown).toBe(false);
      expect(component.activeResultIndex).toBe(-1);
    });
  });

  describe('ARIA attributes in template', () => {
    it('should have role="combobox" on input', () => {
      const input = fixture.nativeElement.querySelector('input');
      expect(input.getAttribute('role')).toBe('combobox');
    });

    it('should have aria-autocomplete on input', () => {
      const input = fixture.nativeElement.querySelector('input');
      expect(input.getAttribute('aria-autocomplete')).toBe('list');
    });

    it('should have aria-controls pointing to listbox', () => {
      const input = fixture.nativeElement.querySelector('input');
      expect(input.getAttribute('aria-controls')).toBe('search-results-listbox');
    });

    it('should set aria-expanded to false when dropdown is closed', () => {
      component.showDropdown = false;
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input');
      expect(input.getAttribute('aria-expanded')).toBe('false');
    });

    it('should set aria-expanded to true when dropdown is open', () => {
      component.showDropdown = true;
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input');
      expect(input.getAttribute('aria-expanded')).toBe('true');
    });
  });
});
