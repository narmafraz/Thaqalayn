import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Store } from '@ngxs/store';
import { VerseLoaderService } from './verse-loader.service';
import { BooksService } from './books.service';
import { AiPreferencesService, AiPreferences } from './ai-preferences.service';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { Book, Verse, VerseDetail } from '@app/models/book';

describe('VerseLoaderService', () => {
  let service: VerseLoaderService;
  let mockBooksService: jasmine.SpyObj<BooksService>;
  let prefsSubject: BehaviorSubject<AiPreferences>;
  let translationSubject: BehaviorSubject<string>;

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

  function makeDetail(verse: Verse): VerseDetail {
    return {
      kind: 'verse_detail',
      index: 'al-kafi:1:1:1:1',
      data: {
        verse,
        chapter_path: '/books/al-kafi:1:1:1',
        chapter_title: { en: 'Test' },
        nav: { prev: '', next: '', up: '' },
      },
    } as VerseDetail;
  }

  beforeEach(() => {
    mockBooksService = jasmine.createSpyObj('BooksService', ['getPart']);
    mockBooksService.getPart.and.returnValue(of(makeDetail(mockVerse) as Book));
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
      providers: [
        { provide: BooksService, useValue: mockBooksService },
        { provide: AiPreferencesService, useValue: { preferences$: prefsSubject.asObservable() } },
        { provide: Store, useValue: mockStore },
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
    // One call for the initial lang ('en'); cache reuses the observable for repeat lookups.
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

  // REGRESSION: chapter pages lazy-load verses through this service. When the
  // user picks a different AI translation from the dropdown on a chapter page,
  // the per-path cached observable must re-emit a fresh verse via a re-fetch
  // — otherwise rendered verses stay on the previous language until refresh.
  // (Bug reported against /books/al-kafi:4:2:5: translation dropdown change
  // didn't refetch the verse_detail files.)
  it('REGRESSION: re-emits a fresh verse when active translation lang changes', fakeAsync(() => {
    const enVerse = { ...mockVerse, text: ['en-arabic'] };
    const faVerse = { ...mockVerse, text: ['fa-arabic'] };
    mockBooksService.getPart.and.returnValues(
      of(makeDetail(enVerse) as Book),
      of(makeDetail(faVerse) as Book),
    );

    const emissions: Verse[] = [];
    service.loadVerse('/books/al-kafi:1:1:1:1').subscribe(v => emissions.push(v));
    tick();
    expect(emissions.length).toBe(1);
    expect(emissions[0].text).toEqual(['en-arabic']);

    // User picks fa.ai from the Translation dropdown — RouterState.getTranslation emits.
    translationSubject.next('fa.ai');
    tick();
    expect(emissions.length).toBe(2);
    expect(emissions[1].text).toEqual(['fa-arabic']);
    expect(mockBooksService.getPart).toHaveBeenCalledTimes(2);
  }));

  it('re-emits when wordByWordDefaultLang changes', fakeAsync(() => {
    mockBooksService.getPart.and.returnValues(
      of(makeDetail({ ...mockVerse, text: ['en'] }) as Book),
      of(makeDetail({ ...mockVerse, text: ['fa'] }) as Book),
    );
    const emissions: Verse[] = [];
    service.loadVerse('/books/al-kafi:1:1:1:1').subscribe(v => emissions.push(v));
    tick();
    prefsSubject.next({ ...prefsSubject.value, wordByWordDefaultLang: 'fa' });
    tick();
    expect(emissions.length).toBe(2);
    expect(mockBooksService.getPart).toHaveBeenCalledTimes(2);
  }));

  it('does NOT re-emit when active translation switches between human translators in the same lang', fakeAsync(() => {
    // en.qarai → en.sarwar both resolve to effective lang 'en'.
    translationSubject.next('en.qarai');
    const emissions: Verse[] = [];
    service.loadVerse('/books/al-kafi:1:1:1:1').subscribe(v => emissions.push(v));
    tick();
    const callsBefore = mockBooksService.getPart.calls.count();
    translationSubject.next('en.sarwar');
    tick();
    expect(mockBooksService.getPart.calls.count()).toBe(callsBefore);
  }));
});
