import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map, of, switchMap, take } from 'rxjs';

import { Bookmark, BookmarkService, ReadVerse } from './bookmark.service';
import { VerseCountsService } from './verse-counts.service';

/** Per-book progress summary, ready for binding. */
export interface BookProgress {
  bookId: string;
  versesRead: number;
  total: number;
  /** 0..1 — clamped, NaN-safe when `total` is 0. */
  fraction: number;
  /** Round-tripped percent (0..100, one decimal). */
  percent: number;
  firstReadAt: Date | null;
  lastReadVerseAt: Date | null;
}

/** A reading "day" — used for streak math and history grouping. */
export interface DailyReadingTally {
  /** Local-date ISO string, `YYYY-MM-DD`. */
  date: string;
  versesRead: number;
  bookIds: string[];
}

/** RE-14: a bookmark suggested for revisit, with its "last seen" timestamp. */
export interface RevisitCandidate {
  bookmark: Bookmark;
  /** max(createdAt, lastReadAtForSamePath). */
  lastSeen: Date;
  /** Days since lastSeen — used by the UI to surface the "X days ago" hint. */
  daysSinceLastSeen: number;
}

/** Result of a streak computation. */
export interface StreakInfo {
  /** Current consecutive-day streak including today (0 if no read today and no freeze available). */
  current: number;
  /** Longest historical streak we've observed. */
  longest: number;
  /** Whether the streak includes today (false ⇒ user needs to read to keep it alive). */
  includesToday: boolean;
}

/**
 * Derived reading-progress stats. Composes the raw {@link BookmarkService.readVerses$}
 * stream and the {@link VerseCountsService} manifest into shapes the UI binds to:
 * per-book completion, per-chapter counts read, daily tallies, streaks, daily-goal
 * progress, milestone deltas.
 *
 * No state is owned here — this service is purely a projection over the two upstreams.
 */
@Injectable({ providedIn: 'root' })
export class ReadingStatsService {
  private bookmarks = inject(BookmarkService);
  private counts = inject(VerseCountsService);

  /** Map of bookId → BookProgress, recomputed whenever read-verses or manifest change. */
  bookProgressMap$: Observable<Map<string, BookProgress>> = this.counts.get().pipe(
    switchMap(manifest => this.bookmarks.readVerses$.pipe(
      map(readVerses => this.buildBookProgressMap(readVerses, manifest)),
    )),
  );

  /** All books with at least one read verse, sorted by lastReadVerseAt desc. */
  readBooksRecent$: Observable<BookProgress[]> = this.bookProgressMap$.pipe(
    map(m => Array.from(m.values())
      .filter(p => p.versesRead > 0)
      .sort((a, b) => (b.lastReadVerseAt?.getTime() ?? 0) - (a.lastReadVerseAt?.getTime() ?? 0))),
  );

  /** Verses read today (across all books). Streams. */
  versesReadToday$: Observable<number> = this.bookmarks.readVerses$.pipe(
    map(rv => this.countOnDay(rv, this.todayKey())),
  );

  /** Daily tallies, newest first, used by the history page and streak computation. */
  dailyTallies$: Observable<DailyReadingTally[]> = this.bookmarks.readVerses$.pipe(
    map(rv => this.buildDailyTallies(rv)),
  );

  /** Streak info derived from daily tallies. Forgiving: one missed day per 7-day window is allowed. */
  streak$: Observable<StreakInfo> = this.dailyTallies$.pipe(
    map(tallies => this.computeStreak(tallies)),
  );

  /** Combined goal progress: {target, today, fraction}. `target = 0` ⇒ goal disabled. */
  goalProgress$: Observable<{ target: number; today: number; fraction: number }> = combineLatest([
    this.bookmarks.goalConfig$,
    this.versesReadToday$,
  ]).pipe(
    map(([cfg, today]) => {
      const target = cfg?.dailyVerseTarget ?? 0;
      const fraction = target > 0 ? Math.min(1, today / target) : 0;
      return { target, today, fraction };
    }),
  );

  /** Snapshot of read-paths for one book, useful for synchronous verse-card styling decisions. */
  async readPathSetForBook(bookId: string): Promise<Set<string>> {
    const rv = await this.bookmarks.getReadVersesForBook(bookId);
    return new Set(rv.map(r => r.path));
  }

  /**
   * RE-15: take a list of chapter paths and annotate each with the user's
   * read fraction so the caller can sort / fade / filter accordingly.
   * Used by chapter-content to highlight related chapters the user hasn't
   * explored yet. `isRead = true` means ≥ 90 % of the chapter is marked —
   * a small slack so a chapter doesn't count as "unread" if the user is one
   * heading away from completion.
   */
  async annotateChapterReadFractions<T extends { path: string }>(
    items: T[],
  ): Promise<Array<T & { fraction: number; isRead: boolean }>> {
    const readVerses = await this.bookmarks.getReadVerses();
    const chapterReadCounts = this.buildChapterReadCounts(readVerses);
    return items.map(item => {
      const chapterIdx = item.path.replace(/^\/books\//, '');
      let total = this.counts.forChapter(chapterIdx);
      let read = chapterReadCounts.get(chapterIdx) || 0;
      if (total === 0) {
        // Sub-tree (volume / book) — sum descendants
        total = this.counts.totalForPrefix(chapterIdx);
        read = 0;
        for (const childIdx of this.counts.chapterIndexesForPrefix(chapterIdx)) {
          read += chapterReadCounts.get(childIdx) || 0;
        }
      }
      const fraction = total > 0 ? Math.min(1, read / total) : 0;
      return { ...item, fraction, isRead: total > 0 && fraction >= 0.9 };
    });
  }

  /**
   * RE-14: revisit suggestions. Returns up to `limit` bookmarks sorted by
   * "least recently seen" — surfaced on the homepage as a gentle nudge to
   * re-read older saves. Items where the user has explicitly marked the
   * verse read recently are pushed to the back.
   *
   * The min-age filter excludes very fresh bookmarks (within 3 days) so the
   * panel feels like a callback to past intent rather than a list of stuff
   * the user just added.
   */
  async revisitCandidates(limit = 5, minAgeDays = 3): Promise<RevisitCandidate[]> {
    const bookmarks = await this.bookmarks.getBookmarks();
    if (bookmarks.length === 0) return [];

    const reads = await this.bookmarks.getReadVerses();
    const readAtByPath = new Map<string, Date>();
    for (const r of reads) {
      const t = r.readAt instanceof Date ? r.readAt : new Date(r.readAt);
      const existing = readAtByPath.get(r.path);
      if (!existing || t > existing) readAtByPath.set(r.path, t);
    }

    const now = Date.now();
    const dayMs = 86_400_000;
    const minAgeMs = minAgeDays * dayMs;

    const candidates = bookmarks
      .map<RevisitCandidate>(bm => {
        const created = bm.createdAt instanceof Date ? bm.createdAt : new Date(bm.createdAt);
        const readAt = readAtByPath.get(bm.path);
        const lastSeen = readAt && readAt > created ? readAt : created;
        return {
          bookmark: bm,
          lastSeen,
          daysSinceLastSeen: Math.floor((now - lastSeen.getTime()) / dayMs),
        };
      })
      .filter(c => now - c.lastSeen.getTime() >= minAgeMs)
      .sort((a, b) => a.lastSeen.getTime() - b.lastSeen.getTime());

    return candidates.slice(0, limit);
  }

  /** One-shot read of the bookProgressMap (used by route resolvers and homepage explore cards). */
  async snapshotBookProgressMap(): Promise<Map<string, BookProgress>> {
    return new Promise(resolve => {
      this.bookProgressMap$.pipe(take(1)).subscribe(m => resolve(m));
    });
  }

  /** Build a per-chapter map of read-counts: { 'al-kafi:1:1:1' → 12, ... } */
  buildChapterReadCounts(readVerses: ReadVerse[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const rv of readVerses) {
      // Path format: /books/<slug>:vol:book:ch:verse
      const clean = rv.path.replace(/^\/books\//, '');
      const parts = clean.split(':');
      if (parts.length < 2) continue;
      const chapterIdx = parts.slice(0, parts.length - 1).join(':');
      map.set(chapterIdx, (map.get(chapterIdx) || 0) + 1);
    }
    return map;
  }

  /** Public so the UI can ask: "did the user just complete a chapter/book?" without re-querying. */
  computeMilestonesGained(prev: BookProgress | undefined, next: BookProgress): MilestoneEvent[] {
    const events: MilestoneEvent[] = [];

    // Book completion
    if (next.total > 0 && next.versesRead >= next.total && (!prev || prev.versesRead < prev.total)) {
      events.push({ kind: 'book-complete', bookId: next.bookId });
    }

    // Cumulative 100 / 1000 / 10000 across all reads — caller passes overall total separately
    // (see overallMilestonesGained for cross-book thresholds)
    return events;
  }

  /**
   * Cross-book cumulative milestones. Caller hands in the prev & new total verses-read
   * count. We emit one event per threshold crossed.
   */
  overallMilestonesGained(prevTotal: number, nextTotal: number): MilestoneEvent[] {
    const thresholds = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000];
    return thresholds
      .filter(t => prevTotal < t && nextTotal >= t)
      .map(t => ({ kind: 'cumulative', threshold: t } as MilestoneEvent));
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private buildBookProgressMap(rv: ReadVerse[], manifest: ReturnType<VerseCountsService['snapshotSync']>): Map<string, BookProgress> {
    // Group reads by bookId
    type Bucket = { count: number; first: number; last: number };
    const grouped = new Map<string, Bucket>();
    for (const r of rv) {
      const t = r.readAt instanceof Date ? r.readAt.getTime() : new Date(r.readAt).getTime();
      const b = grouped.get(r.bookId);
      if (b) {
        b.count++;
        if (t < b.first) b.first = t;
        if (t > b.last) b.last = t;
      } else {
        grouped.set(r.bookId, { count: 1, first: t, last: t });
      }
    }

    const out = new Map<string, BookProgress>();

    // Books that have read marks
    for (const [bookId, bucket] of grouped) {
      const total = manifest[bookId]?.total ?? 0;
      const fraction = total > 0 ? Math.min(1, bucket.count / total) : 0;
      out.set(bookId, {
        bookId,
        versesRead: bucket.count,
        total,
        fraction,
        percent: Math.round(fraction * 1000) / 10,
        firstReadAt: new Date(bucket.first),
        lastReadVerseAt: new Date(bucket.last),
      });
    }

    // Books in the manifest with no reads yet — included with zero counts so the
    // UI doesn't need to special-case "missing entry vs zero progress."
    for (const [bookId, info] of Object.entries(manifest)) {
      if (!out.has(bookId)) {
        out.set(bookId, {
          bookId,
          versesRead: 0,
          total: info.total,
          fraction: 0,
          percent: 0,
          firstReadAt: null,
          lastReadVerseAt: null,
        });
      }
    }

    return out;
  }

  private buildDailyTallies(rv: ReadVerse[]): DailyReadingTally[] {
    const buckets = new Map<string, { count: number; books: Set<string> }>();
    for (const r of rv) {
      const day = this.dayKey(r.readAt instanceof Date ? r.readAt : new Date(r.readAt));
      const b = buckets.get(day);
      if (b) {
        b.count++;
        b.books.add(r.bookId);
      } else {
        buckets.set(day, { count: 1, books: new Set([r.bookId]) });
      }
    }
    return Array.from(buckets.entries())
      .map(([date, b]) => ({ date, versesRead: b.count, bookIds: Array.from(b.books).sort() }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  private computeStreak(tallies: DailyReadingTally[]): StreakInfo {
    if (tallies.length === 0) return { current: 0, longest: 0, includesToday: false };

    const today = this.todayKey();
    const dayMs = 86_400_000;

    // tallies is sorted desc by date.
    const dateSet = new Set(tallies.map(t => t.date));

    // Current streak: walk backwards from today.
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    let current = 0;
    let freezeUsed = false;
    let includesToday = dateSet.has(today);

    while (true) {
      const key = this.dayKey(cursor);
      if (dateSet.has(key)) {
        current++;
        cursor = new Date(cursor.getTime() - dayMs);
      } else if (!freezeUsed) {
        // One forgiven gap per streak walk. The freeze may sit at the start
        // (today missed but yesterday read — streak alive, in danger) or in
        // the middle (occasional skipped day).
        freezeUsed = true;
        cursor = new Date(cursor.getTime() - dayMs);
      } else {
        break;
      }
    }

    // If today is missing and we haven't read, streak is "alive from yesterday" — still
    // count it but flag includesToday=false so the UI can prompt the user.
    // (current already reflects this if yesterday is in the set.)

    // Longest streak: same logic over the whole history, no freeze, no rolling cursor.
    const longest = this.longestRun(Array.from(dateSet).sort());

    return { current, longest, includesToday };
  }

  private longestRun(sortedKeys: string[]): number {
    if (sortedKeys.length === 0) return 0;
    let longest = 1;
    let run = 1;
    let prev = new Date(sortedKeys[0]).getTime();
    for (let i = 1; i < sortedKeys.length; i++) {
      const cur = new Date(sortedKeys[i]).getTime();
      if (cur - prev === 86_400_000) {
        run++;
        if (run > longest) longest = run;
      } else {
        run = 1;
      }
      prev = cur;
    }
    return longest;
  }

  private countOnDay(rv: ReadVerse[], dayKey: string): number {
    let n = 0;
    for (const r of rv) {
      if (this.dayKey(r.readAt instanceof Date ? r.readAt : new Date(r.readAt)) === dayKey) n++;
    }
    return n;
  }

  private todayKey(): string {
    return this.dayKey(new Date());
  }

  /** YYYY-MM-DD in local time (so streaks align with the user's clock, not UTC). */
  private dayKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

export type MilestoneEvent =
  | { kind: 'book-complete'; bookId: string }
  | { kind: 'chapter-complete'; chapterIndex: string; bookId: string }
  | { kind: 'cumulative'; threshold: number };
