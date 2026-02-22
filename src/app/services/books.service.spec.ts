import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BooksService } from './books.service';
import { OfflineStorageService } from './offline-storage.service';
import { Book } from '@app/models';

describe('BooksService', () => {
  let service: BooksService;
  let httpMock: HttpTestingController;

  const API_BASE = 'http://localhost:8888/';

  const mockOfflineStorage = {
    getPartFromBook: jasmine.createSpy('getPartFromBook').and.returnValue(Promise.resolve(null)),
    getCachedResponse: jasmine.createSpy('getCachedResponse').and.returnValue(Promise.resolve(null)),
    cacheResponse: jasmine.createSpy('cacheResponse').and.returnValue(Promise.resolve()),
  };

  beforeEach(() => {
    mockOfflineStorage.getPartFromBook.and.returnValue(Promise.resolve(null));
    mockOfflineStorage.getCachedResponse.and.returnValue(Promise.resolve(null));

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: OfflineStorageService, useValue: mockOfflineStorage },
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
  });
});
