import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { VerseCountsService, VerseCountsManifest } from './verse-counts.service';
import { environment } from '@env/environment';

const FIXTURE: VerseCountsManifest = {
  quran: {
    total: 6236,
    by_chapter: {
      'quran:1': 7,
      'quran:2': 286,
      'quran:114': 6,
    },
  },
  'al-kafi': {
    total: 100,
    by_chapter: {
      'al-kafi:1:1:1': 36,
      'al-kafi:1:1:2': 24,
      'al-kafi:1:2:1': 40,
    },
  },
};

describe('VerseCountsService', () => {
  let service: VerseCountsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(VerseCountsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function flushFixture(): void {
    const req = http.expectOne(environment.apiBaseUrl + 'index/verse-counts.json');
    expect(req.request.method).toBe('GET');
    req.flush(FIXTURE);
  }

  it('fetches the manifest on first subscription and caches it', async () => {
    const a$ = service.get();
    const b$ = service.get();
    expect(a$).toBe(b$); // same observable reference (shareReplay)
    const aPromise = firstValueFrom(a$);
    const bPromise = firstValueFrom(b$);
    flushFixture();
    const [a, b] = await Promise.all([aPromise, bPromise]);
    expect(a).toEqual(FIXTURE);
    expect(b).toEqual(FIXTURE);
  });

  it('exposes the loaded manifest via snapshotSync after the fetch resolves', async () => {
    const p = firstValueFrom(service.get());
    flushFixture();
    await p;
    expect(service.snapshotSync()).toEqual(FIXTURE);
  });

  it('snapshotSync is empty before the fetch resolves', () => {
    expect(service.snapshotSync()).toEqual({});
  });

  it('returns an empty manifest when the HTTP call fails (no throw)', async () => {
    const p = firstValueFrom(service.get());
    const req = http.expectOne(environment.apiBaseUrl + 'index/verse-counts.json');
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    const m = await p;
    expect(m).toEqual({});
    expect(service.snapshotSync()).toEqual({});
  });

  it('totalFor returns the per-book total', async () => {
    const p = firstValueFrom(service.get());
    flushFixture();
    await p;
    expect(service.totalFor('quran')).toBe(6236);
    expect(service.totalFor('al-kafi')).toBe(100);
    expect(service.totalFor('nope')).toBe(0);
  });

  it('forChapter returns the per-chapter count', async () => {
    const p = firstValueFrom(service.get());
    flushFixture();
    await p;
    expect(service.forChapter('quran:1')).toBe(7);
    expect(service.forChapter('quran:2')).toBe(286);
    expect(service.forChapter('al-kafi:1:1:1')).toBe(36);
    expect(service.forChapter('al-kafi:9:9:9')).toBe(0);
    expect(service.forChapter('unknown:1')).toBe(0);
  });

  it('totalForPrefix sums counts under a chapter-tree prefix', async () => {
    const p = firstValueFrom(service.get());
    flushFixture();
    await p;
    // Whole book
    expect(service.totalForPrefix('al-kafi')).toBe(36 + 24 + 40);
    // Volume 1 (matches keys starting with `al-kafi:1:`)
    expect(service.totalForPrefix('al-kafi:1')).toBe(36 + 24 + 40);
    // Volume 1, Book 1 only
    expect(service.totalForPrefix('al-kafi:1:1')).toBe(36 + 24);
    // Specific chapter
    expect(service.totalForPrefix('al-kafi:1:1:1')).toBe(36);
    // Quran (top-level surahs)
    expect(service.totalForPrefix('quran')).toBe(7 + 286 + 6);
    // Unknown prefix
    expect(service.totalForPrefix('unknown:1')).toBe(0);
  });

  it('chapterIndexesForPrefix lists all chapter indexes under a prefix', async () => {
    const p = firstValueFrom(service.get());
    flushFixture();
    await p;
    expect(service.chapterIndexesForPrefix('al-kafi:1:1').sort()).toEqual([
      'al-kafi:1:1:1', 'al-kafi:1:1:2',
    ]);
    expect(service.chapterIndexesForPrefix('al-kafi').length).toBe(3);
    expect(service.chapterIndexesForPrefix('unknown')).toEqual([]);
  });
});
