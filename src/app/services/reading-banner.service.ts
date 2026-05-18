import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';

import { AiPreferencesService } from './ai-preferences.service';
import { BookmarkService } from './bookmark.service';
import { ReadingStatsService } from './reading-stats.service';

/**
 * RE-12 — local-only reading reminder banner.
 *
 * Surfaces a single dismissible banner at the top of the app when one of
 * these conditions is true:
 *
 *  - `streak-at-risk`: user has a live streak (current > 0) but hasn't read
 *    today. Highest-stakes case — losing a 30-day streak feels bad.
 *  - `goal-pending`:   user has a daily verse goal set and hasn't hit it,
 *    and it's past noon local time.
 *
 * Banner is dismissed for the day via a localStorage key. Globally
 * disable-able via `aiPrefs.muteReadingBanner` (opt-out, default on).
 *
 * No server, no service worker — just a derived stream off existing state.
 */
export type ReadingBannerKind = 'streak-at-risk' | 'goal-pending';

export interface ReadingBanner {
  kind: ReadingBannerKind;
  /** Numeric context the template uses (current streak length, verses-to-go, etc.). */
  count: number;
}

const DISMISS_PREFIX = 'thaqalayn-banner-dismissed:';
const GOAL_PENDING_HOUR_THRESHOLD = 12; // banner only appears after noon local

@Injectable({ providedIn: 'root' })
export class ReadingBannerService {
  private stats = inject(ReadingStatsService);
  private bookmarks = inject(BookmarkService);
  private aiPrefs = inject(AiPreferencesService);

  /**
   * Cold observable resolving to the banner to show, or `null` if none.
   * Re-evaluates whenever upstream state changes (streak, goal, dismissals).
   */
  banner$: Observable<ReadingBanner | null> = combineLatest([
    this.stats.streak$,
    this.stats.goalProgress$,
    this.aiPrefs.preferences$,
  ]).pipe(
    map(([streak, goal, prefs]) => {
      if (prefs.muteReadingBanner) return null;

      // Highest priority — streak about to die.
      if (streak.current > 0 && !streak.includesToday && !this.isDismissedToday('streak-at-risk')) {
        return { kind: 'streak-at-risk' as const, count: streak.current };
      }

      // Goal set, behind, and past noon (avoid nagging in the morning).
      if (
        goal.target > 0 &&
        goal.today < goal.target &&
        new Date().getHours() >= GOAL_PENDING_HOUR_THRESHOLD &&
        !this.isDismissedToday('goal-pending')
      ) {
        return { kind: 'goal-pending' as const, count: goal.target - goal.today };
      }

      return null;
    }),
  );

  /** Mark today's banner as dismissed — persists for the rest of the local day. */
  dismissForToday(kind: ReadingBannerKind): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(DISMISS_PREFIX + kind, this.todayKey());
  }

  /** True if the user already closed this banner-kind today. */
  isDismissedToday(kind: ReadingBannerKind): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(DISMISS_PREFIX + kind) === this.todayKey();
  }

  /** YYYY-MM-DD local. Mirrors ReadingStatsService.dayKey. */
  private todayKey(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
