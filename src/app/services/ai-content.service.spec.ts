import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AiContentService, TopicTaxonomy } from './ai-content.service';
import { environment } from '@env/environment';

describe('AiContentService', () => {
  let service: AiContentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AiContentService],
    });
    service = TestBed.inject(AiContentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load topics index', (done) => {
    const mockTopics: TopicTaxonomy = {
      theology: {
        tawhid: { count: 42, paths: ['/books/al-kafi:1:1:1:1'] },
      },
    };

    service.getTopics().subscribe(result => {
      expect(result).toEqual(mockTopics);
      done();
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}index/topics.json`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTopics);
  });

  it('should return null on topics load failure', (done) => {
    service.getTopics().subscribe(result => {
      expect(result).toBeNull();
      done();
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}index/topics.json`);
    req.error(new ProgressEvent('error'));
  });

  it('should cache topics on subsequent calls', (done) => {
    const mockTopics: TopicTaxonomy = { theology: {} };

    service.getTopics().subscribe();
    service.getTopics().subscribe(result => {
      expect(result).toEqual(mockTopics);
      done();
    });

    // Only one request should be made (cached via shareReplay)
    const req = httpMock.expectOne(`${environment.apiBaseUrl}index/topics.json`);
    req.flush(mockTopics);
  });

  it('should load phrases index', (done) => {
    const mockPhrases = {
      'بسم الله': { phrase_ar: 'بِسْمِ اللَّهِ', phrase_en: 'In the name of Allah', category: 'prophetic_formula', paths: ['/books/quran:1'] },
    };

    service.getPhrases().subscribe(result => {
      expect(result).toEqual(mockPhrases);
      done();
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}index/phrases.json`);
    req.flush(mockPhrases);
  });

  it('should check if topics are available', (done) => {
    service.hasTopics().subscribe(result => {
      expect(result).toBe(true);
      done();
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}index/topics.json`);
    req.flush({ theology: {} });
  });
});
