import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxsModule } from '@ngxs/store';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { of } from 'rxjs';

import { VerseDetailComponent } from './verse-detail.component';
import { TranslatePipe } from '@app/pipes/translate.pipe';
import { VerseDetail } from '@app/models';

describe('VerseDetailComponent', () => {
  let component: VerseDetailComponent;
  let fixture: ComponentFixture<VerseDetailComponent>;

  const mockBook: VerseDetail = {
    kind: 'verse_detail',
    index: 'al-kafi:1:1:1:1',
    data: {
      verse: {
        index: 1,
        local_index: 1,
        path: '/books/al-kafi:1:1:1:1',
        text: ['<p>Arabic text</p>'],
        sajda_type: '',
        translations: { 'en.hubeali': ['English translation'] },
        part_type: 'Hadith',
        relations: {},
        narrator_chain: { parts: [], text: '' },
      },
      chapter_path: '/books/al-kafi:1:1:1',
      chapter_title: { en: 'Test Chapter', ar: 'فصل اختبار' },
      nav: { prev: null, next: '/books/al-kafi:1:1:1:2', up: '/books/al-kafi:1:1:1' },
      gradings: { majlisi: 'Sahih' },
      source_url: 'https://example.com',
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VerseDetailComponent, TranslatePipe],
      imports: [
        NgxsModule.forRoot([]),
        RouterTestingModule,
        HttpClientTestingModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(VerseDetailComponent);
    component = fixture.componentInstance;
    component.book$ = of(mockBook);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return correct grading class for Sahih', () => {
    expect(component.getGradingClass('Sahih')).toBe('grading-sahih');
  });

  it('should return correct grading class for Hasan', () => {
    expect(component.getGradingClass('Hasan')).toBe('grading-hasan');
  });

  it('should strip /books/ prefix from chapter path', () => {
    expect(component.getChapterRouterLink('/books/al-kafi:1:1:1')).toBe('al-kafi:1:1:1');
  });
});
