import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { MilestoneToastService } from './milestone-toast.service';
import { BookmarkService } from './bookmark.service';
import { VerseCountsService } from './verse-counts.service';
import { environment } from '@env/environment';

const MANIFEST = {
  quran: { total: 100, by_chapter: { 'quran:1': 7, 'quran:2': 93 } },
  'al-kafi': { total: 50, by_chapter: { 'al-kafi:1:1:1': 50 } },
};

describe('MilestoneToastService', () => {
  let svc: MilestoneToastService;
  let bookmarks: BookmarkService;
  let counts: VerseCountsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    svc = TestBed.inject(MilestoneToastService);
    bookmarks = TestBed.inject(BookmarkService);
    counts = TestBed.inject(VerseCountsService);
    http = TestBed.inject(HttpTestingController);

    // Prime the verse-counts manifest
    counts.get().subscribe();
    http.expectOne(environment.apiBaseUrl + 'index/verse-counts.json').flush(MANIFEST);
    // The I18nService also fetches assets/i18n/en.json on init — drain it once
    // so http.verify() in afterEach passes. Send an empty payload; the service
    // falls back to keys (`reading.milestoneBookComplete` etc.) which works for
    // the assertions below (we just check kind, not exact title).
    const i18nReq = http.match(() => true);
    i18nReq.forEach(r => r.flush({}));
  });

  afterEach(async () => {
    await bookmarks.clearAll();
    // Drain any late HTTP requests (e.g. i18n locale switches)
    http.match(() => true).forEach(r => r.flush({}));
    http.verify();
  });

  /** Wait for the next state-change tick — needed because mark + emit chain is async. */
  async function flushMicrotasks(): Promise<void> {
    await new Promise<void>(r => setTimeout(r, 0));
  }

  it('baseline emission produces no toasts', async () => {
    svc.start();
    const t = await firstValueFrom(svc.toasts$);
    expect(t).toEqual([]);
  });

  it('emits a book-complete toast when verses read crosses total', async () => {
    svc.start();
    // Mark every verse in 'al-kafi:1:1:1' (50 verses) — that's the whole book
    const paths = Array.from({ length: 50 }, (_, i) => `/books/al-kafi:1:1:1:${i + 1}`);
    await bookmarks.markReadBulk(paths);
    await flushMicrotasks();

    const toasts = await firstValueFrom(svc.toasts$);
    const completes = toasts.filter(t => t.kind === 'book-complete');
    expect(completes.length).toBe(1);
  });

  it('emits cumulative milestones when crossing 10 / 50 / 100 thresholds', async () => {
    svc.start();
    // 7 ayat in quran:1 + 4 in quran:2 = 11 total, crosses the 10 threshold
    const all = [
      ...Array.from({ length: 7 }, (_, i) => `/books/quran:1:${i + 1}`),
      ...Array.from({ length: 4 }, (_, i) => `/books/quran:2:${i + 1}`),
    ];
    await bookmarks.markReadBulk(all);
    await flushMicrotasks();

    const toasts = await firstValueFrom(svc.toasts$);
    const cumulative = toasts.filter(t => t.kind === 'cumulative');
    expect(cumulative.length).toBeGreaterThanOrEqual(1);
  });

  it('dismiss removes the toast by id', () => {
    svc.push({ kind: 'cumulative', title: 'hi', durationMs: 0 });
    expect(svc['subject'].value.length).toBe(1);
    const id = svc['subject'].value[0].id;
    svc.dismiss(id);
    expect(svc['subject'].value.length).toBe(0);
  });

  it('auto-dismisses toasts after durationMs', (done) => {
    svc.push({ kind: 'cumulative', title: 'hi', durationMs: 50 });
    expect(svc['subject'].value.length).toBe(1);
    setTimeout(() => {
      expect(svc['subject'].value.length).toBe(0);
      done();
    }, 100);
  });

  it('does not auto-dismiss when durationMs is 0', (done) => {
    svc.push({ kind: 'cumulative', title: 'sticky', durationMs: 0 });
    setTimeout(() => {
      expect(svc['subject'].value.length).toBe(1);
      done();
    }, 50);
  });

  it('start is idempotent — multiple calls only subscribe once', async () => {
    svc.start();
    svc.start();
    svc.start();
    // No errors thrown is the test
    expect(svc['started']).toBeTrue();
  });
});
