import { TestBed, waitForAsync } from '@angular/core/testing';
import { NgxsModule, Store } from '@ngxs/store';
import { BooksState, BooksStateModel } from './books.state';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Book, ChapterContent, ChapterList } from '@app/models';

describe('BooksState', () => {
  let store: Store;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NgxsModule.forRoot([BooksState]),
        HttpClientTestingModule,
      ]
    }).compileComponents();
    store = TestBed.inject(Store);
  }));

  it('should initialize with empty titles and parts', () => {
    const state: BooksStateModel = store.selectSnapshot(BooksState.getState);
    expect(state.titles).toEqual([]);
    expect(state.parts).toEqual({});
  });

  it('should return undefined for a non-existent part index', () => {
    const getPartByIndex = store.selectSnapshot(BooksState.getPartByIndex);
    expect(getPartByIndex('nonexistent')).toBeUndefined();
  });

  it('should have loading empty initially', () => {
    const state: BooksStateModel = store.selectSnapshot(BooksState.getState);
    expect(state.loading).toEqual({});
  });

  it('should have empty errors initially', () => {
    const state: BooksStateModel = store.selectSnapshot(BooksState.getState);
    expect(state.errors).toEqual({});
  });

  describe('getPartByIndex', () => {
    it('should return the part when it exists', () => {
      const mockBook: ChapterList = {
        kind: 'chapter_list',
        index: 'al-kafi:1',
        data: {
          index: 'al-kafi:1',
          local_index: '1',
          path: '/books/al-kafi:1',
          titles: { en: 'Volume One', ar: 'الجزء الأول' },
          descriptions: {},
          verse_count: 0,
          verse_start_index: 0,
          order: 1,
          rukus: 0,
          reveal_type: '',
          sajda_type: '',
          verses: [],
          chapters: [],
          part_type: 'volume',
          nav: { prev: null, next: '/books/al-kafi:2', up: '/books/al-kafi' },
          verse_translations: [],
          default_verse_translation_ids: {},
        }
      };

      store.reset({
        books: {
          titles: [],
          parts: { 'al-kafi:1': mockBook },
          loading: false,
          errors: {},
        }
      });

      const getPartByIndex = store.selectSnapshot(BooksState.getPartByIndex);
      const result = getPartByIndex('al-kafi:1');
      expect(result).toBeDefined();
      expect(result.kind).toBe('chapter_list');
      expect(result.index).toBe('al-kafi:1');
    });
  });

  describe('with populated state', () => {
    const mockChapterContent: ChapterContent = {
      kind: 'verse_list',
      index: 'al-kafi:1:2:1',
      data: {
        index: 'al-kafi:1:2:1',
        local_index: '1',
        path: '/books/al-kafi:1:2:1',
        titles: { en: 'Chapter 1', ar: 'الباب الأول' },
        descriptions: {},
        verse_count: 9,
        verse_start_index: 37,
        order: 1,
        rukus: 0,
        reveal_type: '',
        sajda_type: '',
        verses: [{
          index: 37,
          local_index: 1,
          path: '/books/al-kafi:1:2:1:1',
          text: ['Arabic text here'],
          sajda_type: '',
          translations: {
            'en.hubeali': ['English translation'],
            'fa.ansarian': ['Persian translation'],
          },
          part_type: 'hadith',
          relations: {},
          narrator_chain: { parts: [], text: '' },
        }],
        chapters: [],
        part_type: 'chapter',
        nav: { prev: null, next: '/books/al-kafi:1:2:2', up: '/books/al-kafi:1:2' },
        verse_translations: ['en.hubeali', 'fa.ansarian'],
        default_verse_translation_ids: { en: 'en.hubeali', fa: 'fa.ansarian' },
      }
    };

    beforeEach(() => {
      store.reset({
        books: {
          titles: [],
          parts: { 'al-kafi:1:2:1': mockChapterContent },
          loading: false,
          errors: {},
        }
      });
    });

    it('should return chapter content from parts', () => {
      const getPartByIndex = store.selectSnapshot(BooksState.getPartByIndex);
      const result = getPartByIndex('al-kafi:1:2:1');
      expect(result).toBeDefined();
      expect(result.kind).toBe('verse_list');
    });

    it('should have verses in the chapter', () => {
      const getPartByIndex = store.selectSnapshot(BooksState.getPartByIndex);
      const result = getPartByIndex('al-kafi:1:2:1') as ChapterContent;
      expect(result.data.verses.length).toBe(1);
      expect(result.data.verses[0].local_index).toBe(1);
    });

    it('should have translations on verses', () => {
      const getPartByIndex = store.selectSnapshot(BooksState.getPartByIndex);
      const result = getPartByIndex('al-kafi:1:2:1') as ChapterContent;
      const verse = result.data.verses[0];
      expect(Object.keys(verse.translations).length).toBe(2);
      expect(verse.translations['en.hubeali']).toEqual(['English translation']);
    });
  });
});
