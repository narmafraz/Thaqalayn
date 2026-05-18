import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, distinctUntilChanged, map } from 'rxjs';

import { BadgeContext, BADGE_CATALOGUE, Badge } from '@app/data/badges';
import { BookmarkService, EarnedBadge } from './bookmark.service';
import { ReadingStatsService } from './reading-stats.service';

/**
 * RE-16 — owns the badge evaluation loop.
 *
 * Subscribes once to all the stats inputs a predicate might need
 * (bookProgressMap, totalVersesRead, streak, dailyTallies, raw readVerses)
 * and re-evaluates every badge whenever any of them change. When a
 * predicate flips from `false` → `true`, the badge is persisted via
 * BookmarkService and announced through `newlyEarned$` so the toaster can
 * surface a celebratory message exactly once.
 *
 * Pure projection: no state of its own beyond the streamed-once-earned set.
 * Persistence is in BookmarkService's Dexie table.
 */
@Injectable({ providedIn: 'root' })
export class BadgeService {
  private bookmarks = inject(BookmarkService);
  private stats = inject(ReadingStatsService);

  /** All catalogue entries, in display order. */
  readonly catalogue: ReadonlyArray<Badge> = BADGE_CATALOGUE;

  /** Earned-set as a stream — UI binds to this for the shelf. */
  readonly earned$: Observable<EarnedBadge[]> = this.bookmarks.earnedBadges$;

  /**
   * Subject of badges newly earned during this session. Drained by the
   * toaster; never replayed (so a page reload doesn't re-toast).
   */
  private newlyEarnedBuffer: Badge[] = [];
  private newlyEarnedListeners: Array<(b: Badge) => void> = [];

  private started = false;

  /** Wire up the evaluation loop. Idempotent. */
  start(): void {
    if (this.started) return;
    this.started = true;

    combineLatest([
      this.stats.bookProgressMap$,
      this.stats.streak$,
      this.stats.dailyTallies$,
      this.bookmarks.readVerses$,
      this.bookmarks.earnedBadges$,
    ])
      .pipe(
        // Cheap signature so we skip cycles where nothing observable changed.
        // We DON'T include earnedBadges$ in the dedupe because re-emitting on
        // earn is the whole point.
        distinctUntilChanged((a, b) =>
          a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4]
        ),
        map(([bookProgressMap, streak, dailyTallies, readVerses, earned]) => {
          // Compute total directly from readVerses — bookProgressMap is a
          // downstream projection that may not have caught up with the same
          // emission tick, leading to stale totals if we read from it.
          const totalVersesRead = readVerses.length;
          const ctx: BadgeContext = {
            bookProgressMap,
            totalVersesRead,
            streak,
            dailyTallies,
            readVerses,
          };
          const earnedIds = new Set(earned.map(e => e.badgeId));
          return { ctx, earnedIds };
        }),
      )
      .subscribe(({ ctx, earnedIds }) => this.evaluate(ctx, earnedIds));
  }

  /** Subscribe to badge-earned events. Returns an unsubscribe handle. */
  onNewlyEarned(cb: (b: Badge) => void): () => void {
    this.newlyEarnedListeners.push(cb);
    // Drain any buffered events that landed before this listener subscribed.
    while (this.newlyEarnedBuffer.length > 0) {
      const next = this.newlyEarnedBuffer.shift()!;
      cb(next);
    }
    return () => {
      this.newlyEarnedListeners = this.newlyEarnedListeners.filter(l => l !== cb);
    };
  }

  /** Convenience for the UI — "of N badges, you've earned K". */
  async earnedCount(): Promise<number> {
    return (await this.bookmarks.getEarnedBadges()).length;
  }

  /** Total badge count (catalogue size). */
  totalCount(): number {
    return this.catalogue.length;
  }

  private async evaluate(ctx: BadgeContext, earnedIds: Set<string>): Promise<void> {
    for (const badge of this.catalogue) {
      if (earnedIds.has(badge.id)) continue;
      let isEarned = false;
      try {
        isEarned = badge.predicate(ctx);
      } catch {
        // A broken predicate must never crash the loop.
        continue;
      }
      if (!isEarned) continue;

      const wasNew = await this.bookmarks.earnBadge(badge.id);
      if (wasNew) {
        this.dispatchNewlyEarned(badge);
      }
    }
  }

  private dispatchNewlyEarned(badge: Badge): void {
    if (this.newlyEarnedListeners.length === 0) {
      // Buffer until at least one listener subscribes. Avoids losing the
      // first-ever earned event when the toaster mounts a tick later.
      this.newlyEarnedBuffer.push(badge);
      return;
    }
    for (const cb of [...this.newlyEarnedListeners]) {
      cb(badge);
    }
  }
}
