import { TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { NgxsModule, Store } from '@ngxs/store';
import { BooksState, BooksStateModel } from './books.state';
import { RouterStateModel, RouterState } from '@store/router/router.state';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Book, ChapterContent, ChapterList, VerseDetail } from '@app/models';
import { AiPreferencesService, AiPreferences } from '@app/services/ai-preferences.service';
import { RetryLoadBookPart } from './books.actions';
import { BehaviorSubject } from 'rxjs';

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

  describe('lang-switch refetch on verse_detail', () => {
    let prefs$: BehaviorSubject<AiPreferences>;
    let dispatchSpy: jasmine.Spy;
    const DEFAULTS: AiPreferences = {
      showDiacritizedByDefault: true,
      showContentTypeBadges: true,
      showTopicTags: true,
      showAiTranslationDisclaimer: true,
      showChainDiagram: false,
      showWordByWord: false,
      sidesheetOpenOnDesktop: false,
      wordByWordDefaultLang: 'en',
      muteReadVerses: true,
      muteReadingBanner: false,
      viewMode: 'plain',
    };

    function splitShapeVerseDetail(): VerseDetail {
      return {
        kind: 'verse_detail',
        index: 'al-kafi:1:1:1:1',
        data: {
          chapter_path: '/books/al-kafi:1:1:1',
          chapter_title: { en: 'Test' },
          nav: { prev: '', next: '', up: '' },
          verse: {
            index: 1, local_index: 1, path: '/books/al-kafi:1:1:1:1',
            text: ['Arabic'], sajda_type: '',
            translations: {}, part_type: 'Hadith',
            relations: {}, narrator_chain: { parts: [], text: '' },
            ai: { chunks: [] } as any,
          },
        },
      } as VerseDetail;
    }

    function legacyVerseDetail(): VerseDetail {
      const v = splitShapeVerseDetail();
      v.data.verse.ai = { summaries: { en: 'inline' } } as any;
      return v;
    }

    beforeEach(waitForAsync(() => {
      prefs$ = new BehaviorSubject<AiPreferences>({ ...DEFAULTS });
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [
          NgxsModule.forRoot([BooksState, RouterState]),
          HttpClientTestingModule,
        ],
        providers: [
          { provide: AiPreferencesService, useValue: { preferences$: prefs$.asObservable() } },
        ],
      }).compileComponents();
      store = TestBed.inject(Store);
      dispatchSpy = spyOn(store, 'dispatch').and.callThrough();
    }));

    function seedRoute(index: string, part: Book) {
      store.reset({
        books: { titles: [], parts: { [index]: part }, loading: {}, errors: {} },
        myrouter: { index, language: 'en', translation: '', translation2: '', fragment: '', sort: '' } as RouterStateModel,
      });
    }

    it('dispatches RetryLoadBookPart when lang changes on a split-shape verse_detail', fakeAsync(() => {
      seedRoute('al-kafi:1:1:1:1', splitShapeVerseDetail());
      dispatchSpy.calls.reset();
      prefs$.next({ ...DEFAULTS, wordByWordDefaultLang: 'fa' });
      tick(0);
      const retryCall = dispatchSpy.calls.allArgs().find(([action]) => action instanceof RetryLoadBookPart);
      expect(retryCall).toBeDefined();
      expect((retryCall[0] as RetryLoadBookPart).payload).toBe('al-kafi:1:1:1:1');
    }));

    it('does NOT dispatch when only the initial pref value is emitted', fakeAsync(() => {
      seedRoute('al-kafi:1:1:1:1', splitShapeVerseDetail());
      // Subscription was set up with the initial 'en' already in the BehaviorSubject;
      // skip(1) inside the state handler should suppress this first emission.
      tick(0);
      const retryCall = dispatchSpy.calls.allArgs().find(([action]) => action instanceof RetryLoadBookPart);
      expect(retryCall).toBeUndefined();
    }));

    it('does NOT dispatch when current part is a chapter_list', fakeAsync(() => {
      const chapter: ChapterList = {
        kind: 'chapter_list', index: 'al-kafi:1', data: {} as any,
      };
      seedRoute('al-kafi:1', chapter);
      dispatchSpy.calls.reset();
      prefs$.next({ ...DEFAULTS, wordByWordDefaultLang: 'fa' });
      tick(0);
      const retryCall = dispatchSpy.calls.allArgs().find(([action]) => action instanceof RetryLoadBookPart);
      expect(retryCall).toBeUndefined();
    }));

    it('does NOT dispatch when current part is a legacy-shape verse_detail (ai.summaries inline)', fakeAsync(() => {
      seedRoute('al-kafi:1:1:1:1', legacyVerseDetail());
      dispatchSpy.calls.reset();
      prefs$.next({ ...DEFAULTS, wordByWordDefaultLang: 'fa' });
      tick(0);
      const retryCall = dispatchSpy.calls.allArgs().find(([action]) => action instanceof RetryLoadBookPart);
      expect(retryCall).toBeUndefined();
    }));

    it('dispatches RetryLoadBookPart when the active translation changes to a different AI lang', fakeAsync(() => {
      // wordByWord stays at 'en'; the user picks fa.ai from the Translation
      // dropdown — that changes the effective AI lang from 'en' to 'fa', so
      // the sister must refetch. (Bug fix: prior to #69 the listener only
      // watched wordByWordDefaultLang and missed this transition.)
      seedRoute('al-kafi:1:1:1:1', splitShapeVerseDetail());
      dispatchSpy.calls.reset();
      store.reset({
        ...store.snapshot(),
        myrouter: { ...store.snapshot().myrouter, translation: 'fa.ai' },
      });
      tick(0);
      const retryCall = dispatchSpy.calls.allArgs().find(([action]) => action instanceof RetryLoadBookPart);
      expect(retryCall).toBeDefined();
      expect((retryCall[0] as RetryLoadBookPart).payload).toBe('al-kafi:1:1:1:1');
    }));

    it('does NOT dispatch when active translation switches between human translators in the same lang', fakeAsync(() => {
      // en.qarai → en.sarwar: human translator change, effective AI lang stays 'en'.
      seedRoute('al-kafi:1:1:1:1', splitShapeVerseDetail());
      // Set initial translation to en.qarai
      store.reset({
        ...store.snapshot(),
        myrouter: { ...store.snapshot().myrouter, translation: 'en.qarai' },
      });
      tick(0);
      dispatchSpy.calls.reset();
      // Switch to en.sarwar — same AI lang fallback (wordByWord = 'en')
      store.reset({
        ...store.snapshot(),
        myrouter: { ...store.snapshot().myrouter, translation: 'en.sarwar' },
      });
      tick(0);
      const retryCall = dispatchSpy.calls.allArgs().find(([action]) => action instanceof RetryLoadBookPart);
      expect(retryCall).toBeUndefined();
    }));
  });
});
