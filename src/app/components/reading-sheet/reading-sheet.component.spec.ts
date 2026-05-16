import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ReadingSheetComponent } from './reading-sheet.component';
import { ReadingSheetService } from '@app/services/reading-sheet.service';
import { AiPreferencesService } from '@app/services/ai-preferences.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

describe('ReadingSheetComponent', () => {
  let component: ReadingSheetComponent;
  let fixture: ComponentFixture<ReadingSheetComponent>;
  let sheet: ReadingSheetService;
  let prefs: AiPreferencesService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      declarations: [ReadingSheetComponent, TranslatePipe],
      imports: [FormsModule, MatTooltipModule, HttpClientTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingSheetComponent);
    component = fixture.componentInstance;
    sheet = TestBed.inject(ReadingSheetService);
    prefs = TestBed.inject(AiPreferencesService);
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

  it('onLangChange writes wordByWordDefaultLang', () => {
    component.onLangChange('ur');
    expect(prefs.get('wordByWordDefaultLang')).toBe('ur');
  });
});
