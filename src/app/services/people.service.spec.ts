import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PeopleService } from './people.service';
import { NarratorWrapper } from '@app/models';

describe('PeopleService', () => {
  let service: PeopleService;
  let httpMock: HttpTestingController;

  const API_BASE = 'http://localhost:8888/';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(PeopleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getNarrator', () => {

    describe('URL construction', () => {

      it('should construct the correct URL for narrator index "index"', () => {
        service.getNarrator('index').subscribe();

        const req = httpMock.expectOne(`${API_BASE}people/narrators/index.json`);
        expect(req.request.method).toBe('GET');
        req.flush({ kind: 'person_list', index: 'index', data: {} });
      });

      it('should construct the correct URL for a numeric narrator ID', () => {
        service.getNarrator('42').subscribe();

        const req = httpMock.expectOne(`${API_BASE}people/narrators/42.json`);
        expect(req.request.method).toBe('GET');
        req.flush({ kind: 'person_content', index: '42', data: {} });
      });

      it('should construct the correct URL for narrator ID "1"', () => {
        service.getNarrator('1').subscribe();

        const req = httpMock.expectOne(`${API_BASE}people/narrators/1.json`);
        expect(req.request.method).toBe('GET');
        req.flush({ kind: 'person_content', index: '1', data: {} });
      });

      it('should construct the correct URL for a large narrator ID', () => {
        service.getNarrator('9999').subscribe();

        const req = httpMock.expectOne(`${API_BASE}people/narrators/9999.json`);
        expect(req.request.method).toBe('GET');
        req.flush({ kind: 'person_content', index: '9999', data: {} });
      });
    });

    describe('successful responses', () => {

      it('should return a NarratorList (person_list) for the index', (done: DoneFn) => {
        const mockNarratorList: NarratorWrapper = {
          kind: 'person_list',
          index: 'index',
          data: {
            1: {
              index: '1',
              titles: { en: 'Muhammad ibn Ya\'qub al-Kulayni', ar: 'محمد بن يعقوب الكليني' },
              narrations: 150,
              narrated_from: 10,
              narrated_to: 5,
              conarrators: 20,
            },
            2: {
              index: '2',
              titles: { en: 'Ali ibn Ibrahim', ar: 'علي بن إبراهيم' },
              narrations: 200,
              narrated_from: 15,
              narrated_to: 8,
              conarrators: 30,
            },
          },
        };

        service.getNarrator('index').subscribe((result) => {
          expect(result).toEqual(mockNarratorList);
          expect(result.kind).toBe('person_list');
          expect(result.index).toBe('index');
          done();
        });

        const req = httpMock.expectOne(`${API_BASE}people/narrators/index.json`);
        req.flush(mockNarratorList);
      });

      it('should return a NarratorContent (person_content) for a specific narrator', (done: DoneFn) => {
        const mockNarrator: NarratorWrapper = {
          kind: 'person_content',
          index: '42',
          data: {
            index: '42',
            path: '/people/narrators/42',
            titles: { en: 'Ali ibn Ibrahim', ar: 'علي بن إبراهيم' },
            descriptions: { en: 'A prominent narrator', ar: '' },
            verse_paths: [
              '/books/al-kafi:1:1:1:1',
              '/books/al-kafi:1:1:1:2',
              '/books/al-kafi:1:1:2:1',
            ],
            subchains: {
              'from-1': {
                narrator_ids: [1, 42],
                verse_paths: ['/books/al-kafi:1:1:1:1'],
              },
            },
          },
        };

        service.getNarrator('42').subscribe((result) => {
          expect(result).toEqual(mockNarrator);
          expect(result.kind).toBe('person_content');
          expect(result.index).toBe('42');
          if (result.kind === 'person_content') {
            expect(result.data.titles.ar).toBe('علي بن إبراهيم');
            expect(result.data.verse_paths.length).toBe(3);
          }
          done();
        });

        const req = httpMock.expectOne(`${API_BASE}people/narrators/42.json`);
        req.flush(mockNarrator);
      });

      it('should return a NarratorContent with biography data', (done: DoneFn) => {
        const mockNarrator: NarratorWrapper = {
          kind: 'person_content',
          index: '7',
          data: {
            index: '7',
            path: '/people/narrators/7',
            titles: { en: 'Zurara ibn A\'yan', ar: 'زرارة بن أعين' },
            descriptions: { en: '', ar: '' },
            verse_paths: ['/books/al-kafi:1:1:1:3'],
            subchains: {},
            biography: {
              death_date: '150 AH',
              era: 'Early Islamic',
              reliability: 'Thiqah (Trustworthy)',
              teachers: ['Imam al-Baqir', 'Imam al-Sadiq'],
              students: ['Hisham ibn al-Hakam'],
              biography_summary: 'One of the foremost companions of Imam al-Baqir and Imam al-Sadiq.',
            },
          },
        };

        service.getNarrator('7').subscribe((result) => {
          expect(result).toEqual(mockNarrator);
          if (result.kind === 'person_content') {
            expect(result.data.biography).toBeTruthy();
            expect(result.data.biography!.reliability).toBe('Thiqah (Trustworthy)');
            expect(result.data.biography!.teachers!.length).toBe(2);
          }
          done();
        });

        const req = httpMock.expectOne(`${API_BASE}people/narrators/7.json`);
        req.flush(mockNarrator);
      });
    });

    describe('HTTP error handling', () => {

      it('should propagate a 404 error after retries', fakeAsync(() => {
        let receivedError: any;

        service.getNarrator('99999').subscribe({
          next: () => fail('Expected an error, not a success'),
          error: (error) => { receivedError = error; },
        });

        // Initial request
        httpMock.expectOne(`${API_BASE}people/narrators/99999.json`)
          .flush('Not Found', { status: 404, statusText: 'Not Found' });

        tick(1000);

        // First retry
        httpMock.expectOne(`${API_BASE}people/narrators/99999.json`)
          .flush('Not Found', { status: 404, statusText: 'Not Found' });

        tick(1000);

        // Second retry
        httpMock.expectOne(`${API_BASE}people/narrators/99999.json`)
          .flush('Not Found', { status: 404, statusText: 'Not Found' });

        expect(receivedError).toBeTruthy();
        expect(receivedError.status).toBe(404);
      }));

      it('should propagate a 500 error after retries', fakeAsync(() => {
        let receivedError: any;

        service.getNarrator('1').subscribe({
          next: () => fail('Expected an error, not a success'),
          error: (error) => { receivedError = error; },
        });

        // Initial request
        httpMock.expectOne(`${API_BASE}people/narrators/1.json`)
          .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

        tick(1000);

        // First retry
        httpMock.expectOne(`${API_BASE}people/narrators/1.json`)
          .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

        tick(1000);

        // Second retry
        httpMock.expectOne(`${API_BASE}people/narrators/1.json`)
          .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

        expect(receivedError).toBeTruthy();
        expect(receivedError.status).toBe(500);
      }));

      it('should succeed if a retry succeeds after initial failure', fakeAsync(() => {
        const mockNarrator: NarratorWrapper = {
          kind: 'person_content',
          index: '1',
          data: {
            index: '1',
            path: '/people/narrators/1',
            titles: { en: 'Test Narrator', ar: '' },
            descriptions: { en: '', ar: '' },
            verse_paths: [],
            subchains: {},
          },
        };

        let receivedResult: NarratorWrapper | undefined;

        service.getNarrator('1').subscribe({
          next: (result) => { receivedResult = result; },
          error: () => fail('Expected success after retry'),
        });

        // Initial request fails
        httpMock.expectOne(`${API_BASE}people/narrators/1.json`)
          .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

        tick(1000);

        // First retry succeeds
        httpMock.expectOne(`${API_BASE}people/narrators/1.json`)
          .flush(mockNarrator);

        expect(receivedResult).toEqual(mockNarrator);
      }));

      it('should propagate a network error after retries', fakeAsync(() => {
        let receivedError: any;

        service.getNarrator('1').subscribe({
          next: () => fail('Expected an error, not a success'),
          error: (error) => { receivedError = error; },
        });

        const progressEvent = new ProgressEvent('error');

        // Initial request
        httpMock.expectOne(`${API_BASE}people/narrators/1.json`)
          .error(progressEvent);

        tick(1000);

        // First retry
        httpMock.expectOne(`${API_BASE}people/narrators/1.json`)
          .error(progressEvent);

        tick(1000);

        // Second retry
        httpMock.expectOne(`${API_BASE}people/narrators/1.json`)
          .error(progressEvent);

        expect(receivedError).toBeTruthy();
      }));
    });

    describe('request method', () => {

      it('should use HTTP GET method', () => {
        service.getNarrator('5').subscribe();

        const req = httpMock.expectOne(`${API_BASE}people/narrators/5.json`);
        expect(req.request.method).toBe('GET');
        req.flush({ kind: 'person_content', index: '5', data: {} });
      });
    });
  });
});
