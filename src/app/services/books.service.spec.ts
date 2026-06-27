import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NgxsModule, Store } from '@ngxs/store';
import { BooksService } from './books.service';
import { OfflineStorageService } from './offline-storage.service';
import { AiPreferencesService, AiPreferences } from './ai-preferences.service';
import { Book, Verse, VerseDetail } from '@app/models';
import { BehaviorSubject } from 'rxjs';

describe('BooksService', () => {
  let service: BooksService;
  let httpMock: HttpTestingController;
  let prefsSubject: BehaviorSubject<AiPreferences>;
  let translationSubject: BehaviorSubject<string>;

  const API_BASE = 'http://localhost:8888/';

  const mockOfflineStorage = {
    getPartFromBook: jasmine.createSpy('getPartFromBook').and.returnValue(Promise.resolve(null)),
    getCachedResponse: jasmine.createSpy('getCachedResponse').and.returnValue(Promise.resolve(null)),
    cacheResponse: jasmine.createSpy('cacheResponse').and.returnValue(Promise.resolve()),
  };

  beforeEach(() => {
    mockOfflineStorage.getPartFromBook.and.returnValue(Promise.resolve(null));
    mockOfflineStorage.getCachedResponse.and.returnValue(Promise.resolve(null));
    prefsSubject = new BehaviorSubject<AiPreferences>({
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
    });
    translationSubject = new BehaviorSubject<string>('');
    const mockStore = { select: () => translationSubject.asObservable() };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, NgxsModule.forRoot([])],
      providers: [
        { provide: OfflineStorageService, useValue: mockOfflineStorage },
        { provide: AiPreferencesService, useValue: { preferences$: prefsSubject.asObservable() } },
        { provide: Store, useValue: mockStore },
      ],
    });
    service = TestBed.inject(BooksService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getPart', () => {

    describe('URL construction', () => {

      it('should replace colons with slashes for al-kafi:1:2:3', fakeAsync(() => {
        const mockBook: Book = {
          kind: 'chapter_list',
          index: 'al-kafi:1:2:3',
          data: {} as any,
        };

        service.getPart('al-kafi:1:2:3').subscribe();
        tick(0); // resolve offline storage Promise

        const req = httpMock.expectOne(`${API_BASE}books/al-kafi/1/2/3.json`);
        expect(req.request.method).toBe('GET');
        req.flush(mockBook);
      }));

      it('should replace colons with slashes for quran:1', fakeAsync(() => {
        const mockBook: Book = {
          kind: 'verse_list',
          index: 'quran:1',
          data: {} as any,
        };

        service.getPart('quran:1').subscribe();
        tick(0);

        const req = httpMock.expectOne(`${API_BASE}books/quran/1.json`);
        expect(req.request.method).toBe('GET');
        req.flush(mockBook);
      }));

      it('should handle a single-segment index with no colons', fakeAsync(() => {
        const mockBook: Book = {
          kind: 'chapter_list',
          index: 'al-kafi',
          data: {} as any,
        };

        service.getPart('al-kafi').subscribe();
        tick(0);

        const req = httpMock.expectOne(`${API_BASE}books/al-kafi.json`);
        expect(req.request.method).toBe('GET');
        req.flush(mockBook);
      }));

      it('should handle deeply nested indices like al-kafi:1:2:3:4', fakeAsync(() => {
        const mockBook: Book = {
          kind: 'verse_content',
          index: 'al-kafi:1:2:3:4',
          data: {} as any,
        };

        service.getPart('al-kafi:1:2:3:4').subscribe();
        tick(0);

        const req = httpMock.expectOne(`${API_BASE}books/al-kafi/1/2/3/4.json`);
        expect(req.request.method).toBe('GET');
        req.flush(mockBook);
      }));

      it('should construct the correct URL for quran:114', fakeAsync(() => {
        service.getPart('quran:114').subscribe();
        tick(0);

        const req = httpMock.expectOne(`${API_BASE}books/quran/114.json`);
        expect(req.request.method).toBe('GET');
        req.flush({ kind: 'verse_list', index: 'quran:114', data: {} });
      }));
    });

    describe('successful responses', () => {

      it('should return a ChapterList book', fakeAsync(() => {
        const mockBook: Book = {
          kind: 'chapter_list',
          index: 'al-kafi:1',
          data: {
            index: 'al-kafi:1',
            local_index: '1',
            path: '/books/al-kafi:1',
            titles: { en: 'Book of Intellect', ar: '' },
            descriptions: { en: '', ar: '' },
            verse_count: 0,
            verse_start_index: 0,
            order: 1,
            rukus: 0,
            reveal_type: '',
            sajda_type: '',
            verses: [],
            chapters: [],
            part_type: 'book',
            nav: { prev: '', next: '/books/al-kafi:2', up: '/books/al-kafi' },
            verse_translations: [],
            default_verse_translation_ids: {},
          },
        };

        let receivedBook: Book | undefined;
        service.getPart('al-kafi:1').subscribe((book) => {
          receivedBook = book;
        });
        tick(0);

        const req = httpMock.expectOne(`${API_BASE}books/al-kafi/1.json`);
        req.flush(mockBook);

        expect(receivedBook).toEqual(mockBook);
        expect(receivedBook!.kind).toBe('chapter_list');
        expect(receivedBook!.index).toBe('al-kafi:1');
      }));

      it('should return a VerseContent book', fakeAsync(() => {
        const mockBook: Book = {
          kind: 'verse_content',
          index: 'al-kafi:1:1:1:1',
          data: {
            index: 1,
            local_index: 1,
            path: '/books/al-kafi:1:1:1:1',
            text: ['Some Arabic text'],
            sajda_type: '',
            translations: { 'en.sarwar': ['English translation'] },
            part_type: 'Hadith',
            relations: {},
            narrator_chain: { parts: [], text: '' },
          },
        };

        let receivedBook: Book | undefined;
        service.getPart('al-kafi:1:1:1:1').subscribe((book) => {
          receivedBook = book;
        });
        tick(0);

        const req = httpMock.expectOne(`${API_BASE}books/al-kafi/1/1/1/1.json`);
        req.flush(mockBook);

        expect(receivedBook).toEqual(mockBook);
        expect(receivedBook!.kind).toBe('verse_content');
      }));

      it('should return a verse_list book for a Quran surah', fakeAsync(() => {
        const mockBook: Book = {
          kind: 'verse_list',
          index: 'quran:1',
          data: {
            index: 'quran:1',
            local_index: '1',
            path: '/books/quran:1',
            titles: { en: 'Al-Fatiha', ar: 'الفاتحة' },
            descriptions: { en: 'The Opening', ar: '' },
            verse_count: 7,
            verse_start_index: 1,
            order: 5,
            rukus: 1,
            reveal_type: 'Meccan',
            sajda_type: '',
            verses: [],
            chapters: [],
            part_type: 'surah',
            nav: { prev: '', next: '/books/quran:2', up: '/books/quran' },
            verse_translations: ['en.qarai', 'en.sarwar'],
            default_verse_translation_ids: { en: 'en.qarai' },
          },
        };

        let receivedBook: Book | undefined;
        service.getPart('quran:1').subscribe((book) => {
          receivedBook = book;
        });
        tick(0);

        const req = httpMock.expectOne(`${API_BASE}books/quran/1.json`);
        req.flush(mockBook);

        expect(receivedBook).toEqual(mockBook);
        expect(receivedBook!.kind).toBe('verse_list');
        if (receivedBook!.kind === 'verse_list') {
          expect(receivedBook!.data.titles.ar).toBe('الفاتحة');
        }
      }));
    });

    describe('HTTP error handling', () => {

      it('should propagate a 404 error after retries', fakeAsync(() => {
        let receivedError: any;

        service.getPart('nonexistent:path').subscribe({
          next: () => fail('Expected an error, not a success'),
          error: (error) => { receivedError = error; },
        });
        tick(0); // resolve offline storage Promise

        // Initial request
        httpMock.expectOne(`${API_BASE}books/nonexistent/path.json`)
          .flush('Not Found', { status: 404, statusText: 'Not Found' });

        tick(1000);

        // First retry
        httpMock.expectOne(`${API_BASE}books/nonexistent/path.json`)
          .flush('Not Found', { status: 404, statusText: 'Not Found' });

        tick(1000);

        // Second retry
        httpMock.expectOne(`${API_BASE}books/nonexistent/path.json`)
          .flush('Not Found', { status: 404, statusText: 'Not Found' });

        expect(receivedError).toBeTruthy();
        expect(receivedError.status).toBe(404);
      }));

      it('should propagate a 500 error after retries', fakeAsync(() => {
        let receivedError: any;

        service.getPart('al-kafi:1').subscribe({
          next: () => fail('Expected an error, not a success'),
          error: (error) => { receivedError = error; },
        });
        tick(0);

        // Initial request
        httpMock.expectOne(`${API_BASE}books/al-kafi/1.json`)
          .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

        tick(1000);

        // First retry
        httpMock.expectOne(`${API_BASE}books/al-kafi/1.json`)
          .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

        tick(1000);

        // Second retry
        httpMock.expectOne(`${API_BASE}books/al-kafi/1.json`)
          .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

        expect(receivedError).toBeTruthy();
        expect(receivedError.status).toBe(500);
      }));

      it('should succeed if a retry succeeds after initial failure', fakeAsync(() => {
        const mockBook: Book = {
          kind: 'chapter_list',
          index: 'al-kafi:1',
          data: {} as any,
        };

        let receivedBook: Book | undefined;

        service.getPart('al-kafi:1').subscribe({
          next: (book) => { receivedBook = book; },
          error: () => fail('Expected success after retry'),
        });
        tick(0);

        // Initial request fails
        httpMock.expectOne(`${API_BASE}books/al-kafi/1.json`)
          .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

        tick(1000);

        // First retry succeeds
        httpMock.expectOne(`${API_BASE}books/al-kafi/1.json`)
          .flush(mockBook);

        expect(receivedBook).toEqual(mockBook);
      }));

      it('should propagate a network error after retries', fakeAsync(() => {
        let receivedError: any;

        service.getPart('al-kafi:1').subscribe({
          next: () => fail('Expected an error, not a success'),
          error: (error) => { receivedError = error; },
        });
        tick(0);

        const progressEvent = new ProgressEvent('error');

        // Initial request
        httpMock.expectOne(`${API_BASE}books/al-kafi/1.json`)
          .error(progressEvent);

        tick(1000);

        // First retry
        httpMock.expectOne(`${API_BASE}books/al-kafi/1.json`)
          .error(progressEvent);

        tick(1000);

        // Second retry
        httpMock.expectOne(`${API_BASE}books/al-kafi/1.json`)
          .error(progressEvent);

        expect(receivedError).toBeTruthy();
      }));
    });

    describe('request method', () => {

      it('should use HTTP GET method', fakeAsync(() => {
        service.getPart('quran:2').subscribe();
        tick(0);

        const req = httpMock.expectOne(`${API_BASE}books/quran/2.json`);
        expect(req.request.method).toBe('GET');
        req.flush({ kind: 'verse_list', index: 'quran:2', data: {} });
      }));
    });

    describe('per-language sister merge', () => {

      function detailWithSplitAi(): VerseDetail {
        return {
          kind: 'verse_detail',
          index: 'al-kafi:1:1:1:1',
          data: {
            verse: {
              index: 1, local_index: 1, path: '/books/al-kafi:1:1:1:1',
              text: ['arabic'], sajda_type: '',
              translations: {}, part_type: 'Hadith',
              relations: {}, narrator_chain: { parts: [], text: '' },
              ai: {
                key_terms_keys: ['العقل'],
                chunks: [{ chunk_type: 'body', arabic_text: 'foo', word_start: 0, word_end: 1 }],
              } as unknown as Verse['ai'],
            },
            chapter_path: '/books/al-kafi:1:1:1',
            chapter_title: { en: 'Test' },
            nav: { prev: '', next: '', up: '' },
          },
        } as VerseDetail;
      }

      it('skips sister fetch for non-verse_detail kinds', fakeAsync(() => {
        service.getPart('al-kafi:1').subscribe();
        tick(0);
        httpMock.expectOne(`${API_BASE}books/al-kafi/1.json`)
          .flush({ kind: 'chapter_list', index: 'al-kafi:1', data: {} });
        tick(0);
        httpMock.expectNone(req => req.url.includes('.en.json'));
      }));

      it('skips sister fetch when ai.summaries is inline (legacy shape)', fakeAsync(() => {
        service.getPart('al-kafi:1:1:1:1').subscribe();
        tick(0);
        const legacy: VerseDetail = {
          kind: 'verse_detail',
          index: 'al-kafi:1:1:1:1',
          data: {
            verse: { ...detailWithSplitAi().data.verse, ai: { summaries: { en: 'Inline' } } as unknown as Verse['ai'] },
            chapter_path: '/books/al-kafi:1:1:1',
            chapter_title: { en: 'Test' },
            nav: { prev: '', next: '', up: '' },
          },
        } as VerseDetail;
        httpMock.expectOne(`${API_BASE}books/al-kafi/1/1/1/1.json`).flush(legacy);
        tick(0);
        httpMock.expectNone(req => req.url.includes('.en.json'));
      }));

      it('fetches sister and merges per-lang fields into legacy shape (split base)', fakeAsync(() => {
        let receivedBook: Book | undefined;
        service.getPart('al-kafi:1:1:1:1').subscribe(b => receivedBook = b);
        tick(0);
        httpMock.expectOne(`${API_BASE}books/al-kafi/1/1/1/1.json`).flush(detailWithSplitAi());
        tick(0);
        httpMock.expectOne(`${API_BASE}books/al-kafi/1/1/1/1.en.json`).flush({
          lang: 'en',
          path: '/books/al-kafi:1:1:1:1',
          ai: {
            summary: 'EN summary',
            seo_question: 'EN seo?',
            chunks: ['foo-en'],
            key_terms: { 'العقل': 'intellect' },
          },
        });
        tick(0);
        const ai = (receivedBook as VerseDetail).data.verse.ai as unknown as Record<string, unknown>;
        expect((ai['summaries'] as Record<string, string>)['en']).toBe('EN summary');
        expect((ai['seo_questions'] as Record<string, string>)['en']).toBe('EN seo?');
        const chunks = ai['chunks'] as Array<Record<string, unknown>>;
        expect((chunks[0]['translations'] as Record<string, string>)['en']).toBe('foo-en');
      }));

      it('returns base verse unchanged when sister 404s', fakeAsync(() => {
        let receivedBook: Book | undefined;
        service.getPart('al-kafi:1:1:1:1').subscribe(b => receivedBook = b);
        tick(0);
        httpMock.expectOne(`${API_BASE}books/al-kafi/1/1/1/1.json`).flush(detailWithSplitAi());
        tick(0);
        httpMock.expectOne(`${API_BASE}books/al-kafi/1/1/1/1.en.json`)
          .flush('', { status: 404, statusText: 'Not Found' });
        tick(0);
        const ai = (receivedBook as VerseDetail).data.verse.ai as unknown as Record<string, unknown>;
        expect(ai['summaries']).toBeUndefined();
      }));

      it('completes after first emission (terminating observable for NGXS resolver)', fakeAsync(() => {
        let completed = false;
        service.getPart('al-kafi:1:1:1:1').subscribe({ complete: () => { completed = true; } });
        tick(0);
        httpMock.expectOne(`${API_BASE}books/al-kafi/1/1/1/1.json`).flush(detailWithSplitAi());
        tick(0);
        httpMock.expectOne(`${API_BASE}books/al-kafi/1/1/1/1.en.json`).flush({
          lang: 'en', path: '/books/al-kafi:1:1:1:1', ai: { summary: 'EN summary' },
        });
        tick(0);
        expect(completed).toBe(true);
      }));

      it('uses the active lang at fetch time on each call', fakeAsync(() => {
        // Switch lang before fetch; the next getPart call should target the new sister
        prefsSubject.next({ ...prefsSubject.value, wordByWordDefaultLang: 'fa' });

        service.getPart('al-kafi:1:1:1:1').subscribe();
        tick(0);
        httpMock.expectOne(`${API_BASE}books/al-kafi/1/1/1/1.json`).flush(detailWithSplitAi());
        tick(0);
        httpMock.expectOne(`${API_BASE}books/al-kafi/1/1/1/1.fa.json`).flush({
          lang: 'fa', path: '/books/al-kafi:1:1:1:1', ai: { summary: 'FA summary' },
        });
        tick(0);
        httpMock.expectNone(req => req.url.endsWith('.en.json'));
      }));

      it('active AI translation overrides wordByWord when picking the sister', fakeAsync(() => {
        // wordByWord = en (default), but user selected fa.ai from the Translation
        // dropdown. The sister fetch must follow the active translation lang,
        // otherwise rendering reads ai.summaries[fa] which is empty.
        translationSubject.next('fa.ai');

        service.getPart('al-kafi:1:1:1:1').subscribe();
        tick(0);
        httpMock.expectOne(`${API_BASE}books/al-kafi/1/1/1/1.json`).flush(detailWithSplitAi());
        tick(0);
        httpMock.expectOne(`${API_BASE}books/al-kafi/1/1/1/1.fa.json`).flush({
          lang: 'fa', path: '/books/al-kafi:1:1:1:1', ai: { summary: 'FA summary' },
        });
        tick(0);
        httpMock.expectNone(req => req.url.endsWith('.en.json'));
      }));

      it('human translation falls through to wordByWord lang', fakeAsync(() => {
        // en.qarai is a human translator, not an AI one. The sister should use
        // the wordByWord pref (en) for the AI summary / key_terms / etc.
        translationSubject.next('en.qarai');

        service.getPart('al-kafi:1:1:1:1').subscribe();
        tick(0);
        httpMock.expectOne(`${API_BASE}books/al-kafi/1/1/1/1.json`).flush(detailWithSplitAi());
        tick(0);
        httpMock.expectOne(`${API_BASE}books/al-kafi/1/1/1/1.en.json`).flush({
          lang: 'en', path: '/books/al-kafi:1:1:1:1', ai: { summary: 'EN summary' },
        });
        tick(0);
        httpMock.expectNone(req => req.url.endsWith('.fa.json'));
      }));
    });
  });
});
