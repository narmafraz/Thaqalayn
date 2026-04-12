import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxsModule } from '@ngxs/store';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject } from 'rxjs';

import { ChapterContentComponent } from './chapter-content.component';
import { TranslatePipe } from '@app/pipes/translate.pipe';
import { ChapterContent, Verse } from '@app/models';

describe('ChapterContentComponent', () => {
  let component: ChapterContentComponent;
  let fixture: ComponentFixture<ChapterContentComponent>;
  let bookSubject: BehaviorSubject<ChapterContent>;

  const mockVerse: Verse = {
    index: 1,
    local_index: 1,
    path: '/books/al-kafi:1:1:1:1',
    text: ['<p>Arabic text</p>'],
    sajda_type: '',
    translations: { 'en.hubeali': ['English translation'] },
    part_type: 'Hadith',
    relations: {},
    narrator_chain: { parts: [], text: '' },
  };

  const mockBook: ChapterContent = {
    kind: 'verse_list',
    index: 'al-kafi:1:1:1',
    data: {
      index: 'al-kafi:1:1:1',
      local_index: '1',
      path: '/books/al-kafi:1:1:1',
      titles: { en: 'Test Chapter', ar: 'فصل اختبار' },
      descriptions: {},
      verse_count: 1,
      verse_start_index: 1,
      order: 1,
      rukus: 0,
      reveal_type: '',
      sajda_type: '',
      verses: [mockVerse],
      chapters: [],
      part_type: 'Hadith',
      nav: { prev: null, next: '/books/al-kafi:1:1:2', up: '/books/al-kafi:1:1' },
      verse_translations: ['en.hubeali'],
      default_verse_translation_ids: {},
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChapterContentComponent, TranslatePipe],
      imports: [
        NgxsModule.forRoot([]),
        RouterTestingModule,
        HttpClientTestingModule,
        MatCardModule,
        MatIconModule,
        MatSelectModule,
        MatTooltipModule,
        FormsModule,
        BrowserAnimationsModule,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    bookSubject = new BehaviorSubject<ChapterContent>(mockBook);
    fixture = TestBed.createComponent(ChapterContentComponent);
    component = fixture.componentInstance;
    component.book$ = bookSubject.asObservable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should detect legacy format when verses are present', () => {
    expect(component.isShellFormat).toBe(false);
  });

  it('should detect shell format when verse_refs are present', () => {
    const shellBook: ChapterContent = {
      ...mockBook,
      data: {
        ...mockBook.data,
        verses: undefined as any,
        verse_refs: [
          { local_index: 1, part_type: 'Hadith', path: '/books/al-kafi:1:1:1:1' },
        ],
      },
    };
    bookSubject.next(shellBook);
    fixture.detectChanges();
    expect(component.isShellFormat).toBe(true);
  });

  it('should return correct verse count', () => {
    expect(component.getVerseCount(mockBook)).toBe(1);
  });

  it('should identify Quran books', () => {
    expect(component.isQuranBook('quran:1')).toBe(true);
    expect(component.isQuranBook('al-kafi:1:1:1')).toBe(false);
  });

  it('should get Quran surah number from index', () => {
    expect(component.getQuranSurah('quran:1')).toBe(1);
    expect(component.getQuranSurah('quran:114')).toBe(114);
  });

  it('should get book name from crumbs', () => {
    const crumbs = [{ titles: { en: 'Al-Kafi' }, indexed_titles: { en: 'Al-Kafi' }, path: '/books/al-kafi' }];
    expect(component.getBookName(crumbs as any)).toBe('Al-Kafi');
  });

  it('should return empty string when no crumbs', () => {
    expect(component.getBookName([])).toBe('');
  });

  it('should build verse path correctly', () => {
    expect(component.getVersePath('al-kafi:1:1:1', mockVerse)).toBe('/books/al-kafi:1:1:1:1');
  });

  it('should strip /books/ prefix', () => {
    expect(component.stripBooksPrefix('/books/al-kafi:1')).toBe('al-kafi:1');
    expect(component.stripBooksPrefix('al-kafi:1')).toBe('al-kafi:1');
  });

  it('should toggle metadata expansion', () => {
    expect(component.isMetadataExpanded(1)).toBe(false);
    component.toggleMetadata(1);
    expect(component.isMetadataExpanded(1)).toBe(true);
    component.toggleMetadata(1);
    expect(component.isMetadataExpanded(1)).toBe(false);
  });

  it('should parse grading correctly', () => {
    const result = component.parseGrading('Al-Majlisi: <span>صحيح</span> - Some source');
    expect(result.scholar).toBe('Al-Majlisi');
    expect(result.term).toBe('صحيح');
    expect(result.cssClass).toBe('grading-sahih');
  });

  it('should render verse card in legacy format', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const card = compiled.querySelector('mat-card');
    expect(card).toBeTruthy();
  });

  it('should include verse-actions component in legacy format', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const actions = compiled.querySelector('app-verse-actions');
    expect(actions).toBeTruthy();
  });
});
