import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { VerseLoaderService } from './verse-loader.service';
import { BooksService } from './books.service';
import { of } from 'rxjs';
import { Book, Verse, VerseDetail } from '@app/models/book';

describe('VerseLoaderService', () => {
  let service: VerseLoaderService;
  let mockBooksService: jasmine.SpyObj<BooksService>;

  const mockVerse: Verse = {
    index: 1,
    local_index: 1,
    path: '/books/al-kafi:1:1:1:1',
    text: ['Arabic text'],
    sajda_type: '',
    translations: { 'en.hubeali': ['English'] },
    part_type: 'Hadith',
    relations: {},
    narrator_chain: { parts: [], text: '' },
  };

  const mockVerseDetail: VerseDetail = {
    kind: 'verse_detail',
    index: 'al-kafi:1:1:1:1',
    data: {
      verse: mockVerse,
      chapter_path: '/books/al-kafi:1:1:1',
      chapter_title: { en: 'Test' },
      nav: { prev: '', next: '', up: '' },
    },
  };

  beforeEach(() => {
    mockBooksService = jasmine.createSpyObj('BooksService', ['getPart']);
    mockBooksService.getPart.and.returnValue(of(mockVerseDetail as Book));

    TestBed.configureTestingModule({
      providers: [
        { provide: BooksService, useValue: mockBooksService },
      ],
    });
    service = TestBed.inject(VerseLoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load a verse from verse_detail', fakeAsync(() => {
    let result: Verse | undefined;
    service.loadVerse('/books/al-kafi:1:1:1:1').subscribe(v => result = v);
    tick();
    expect(result).toEqual(mockVerse);
    expect(mockBooksService.getPart).toHaveBeenCalledWith('al-kafi:1:1:1:1');
  }));

  it('should cache subsequent requests for the same path', fakeAsync(() => {
    service.loadVerse('/books/al-kafi:1:1:1:1').subscribe();
    tick();
    service.loadVerse('/books/al-kafi:1:1:1:1').subscribe();
    tick();
    expect(mockBooksService.getPart).toHaveBeenCalledTimes(1);
  }));

  it('should clear cache', fakeAsync(() => {
    service.loadVerse('/books/al-kafi:1:1:1:1').subscribe();
    tick();
    service.clearCache();
    service.loadVerse('/books/al-kafi:1:1:1:1').subscribe();
    tick();
    expect(mockBooksService.getPart).toHaveBeenCalledTimes(2);
  }));
});
