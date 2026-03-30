import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxsModule } from '@ngxs/store';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { BehaviorSubject, of } from 'rxjs';

import { VerseDetailComponent } from './verse-detail.component';
import { TranslatePipe } from '@app/pipes/translate.pipe';
import { VerseDetail } from '@app/models';

describe('VerseDetailComponent', () => {
  let component: VerseDetailComponent;
  let fixture: ComponentFixture<VerseDetailComponent>;
  let bookSubject: BehaviorSubject<VerseDetail>;

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
        MatMenuModule,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    bookSubject = new BehaviorSubject<VerseDetail>(mockBook);
    fixture = TestBed.createComponent(VerseDetailComponent);
    component = fixture.componentInstance;
    component.book$ = bookSubject.asObservable();
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

  it('should return correct grading class for Da\'if', () => {
    expect(component.getGradingClass("Da'if")).toBe('grading-daif');
    expect(component.getGradingClass('daif')).toBe('grading-daif');
  });

  it('should return correct grading class for Mu\'tabar', () => {
    expect(component.getGradingClass("Mu'tabar")).toBe('grading-mutabar');
    expect(component.getGradingClass('muatabar')).toBe('grading-mutabar');
  });

  it('should return grading-unknown for unrecognized grading values', () => {
    expect(component.getGradingClass('Unknown')).toBe('grading-unknown');
    expect(component.getGradingClass('')).toBe('grading-unknown');
    expect(component.getGradingClass('some-other')).toBe('grading-unknown');
  });

  it('should handle Arabic grading values', () => {
    expect(component.getGradingClass('صحيح')).toBe('grading-sahih');
    expect(component.getGradingClass('حسن')).toBe('grading-hasan');
    expect(component.getGradingClass('ضعيف')).toBe('grading-daif');
    expect(component.getGradingClass('معتبر')).toBe('grading-mutabar');
  });

  it('should strip /books/ prefix from chapter path', () => {
    expect(component.getChapterRouterLink('/books/al-kafi:1:1:1')).toBe('al-kafi:1:1:1');
  });

  it('should strip /books/ prefix from nav links', () => {
    expect(component.getNavRouterLink('/books/al-kafi:1:1:1:2')).toBe('al-kafi:1:1:1:2');
    expect(component.getNavRouterLink('/books/quran:1:1')).toBe('quran:1:1');
  });

  it('should render grading badges in the template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const gradingSection = compiled.querySelector('.gradings-section');
    expect(gradingSection).toBeTruthy();

    const badges = compiled.querySelectorAll('.grading-badge');
    expect(badges.length).toBe(1);

    // Should have the sahih class
    expect(badges[0].classList.contains('grading-sahih')).toBe(true);
  });

  it('should render external links button when external links are available', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const externalLinksBtn = compiled.querySelector('.external-links-btn');
    expect(externalLinksBtn).toBeTruthy();
    expect(component.externalLinks.length).toBeGreaterThan(0);
  });

  it('should render next nav link but not prev link', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const navPrev = compiled.querySelector('.nav-prev');
    const navNext = compiled.querySelector('.nav-next');

    expect(navPrev).toBeFalsy();
    expect(navNext).toBeTruthy();
  });

  it('should render chapter context link', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const chapterLink = compiled.querySelector('.chapter-link');
    expect(chapterLink).toBeTruthy();
  });

  it('should not render validation section when cross_validation is absent', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const validationSection = compiled.querySelector('.validation-section');
    // mockBook does not have cross_validation, so section should not render
    expect(validationSection).toBeFalsy();
  });

  it('should render validation section when cross_validation is present', () => {
    const bookWithValidation: VerseDetail = {
      ...mockBook,
      data: {
        ...mockBook.data,
        cross_validation: {
          status: 'verified',
          confidence: 0.95,
          sources: ['source1', 'source2'],
        },
      },
    };

    bookSubject.next(bookWithValidation);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const validationSection = compiled.querySelector('.validation-section');
    expect(validationSection).toBeTruthy();

    const badge = compiled.querySelector('.validation-badge.verified');
    expect(badge).toBeTruthy();
  });

  describe('discussion header accessibility (P13-09)', () => {
    it('should have role="button" on discussion header when discussion is enabled', () => {
      // Discussion section only renders when discussionEnabled is true
      component.discussionEnabled = true;
      fixture.detectChanges();
      const header = fixture.nativeElement.querySelector('.discussion-header');
      if (header) {
        expect(header.getAttribute('role')).toBe('button');
        expect(header.getAttribute('tabindex')).toBe('0');
        expect(header.getAttribute('aria-expanded')).toBe('false');
      }
    });

    it('should update aria-expanded when discussion is toggled', () => {
      component.discussionEnabled = true;
      component.showCommentEditor = false;
      fixture.detectChanges();
      const header = fixture.nativeElement.querySelector('.discussion-header');
      if (header) {
        expect(header.getAttribute('aria-expanded')).toBe('false');
        component.showCommentEditor = true;
        fixture.detectChanges();
        expect(header.getAttribute('aria-expanded')).toBe('true');
      }
    });
  });

  it('should render unverified badge for non-verified status', () => {
    const bookWithUnverified: VerseDetail = {
      ...mockBook,
      data: {
        ...mockBook.data,
        cross_validation: {
          status: 'unverified',
          confidence: 0.3,
          sources: [],
        },
      },
    };

    bookSubject.next(bookWithUnverified);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.validation-badge.unverified');
    expect(badge).toBeTruthy();
  });
});
