import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { BookmarkService } from './bookmark.service';
import { VerseCountsService } from './verse-counts.service';
import { ReadingStatsService } from './reading-stats.service';
import { environment } from '@env/environment';

const MANIFEST = {
  quran: { total: 100, by_chapter: { 'quran:1': 7, 'quran:2': 93 } },
  'al-kafi': { total: 50, by_chapter: { 'al-kafi:1:1:1': 20, 'al-kafi:1:1:2': 30 } },
};

describe('ReadingStatsService', () => {
  let stats: ReadingStatsService;
  let bookmarks: BookmarkService;
  let counts: VerseCountsService;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    bookmarks = TestBed.inject(BookmarkService);
    counts = TestBed.inject(VerseCountsService);
    stats = TestBed.inject(ReadingStatsService);
    http = TestBed.inject(HttpTestingController);

    // Prime the verse-counts manifest
    counts.get().subscribe();
    const req = http.expectOne(environment.apiBaseUrl + 'index/verse-counts.json');
    req.flush(MANIFEST);
  });

  afterEach(async () => {
    await bookmarks.clearAll();
    http.verify();
  });

  describe('bookProgressMap$', () => {
    it('reports zero progress for every book in the manifest before any reads', async () => {
      const m = await firstValueFrom(stats.bookProgressMap$);
      expect(m.size).toBe(2);
      const quran = m.get('quran')!;
      expect(quran.total).toBe(100);
      expect(quran.versesRead).toBe(0);
      expect(quran.percent).toBe(0);
      expect(quran.firstReadAt).toBeNull();
    });

    it('reflects per-book read counts and percent', async () => {
      await bookmarks.markRead('/books/quran:1:1');
      await bookmarks.markRead('/books/quran:1:2');
      await bookmarks.markRead('/books/quran:1:3');
      await bookmarks.markRead('/books/al-kafi:1:1:1:1');

      const m = await firstValueFrom(stats.bookProgressMap$);
      const quran = m.get('quran')!;
      const kafi = m.get('al-kafi')!;

      expect(quran.versesRead).toBe(3);
      expect(quran.total).toBe(100);
      expect(quran.percent).toBe(3);
      expect(quran.fraction).toBeCloseTo(0.03, 5);
      expect(quran.firstReadAt).toBeInstanceOf(Date);
      expect(quran.lastReadVerseAt).toBeInstanceOf(Date);

      expect(kafi.versesRead).toBe(1);
      expect(kafi.percent).toBe(2);
    });

    it('clamps progress at 1.0 even if reads exceed total (defensive)', async () => {
      // Manually push more reads than the manifest says exist
      await bookmarks.markReadBulk(Array.from({ length: 60 }, (_, i) => `/books/al-kafi:1:1:1:${i + 1}`));
      const m = await firstValueFrom(stats.bookProgressMap$);
      const kafi = m.get('al-kafi')!;
      expect(kafi.fraction).toBe(1);
      expect(kafi.percent).toBe(100);
    });
  });

  describe('buildChapterReadCounts', () => {
    it('rolls verse paths up to chapter index counts', () => {
      const reads = [
        { id: 1, path: '/books/al-kafi:1:1:1:1', bookId: 'al-kafi', readAt: new Date(), source: 'auto' as const },
        { id: 2, path: '/books/al-kafi:1:1:1:2', bookId: 'al-kafi', readAt: new Date(), source: 'auto' as const },
        { id: 3, path: '/books/al-kafi:1:1:2:1', bookId: 'al-kafi', readAt: new Date(), source: 'auto' as const },
        { id: 4, path: '/books/quran:1:1', bookId: 'quran', readAt: new Date(), source: 'auto' as const },
      ];
      const m = stats.buildChapterReadCounts(reads);
      expect(m.get('al-kafi:1:1:1')).toBe(2);
      expect(m.get('al-kafi:1:1:2')).toBe(1);
      expect(m.get('quran:1')).toBe(1);
    });

    it('ignores paths with no colon segment', () => {
      const m = stats.buildChapterReadCounts([
        { id: 1, path: '/books/quran', bookId: 'quran', readAt: new Date(), source: 'auto' as const },
      ]);
      expect(m.size).toBe(0);
    });
  });

  describe('versesReadToday$', () => {
    it('counts only reads with today\'s date', async () => {
      await bookmarks.markRead('/books/quran:1:1');
      const n = await firstValueFrom(stats.versesReadToday$);
      expect(n).toBe(1);
    });
  });

  describe('streak$', () => {
    function isoDays(daysAgo: number[]): Date[] {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      return daysAgo.map(d => new Date(today.getTime() - d * 86_400_000));
    }

    async function seedReadsOnDays(daysAgo: number[]): Promise<void> {
      // Use the Dexie table directly to control readAt — markRead always uses now().
      const db = (bookmarks as any).db;
      let id = 1;
      for (const date of isoDays(daysAgo)) {
        await db.readVerses.add({
          path: `/books/quran:1:${id}`,
          bookId: 'quran',
          readAt: date,
          source: 'auto',
        });
        id++;
      }
      // Force the subject to re-emit
      await (bookmarks as any).refreshReadVerses();
    }

    it('reports 0 when there are no reads', async () => {
      const s = await firstValueFrom(stats.streak$);
      expect(s.current).toBe(0);
      expect(s.longest).toBe(0);
    });

    it('reports current=3, longest=3 for three consecutive days ending today', async () => {
      await seedReadsOnDays([0, 1, 2]);
      const s = await firstValueFrom(stats.streak$);
      expect(s.current).toBe(3);
      expect(s.longest).toBe(3);
      expect(s.includesToday).toBeTrue();
    });

    it('allows one freeze day in the current streak', async () => {
      // Today + day -2 + day -3 (gap on -1)
      await seedReadsOnDays([0, 2, 3]);
      const s = await firstValueFrom(stats.streak$);
      // Walk: today ✓ (1), -1 missing (freeze, no count), -2 ✓ (2), -3 ✓ (3)
      expect(s.current).toBe(3);
    });

    it('breaks when two consecutive days are missing', async () => {
      // Today + day -3 (two-day gap, freeze only covers one)
      await seedReadsOnDays([0, 3]);
      const s = await firstValueFrom(stats.streak$);
      expect(s.current).toBe(1);
    });

    it('includesToday is false when only past days are present', async () => {
      await seedReadsOnDays([1, 2]);
      const s = await firstValueFrom(stats.streak$);
      expect(s.includesToday).toBeFalse();
      // Still alive thanks to freeze rule
      expect(s.current).toBeGreaterThanOrEqual(2);
    });

    it('longest reflects the all-time best uninterrupted run', async () => {
      // Two runs: 5 days long ago, 2 days recent
      await seedReadsOnDays([0, 1, 10, 11, 12, 13, 14]);
      const s = await firstValueFrom(stats.streak$);
      expect(s.longest).toBe(5);
    });
  });

  describe('goalProgress$', () => {
    it('emits target=0 when no goal is configured', async () => {
      const g = await firstValueFrom(stats.goalProgress$);
      expect(g.target).toBe(0);
      expect(g.fraction).toBe(0);
    });

    it('reports today/target fraction with target set', async () => {
      await bookmarks.setGoalConfig(5);
      await bookmarks.markRead('/books/quran:1:1');
      await bookmarks.markRead('/books/quran:1:2');
      const g = await firstValueFrom(stats.goalProgress$);
      expect(g.target).toBe(5);
      expect(g.today).toBe(2);
      expect(g.fraction).toBeCloseTo(0.4, 5);
    });

    it('clamps fraction at 1.0 when over goal', async () => {
      await bookmarks.setGoalConfig(2);
      await bookmarks.markReadBulk(['/books/quran:1:1', '/books/quran:1:2', '/books/quran:1:3', '/books/quran:1:4']);
      const g = await firstValueFrom(stats.goalProgress$);
      expect(g.fraction).toBe(1);
    });
  });

  describe('milestone computation', () => {
    it('overallMilestonesGained returns thresholds crossed by a delta', () => {
      expect(stats.overallMilestonesGained(0, 9)).toEqual([]);
      expect(stats.overallMilestonesGained(0, 10).map(e => (e as any).threshold)).toEqual([10]);
      expect(stats.overallMilestonesGained(9, 105).map(e => (e as any).threshold)).toEqual([10, 50, 100]);
      expect(stats.overallMilestonesGained(99, 100).map(e => (e as any).threshold)).toEqual([100]);
      expect(stats.overallMilestonesGained(100, 100)).toEqual([]);
    });

    it('computeMilestonesGained emits book-complete when versesRead crosses total', () => {
      const prev = { bookId: 'quran', versesRead: 99, total: 100, fraction: 0.99, percent: 99, firstReadAt: new Date(), lastReadVerseAt: new Date() };
      const next = { bookId: 'quran', versesRead: 100, total: 100, fraction: 1, percent: 100, firstReadAt: new Date(), lastReadVerseAt: new Date() };
      const events = stats.computeMilestonesGained(prev, next);
      expect(events.length).toBe(1);
      expect(events[0].kind).toBe('book-complete');
    });

    it('does not emit book-complete twice', () => {
      const prev = { bookId: 'quran', versesRead: 100, total: 100, fraction: 1, percent: 100, firstReadAt: new Date(), lastReadVerseAt: new Date() };
      const next = { bookId: 'quran', versesRead: 100, total: 100, fraction: 1, percent: 100, firstReadAt: new Date(), lastReadVerseAt: new Date() };
      expect(stats.computeMilestonesGained(prev, next)).toEqual([]);
    });

    it('emits book-complete the first time we cross from no-progress to complete', () => {
      const next = { bookId: 'mini', versesRead: 5, total: 5, fraction: 1, percent: 100, firstReadAt: new Date(), lastReadVerseAt: new Date() };
      const events = stats.computeMilestonesGained(undefined, next);
      expect(events.length).toBe(1);
      expect(events[0].kind).toBe('book-complete');
    });
  });

  describe('readPathSetForBook', () => {
    it('returns the set of paths read in a given book', async () => {
      await bookmarks.markRead('/books/quran:1:1');
      await bookmarks.markRead('/books/quran:1:2');
      await bookmarks.markRead('/books/al-kafi:1:1:1:1');
      const s = await stats.readPathSetForBook('quran');
      expect(s.has('/books/quran:1:1')).toBeTrue();
      expect(s.has('/books/quran:1:2')).toBeTrue();
      expect(s.has('/books/al-kafi:1:1:1:1')).toBeFalse();
      expect(s.size).toBe(2);
    });
  });

  // RE-14: revisit suggestions
  describe('revisitCandidates', () => {
    async function seedBookmarkOnDate(path: string, title: string, daysAgo: number): Promise<void> {
      const date = new Date(Date.now() - daysAgo * 86_400_000);
      const db = (bookmarks as any).db;
      await db.bookmarks.add({
        path, title, bookId: path.replace('/books/', '').split(':')[0],
        createdAt: date,
      });
      await (bookmarks as any).refreshBookmarks();
    }

    it('returns [] when there are no bookmarks', async () => {
      expect(await stats.revisitCandidates()).toEqual([]);
    });

    it('orders oldest-first', async () => {
      await seedBookmarkOnDate('/books/quran:1:1', 'a', 5);
      await seedBookmarkOnDate('/books/quran:2:1', 'b', 30);
      await seedBookmarkOnDate('/books/quran:3:1', 'c', 10);

      const cands = await stats.revisitCandidates(10, 3);

      expect(cands.length).toBe(3);
      expect(cands[0].bookmark.title).toBe('b'); // 30 days ago
      expect(cands[1].bookmark.title).toBe('c'); // 10 days
      expect(cands[2].bookmark.title).toBe('a'); // 5 days
      expect(cands[0].daysSinceLastSeen).toBeGreaterThanOrEqual(29);
    });

    it('respects the limit', async () => {
      for (let i = 0; i < 5; i++) {
        await seedBookmarkOnDate(`/books/quran:${i + 1}:1`, `b${i}`, 10 + i);
      }
      const cands = await stats.revisitCandidates(2, 3);
      expect(cands.length).toBe(2);
    });

    it('filters out fresh bookmarks below minAgeDays', async () => {
      await seedBookmarkOnDate('/books/quran:1:1', 'fresh', 1);
      await seedBookmarkOnDate('/books/quran:2:1', 'old', 20);

      const cands = await stats.revisitCandidates(10, 3);

      expect(cands.length).toBe(1);
      expect(cands[0].bookmark.title).toBe('old');
    });

    it('uses recent read marks to push a bookmark to the back', async () => {
      await seedBookmarkOnDate('/books/quran:1:1', 'oldButRead', 30);
      await seedBookmarkOnDate('/books/quran:2:1', 'oldUnread', 20);

      // Mark the older one as read just now
      await bookmarks.markRead('/books/quran:1:1');

      const cands = await stats.revisitCandidates(10, 3);

      // The unread one should be surfaced first, even though it's "newer"
      expect(cands[0].bookmark.title).toBe('oldUnread');
      // The recently-read one might be filtered out entirely (since it was
      // "seen" just now — under the 3-day floor), but if both pass the floor
      // it must be after the older-unread one.
      if (cands.length > 1) {
        expect(cands.find(c => c.bookmark.title === 'oldButRead')).toBeDefined();
      }
    });
  });
});
