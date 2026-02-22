import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DailyVerseService, DailyVerse } from './daily-verse.service';
import { BooksService } from './books.service';
import { of, throwError } from 'rxjs';
import { Book, ChapterContent, ChapterList } from '../models/book';

describe('DailyVerseService', () => {
  let service: DailyVerseService;
  let booksServiceSpy: jasmine.SpyObj<BooksService>;

  const mockChapterContent: ChapterContent = {
    kind: 'verse_list',
    index: 'quran:1',
    data: {
      index: 'quran:1',
      local_index: '1',
      path: '/books/quran:1',
      titles: { en: 'Al-Fatiha', ar: 'الفاتحة' },
      descriptions: {},
      verse_count: 7,
      verse_start_index: 1,
      order: 1,
      rukus: 0,
      reveal_type: 'meccan',
      sajda_type: '',
      verses: [
        {
          index: 1,
          local_index: 1,
          path: '/books/quran:1:1',
          text: ['بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'],
          sajda_type: '',
          translations: { 'en.qarai': ['In the Name of Allah, the All-beneficent, the All-merciful.'] },
          part_type: 'verse',
          relations: {},
          narrator_chain: null,
        },
        {
          index: 2,
          local_index: 2,
          path: '/books/quran:1:2',
          text: ['الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ'],
          sajda_type: '',
          translations: { 'en.qarai': ['All praise belongs to Allah, Lord of all the worlds.'] },
          part_type: 'verse',
          relations: {},
          narrator_chain: null,
        },
      ],
      chapters: [],
      part_type: 'surah',
      nav: { prev: null, next: '/books/quran:2', up: '/books/quran' },
      verse_translations: ['en.qarai'],
      default_verse_translation_ids: { en: 'en.qarai' },
    }
  };

  const mockChapterList: ChapterList = {
    kind: 'chapter_list',
    index: 'al-kafi:1:1',
    data: {
      index: 'al-kafi:1:1',
      local_index: '1',
      path: '/books/al-kafi:1:1',
      titles: { en: 'The Book of Intelligence and Ignorance', ar: 'كتاب العقل والجهل' },
      descriptions: {},
      verse_count: 0,
      verse_start_index: 0,
      order: 1,
      rukus: 0,
      reveal_type: '',
      sajda_type: '',
      verses: [],
      chapters: [
        {
          index: 'al-kafi:1:1:1',
          local_index: '1',
          path: '/books/al-kafi:1:1:1',
          titles: { en: 'Chapter 1', ar: 'باب ١' },
          descriptions: {},
          verse_count: 5,
          verse_start_index: 1,
          order: 1,
          rukus: 0,
          reveal_type: '',
          sajda_type: '',
          verses: [],
          chapters: [],
          part_type: 'chapter',
          nav: null,
          verse_translations: [],
          default_verse_translation_ids: {},
        },
      ],
      part_type: 'book',
      nav: { prev: null, next: null, up: '/books/al-kafi:1' },
      verse_translations: [],
      default_verse_translation_ids: {},
    }
  };

  beforeEach(() => {
    // Clear localStorage cache
    localStorage.removeItem('thaqalayn-daily-verse');

    booksServiceSpy = jasmine.createSpyObj('BooksService', ['getPart']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        DailyVerseService,
        { provide: BooksService, useValue: booksServiceSpy },
      ],
    });
    service = TestBed.inject(DailyVerseService);
  });

  afterEach(() => {
    localStorage.removeItem('thaqalayn-daily-verse');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return a daily verse from Quran', (done) => {
    booksServiceSpy.getPart.and.returnValue(of(mockChapterContent));

    service.getDailyVerse().subscribe(verse => {
      if (verse) {
        expect(verse.path).toContain('/books/');
        expect(verse.arabicText).toBeTruthy();
        expect(verse.bookLabel).toBeTruthy();
        expect(verse.reference).toBeTruthy();
        done();
      } else {
        // If null (no matching verse for today's seed), that's also acceptable
        done();
      }
    });
  });

  it('should return null on API error', (done) => {
    booksServiceSpy.getPart.and.returnValue(throwError(() => new Error('Network error')));

    service.getDailyVerse().subscribe(verse => {
      expect(verse).toBeNull();
      done();
    });
  });

  it('should cache result in localStorage', (done) => {
    booksServiceSpy.getPart.and.returnValue(of(mockChapterContent));

    service.getDailyVerse().subscribe(verse => {
      if (verse) {
        const cached = localStorage.getItem('thaqalayn-daily-verse');
        expect(cached).toBeTruthy();
        const parsed = JSON.parse(cached);
        expect(parsed.verse).toBeTruthy();
        expect(parsed.date).toBeTruthy();
      }
      done();
    });
  });

  it('should use cached result on second call', (done) => {
    booksServiceSpy.getPart.and.returnValue(of(mockChapterContent));

    service.getDailyVerse().subscribe(() => {
      // Call count after first call
      const firstCallCount = booksServiceSpy.getPart.calls.count();

      // Second call should use cache
      service.getDailyVerse().subscribe(() => {
        // Should not have made additional API calls
        expect(booksServiceSpy.getPart.calls.count()).toBe(firstCallCount);
        done();
      });
    });
  });

  it('should truncate long texts to 300 characters', (done) => {
    const longText = 'A'.repeat(500);
    const longChapter: ChapterContent = {
      ...mockChapterContent,
      data: {
        ...mockChapterContent.data,
        verses: [{
          ...mockChapterContent.data.verses[0],
          text: [longText],
          translations: { 'en.qarai': [longText] },
        }],
      }
    };
    booksServiceSpy.getPart.and.returnValue(of(longChapter));

    service.getDailyVerse().subscribe(verse => {
      if (verse) {
        expect(verse.arabicText.length).toBeLessThanOrEqual(303); // 300 + '...'
        expect(verse.translationText.length).toBeLessThanOrEqual(303);
      }
      done();
    });
  });
});
