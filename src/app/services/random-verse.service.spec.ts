import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NgxsModule, Store } from '@ngxs/store';
import { RandomVerseService, RandomVerse } from './random-verse.service';
import { BooksService } from './books.service';
import { IndexState } from '@store/index/index.state';
import { RouterState } from '@store/router/router.state';
import { of, throwError } from 'rxjs';
import { Book, ChapterContent, VerseDetail } from '../models/book';

describe('RandomVerseService', () => {
  let service: RandomVerseService;
  let booksServiceSpy: jasmine.SpyObj<BooksService>;
  let store: Store;

  const mockQuranVerseDetail: VerseDetail = {
    kind: 'verse_detail',
    index: 'quran:1:1',
    data: {
      verse: {
        index: 1,
        local_index: 1,
        path: '/books/quran:1:1',
        text: ['بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'],
        sajda_type: '',
        translations: { 'en.qarai': ['In the Name of Allah, the All-beneficent, the All-merciful.'] },
        part_type: 'Verse',
        relations: {},
        narrator_chain: null,
      },
      chapter_path: '/books/quran:1',
      chapter_title: { en: 'Al-Fatiha', ar: 'الفاتحة' },
      nav: { prev: null, next: '/books/quran:1:2', up: '/books/quran:1' },
      verse_translations: ['en.qarai'],
    }
  };

  const mockHadithVerseDetail: VerseDetail = {
    kind: 'verse_detail',
    index: 'al-kafi:1:1:1:5',
    data: {
      verse: {
        index: 5,
        local_index: 5,
        path: '/books/al-kafi:1:1:1:5',
        text: ['حدثنا محمد عن أحمد قال الإمام الصادق عليه السلام العقل نور'],
        sajda_type: '',
        translations: { 'en.hubeali': ['Muhammad narrated from Ahmad that Imam al-Sadiq said: The intellect is a light.'] },
        part_type: 'Hadith',
        relations: {},
        narrator_chain: { text: '', parts: [] },
      },
      chapter_path: '/books/al-kafi:1:1:1',
      chapter_title: { en: 'Chapter of Intellect', ar: 'باب العقل' },
      nav: { prev: '/books/al-kafi:1:1:1:4', next: '/books/al-kafi:1:1:1:6', up: '/books/al-kafi:1:1:1' },
      verse_translations: ['en.hubeali'],
    }
  };

  const mockHadithWithIsnadChunks: VerseDetail = {
    kind: 'verse_detail',
    index: 'al-kafi:1:1:1:10',
    data: {
      verse: {
        index: 10,
        local_index: 10,
        path: '/books/al-kafi:1:1:1:10',
        text: ['حدثنا محمد عن أحمد عن الحسن عن العلاء قال الإمام الصادق العقل حجة الله على خلقه'],
        sajda_type: '',
        translations: { 'en.hubeali': ['Full translation with isnad included.'] },
        part_type: 'Hadith',
        relations: {},
        narrator_chain: { text: '', parts: [] },
        ai: {
          chunks: [
            {
              chunk_type: 'isnad',
              word_start: 0,
              word_end: 8,
              translations: {
                en: 'Muhammad narrated from Ahmad from al-Hasan from al-Ala that',
              },
            },
            {
              chunk_type: 'body',
              word_start: 8,
              word_end: 14,
              translations: {
                en: 'Imam al-Sadiq said: The intellect is the proof of Allah upon His creation.',
              },
            },
          ],
        },
      },
      chapter_path: '/books/al-kafi:1:1:1',
      chapter_title: { en: 'Chapter of Intellect', ar: 'باب العقل' },
      nav: { prev: null, next: null, up: '/books/al-kafi:1:1:1' },
      verse_translations: ['en.hubeali'],
    }
  };

  const mockShellChapter: ChapterContent = {
    kind: 'verse_list',
    index: 'al-kafi:1:1:1',
    data: {
      index: 'al-kafi:1:1:1',
      local_index: '1',
      path: '/books/al-kafi:1:1:1',
      titles: { en: 'Chapter 1', ar: 'باب ١' },
      descriptions: {},
      verse_count: 2,
      verse_start_index: 1,
      order: 1,
      rukus: 0,
      reveal_type: '',
      sajda_type: '',
      verses: [],
      chapters: [],
      part_type: 'chapter',
      nav: { prev: null, next: null, up: '/books/al-kafi:1:1' },
      verse_translations: ['en.hubeali'],
      default_verse_translation_ids: {},
      verse_refs: [
        { local_index: 0, part_type: 'Heading', inline: { text: ['Heading text'] } as any },
        { local_index: 1, part_type: 'Hadith', path: '/books/al-kafi:1:1:1:5' },
        { local_index: 2, part_type: 'Hadith', path: '/books/al-kafi:1:1:1:6' },
      ],
    }
  };

  const mockLegacyChapter: ChapterContent = {
    kind: 'verse_list',
    index: 'nahj-al-balagha:1:1',
    data: {
      index: 'nahj-al-balagha:1:1',
      local_index: '1',
      path: '/books/nahj-al-balagha:1:1',
      titles: { en: 'Sermon 1', ar: 'الخطبة ١' },
      descriptions: {},
      verse_count: 1,
      verse_start_index: 1,
      order: 1,
      rukus: 0,
      reveal_type: '',
      sajda_type: '',
      verses: [
        {
          index: 1,
          local_index: 1,
          path: '/books/nahj-al-balagha:1:1:1',
          text: ['الحمد لله الذي لا يبلغ مدحته القائلون'],
          sajda_type: '',
          translations: { 'en.peak': ['Praise be to Allah whose worth cannot be described by speakers.'] },
          part_type: 'Hadith',
          relations: {},
          narrator_chain: null,
        },
      ],
      chapters: [],
      part_type: 'chapter',
      nav: { prev: null, next: null, up: '/books/nahj-al-balagha:1' },
      verse_translations: ['en.peak'],
      default_verse_translation_ids: {},
    }
  };

  const mockEnIndex = {
    '/books/al-kafi:1:1:1': { part_type: 'Chapter', title: 'Chapter 1', local_index: 1 },
    '/books/al-kafi:1:1:2': { part_type: 'Chapter', title: 'Chapter 2', local_index: 2 },
    '/books/quran:1': { part_type: 'Chapter', title: 'Al-Fatiha', local_index: 1 },
    '/books/al-kafi': { part_type: 'Book', title: 'Al-Kafi', local_index: 0 },
    '/books/al-kafi:1': { part_type: 'Volume', title: 'Volume 1', local_index: 1 },
  };

  beforeEach(() => {
    booksServiceSpy = jasmine.createSpyObj('BooksService', ['getPart']);

    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([]), HttpClientTestingModule],
      providers: [
        RandomVerseService,
        { provide: BooksService, useValue: booksServiceSpy },
      ],
    });
    service = TestBed.inject(RandomVerseService);
    store = TestBed.inject(Store);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getRandomQuranVerse', () => {
    it('should return a verse from Quran', (done) => {
      booksServiceSpy.getPart.and.returnValue(of(mockQuranVerseDetail));

      service.getRandomQuranVerse().subscribe(verse => {
        expect(verse).toBeTruthy();
        expect(verse.bookSlug).toBe('quran');
        expect(verse.bookLabel).toBe('The Holy Quran');
        expect(verse.arabicText).toBeTruthy();
        expect(verse.path).toContain('/books/quran');
        done();
      });
    });

    it('should include translation text', (done) => {
      booksServiceSpy.getPart.and.returnValue(of(mockQuranVerseDetail));

      service.getRandomQuranVerse().subscribe(verse => {
        expect(verse.translationText).toContain('In the Name of Allah');
        expect(verse.translatorId).toBe('en.qarai');
        done();
      });
    });

    it('should format reference with chapter title', (done) => {
      booksServiceSpy.getPart.and.returnValue(of(mockQuranVerseDetail));

      service.getRandomQuranVerse().subscribe(verse => {
        expect(verse.reference).toContain('Al-Fatiha');
        expect(verse.reference).toContain('1');
        done();
      });
    });

    it('should return null on API error', (done) => {
      booksServiceSpy.getPart.and.returnValue(throwError(() => new Error('Network error')));

      service.getRandomQuranVerse().subscribe(verse => {
        expect(verse).toBeNull();
        done();
      });
    });

    it('should return null for non-verse_detail response', (done) => {
      booksServiceSpy.getPart.and.returnValue(of(mockShellChapter as any));

      service.getRandomQuranVerse().subscribe(verse => {
        expect(verse).toBeNull();
        done();
      });
    });
  });

  describe('getRandomHadith', () => {
    function setupIndexSpy() {
      spyOn(store, 'select').and.returnValue(of(
        (lang: string) => lang === 'en' ? mockEnIndex : undefined
      ));
      spyOn(store, 'selectSnapshot').and.callFake(((selector: any) => {
        if (selector === RouterState.getLanguage) return 'en';
        return undefined;
      }) as any);
    }

    it('should return a hadith via shell format (verse_refs)', (done) => {
      setupIndexSpy();
      // First call: chapter shell, second call: verse detail
      booksServiceSpy.getPart.and.callFake((index: string) => {
        if (index.split(':').length <= 4) return of(mockShellChapter);
        return of(mockHadithVerseDetail);
      });

      service.getRandomHadith().subscribe(verse => {
        expect(verse).toBeTruthy();
        expect(verse.bookSlug).toBe('al-kafi');
        expect(verse.bookLabel).toBe('Al-Kafi');
        expect(verse.reference).toContain('Hadith');
        done();
      });
    });

    it('should return a hadith via legacy format (inline verses)', (done) => {
      setupIndexSpy();
      booksServiceSpy.getPart.and.returnValue(of(mockLegacyChapter));

      service.getRandomHadith().subscribe(verse => {
        expect(verse).toBeTruthy();
        expect(verse.arabicText).toContain('الحمد لله');
        expect(verse.translationText).toContain('Praise be to Allah');
        done();
      });
    });

    it('should skip Heading refs in shell format', (done) => {
      setupIndexSpy();
      booksServiceSpy.getPart.and.callFake((index: string) => {
        if (index.split(':').length <= 4) return of(mockShellChapter);
        return of(mockHadithVerseDetail);
      });

      service.getRandomHadith().subscribe(verse => {
        // Should have fetched a verse_detail, not a heading
        expect(verse).toBeTruthy();
        expect(verse.path).toContain('/books/al-kafi:1:1:1:');
        done();
      });
    });

    it('should exclude Quran chapters from random hadith selection', (done) => {
      setupIndexSpy();
      booksServiceSpy.getPart.and.callFake((index: string) => {
        // The index passed should never start with 'quran'
        expect(index.startsWith('quran')).toBeFalse();
        if (index.split(':').length <= 4) return of(mockShellChapter);
        return of(mockHadithVerseDetail);
      });

      service.getRandomHadith().subscribe(() => done());
    });

    it('should return null on API error', (done) => {
      setupIndexSpy();
      booksServiceSpy.getPart.and.returnValue(throwError(() => new Error('fail')));

      service.getRandomHadith().subscribe(verse => {
        expect(verse).toBeNull();
        done();
      });
    });

    it('should return null when chapter has no verse_refs or verses', (done) => {
      setupIndexSpy();
      const emptyChapter: ChapterContent = {
        ...mockShellChapter,
        data: { ...mockShellChapter.data, verse_refs: [], verses: [] },
      };
      booksServiceSpy.getPart.and.returnValue(of(emptyChapter));

      service.getRandomHadith().subscribe(verse => {
        expect(verse).toBeNull();
        done();
      });
    });
  });

  describe('isnad skipping', () => {
    function setupStoreSpies() {
      spyOn(store, 'select').and.returnValue(of(
        (lang: string) => lang === 'en' ? mockEnIndex : undefined
      ));
      spyOn(store, 'selectSnapshot').and.callFake(((selector: any) => {
        if (selector === RouterState.getLanguage) return 'en';
        return undefined;
      }) as any);
    }

    it('should skip isnad chunks from Arabic text when AI chunks available', (done) => {
      setupStoreSpies();
      booksServiceSpy.getPart.and.callFake((index: string) => {
        if (index.split(':').length <= 4) return of(mockShellChapter);
        return of(mockHadithWithIsnadChunks);
      });

      service.getRandomHadith().subscribe(verse => {
        expect(verse).toBeTruthy();
        // The isnad is words 0-8, body is words 8-14
        // Arabic should NOT contain the first 8 words (isnad)
        expect(verse.arabicText).not.toContain('حدثنا');
        // Arabic SHOULD contain body words
        expect(verse.arabicText).toContain('الإمام');
        done();
      });
    });

    it('should use chunk translation instead of verse translation when available', (done) => {
      setupStoreSpies();
      booksServiceSpy.getPart.and.callFake((index: string) => {
        if (index.split(':').length <= 4) return of(mockShellChapter);
        return of(mockHadithWithIsnadChunks);
      });

      service.getRandomHadith().subscribe(verse => {
        expect(verse).toBeTruthy();
        // Should use the body chunk's EN translation, not the verse-level translation
        expect(verse.translationText).toContain('Imam al-Sadiq said');
        expect(verse.translationText).not.toContain('Full translation with isnad');
        expect(verse.translatorId).toBe('en.ai');
        done();
      });
    });

    it('should fall back to full text when no AI chunks exist', (done) => {
      setupStoreSpies();
      booksServiceSpy.getPart.and.callFake((index: string) => {
        if (index.split(':').length <= 4) return of(mockShellChapter);
        return of(mockHadithVerseDetail); // no ai.chunks
      });

      service.getRandomHadith().subscribe(verse => {
        expect(verse).toBeTruthy();
        // Should use the full verse text including isnad
        expect(verse.arabicText).toContain('حدثنا');
        expect(verse.translatorId).toBe('en.hubeali');
        done();
      });
    });

    it('should not skip isnad for Quran verses', (done) => {
      booksServiceSpy.getPart.and.returnValue(of(mockQuranVerseDetail));

      service.getRandomQuranVerse().subscribe(verse => {
        expect(verse).toBeTruthy();
        // Quran should always use full text
        expect(verse.arabicText).toBe('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
        done();
      });
    });
  });

  describe('translation selection', () => {
    it('should prefer current language translation', (done) => {
      spyOn(store, 'selectSnapshot').and.callFake(((selector: any) => {
        if (selector === RouterState.getLanguage) return 'fa';
        return undefined;
      }) as any);

      const verseWithFarsi: VerseDetail = {
        ...mockQuranVerseDetail,
        data: {
          ...mockQuranVerseDetail.data,
          verse: {
            ...mockQuranVerseDetail.data.verse,
            translations: {
              'en.qarai': ['English text'],
              'fa.fooladvand': ['متن فارسی'],
            },
          },
        },
      };
      booksServiceSpy.getPart.and.returnValue(of(verseWithFarsi));

      service.getRandomQuranVerse().subscribe(verse => {
        expect(verse.translationText).toBe('متن فارسی');
        expect(verse.translatorId).toBe('fa.fooladvand');
        done();
      });
    });

    it('should fall back to English when current language not available', (done) => {
      spyOn(store, 'selectSnapshot').and.callFake(((selector: any) => {
        if (selector === RouterState.getLanguage) return 'zh';
        return undefined;
      }) as any);

      booksServiceSpy.getPart.and.returnValue(of(mockQuranVerseDetail));

      service.getRandomQuranVerse().subscribe(verse => {
        expect(verse.translationText).toContain('In the Name of Allah');
        expect(verse.translatorId).toBe('en.qarai');
        done();
      });
    });
  });
});
