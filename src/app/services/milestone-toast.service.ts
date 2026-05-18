import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { BookProgress, MilestoneEvent, ReadingStatsService } from './reading-stats.service';
import { I18nService } from './i18n.service';
import { BadgeService } from './badge.service';
import { Badge } from '@app/data/badges';

export interface MilestoneToast {
  id: number;
  /** Headline shown in bold. */
  title: string;
  /** Optional secondary line. */
  body?: string;
  /** Visual variant — drives the emoji + accent colour. */
  kind: MilestoneEvent['kind'] | 'badge-earned';
  /** Auto-dismiss timer in ms. 0 = sticky. */
  durationMs: number;
  /** Optional router link to navigate to on click. */
  routerLink?: string;
  /** Custom icon (overrides kind-based default). Used by badge toasts. */
  icon?: string;
}

/** Emits toasts at meaningful reading milestones — book completion + cumulative thresholds + badges earned. */
@Injectable({ providedIn: 'root' })
export class MilestoneToastService {
  private stats = inject(ReadingStatsService);
  private i18n = inject(I18nService);
  private badges = inject(BadgeService);

  private subject = new BehaviorSubject<MilestoneToast[]>([]);
  toasts$: Observable<MilestoneToast[]> = this.subject.asObservable();

  private nextId = 1;
  private prevSnapshot: { books: Map<string, BookProgress>; total: number } | null = null;
  private started = false;
  private badgeUnsubscribe: (() => void) | null = null;

  /** Wire up the subscription once at app boot. Safe to call multiple times. */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.stats.bookProgressMap$.subscribe(map => this.onProgress(map));
    // Boot the badge evaluator + listen for newly-earned events
    this.badges.start();
    this.badgeUnsubscribe = this.badges.onNewlyEarned(badge => this.onBadgeEarned(badge));
  }

  /**
   * Per-toast auto-dismiss timers. Tracked so we can pause + resume them
   * when the user hovers over a toast (give them time to read without
   * holding their breath). The map's value is `null` while a toast is
   * paused — `pauseAutoDismiss` clears the timer and stashes the
   * remaining time on `pauseRemainingMs`.
   */
  private autoDismissTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private pauseStartedAt = new Map<number, number>();
  private pauseRemainingMs = new Map<number, number>();

  dismiss(id: number): void {
    const timer = this.autoDismissTimers.get(id);
    if (timer !== undefined) clearTimeout(timer);
    this.autoDismissTimers.delete(id);
    this.pauseStartedAt.delete(id);
    this.pauseRemainingMs.delete(id);
    this.subject.next(this.subject.value.filter(t => t.id !== id));
  }

  /** Hover-enter on a toast — freeze its auto-dismiss timer. */
  pauseAutoDismiss(id: number): void {
    const timer = this.autoDismissTimers.get(id);
    if (timer === undefined) return;
    clearTimeout(timer);
    this.autoDismissTimers.delete(id);
    const startedAt = this.pauseStartedAt.get(id) ?? Date.now();
    // Use the toast's full duration as a fallback if we lost the start.
    const elapsed = Date.now() - startedAt;
    const total = this.subject.value.find(t => t.id === id)?.durationMs ?? 0;
    if (total <= 0) return;
    const remaining = Math.max(1000, total - elapsed);
    this.pauseRemainingMs.set(id, remaining);
  }

  /** Hover-leave — resume the timer with whatever time was left. */
  resumeAutoDismiss(id: number): void {
    if (this.autoDismissTimers.has(id)) return; // already running
    const remaining = this.pauseRemainingMs.get(id);
    if (remaining === undefined) return;
    this.pauseStartedAt.set(id, Date.now());
    this.pauseRemainingMs.delete(id);
    this.autoDismissTimers.set(id, setTimeout(() => this.dismiss(id), remaining));
  }

  /** Manually push a toast — used by milestone unit tests and the chapter-content
   * component (chapter-complete events, which require chapter-level data the
   * service doesn't see directly). */
  push(toast: Omit<MilestoneToast, 'id'>): void {
    const t: MilestoneToast = { id: this.nextId++, ...toast };
    this.subject.next([...this.subject.value, t]);
    if (t.durationMs > 0) {
      this.pauseStartedAt.set(t.id, Date.now());
      this.autoDismissTimers.set(t.id, setTimeout(() => this.dismiss(t.id), t.durationMs));
    }
  }

  private onProgress(map: Map<string, BookProgress>): void {
    const total = Array.from(map.values()).reduce((s, p) => s + p.versesRead, 0);

    // First emission is the baseline — no diff, no toasts.
    if (!this.prevSnapshot) {
      this.prevSnapshot = { books: new Map(map), total };
      return;
    }

    const prevTotal = this.prevSnapshot.total;
    const prevBooks = this.prevSnapshot.books;

    // 1. Per-book completion events
    for (const [bookId, cur] of map) {
      const prev = prevBooks.get(bookId);
      const events = this.stats.computeMilestonesGained(prev, cur);
      for (const e of events) {
        if (e.kind === 'book-complete') {
          this.push({
            kind: 'book-complete',
            title: this.formatBookCompleteTitle(bookId, cur.total),
            body: this.i18n.get('reading.milestoneChapterComplete'),
            routerLink: `/books/${bookId}`,
            // Long — finishing a whole book is rare and worth dwelling on
            durationMs: 20000,
          });
        }
      }
    }

    // 2. Cumulative thresholds
    for (const e of this.stats.overallMilestonesGained(prevTotal, total)) {
      if (e.kind === 'cumulative') {
        const tmpl = this.i18n.get('reading.milestoneCumulative');
        // Manual {{count}} substitution — ngx-translate in this codebase doesn't
        // accept inline params, so we string-replace.
        const title = tmpl.replace(/\{\{\s*count\s*\}\}/g, String(e.threshold));
        this.push({
          kind: 'cumulative',
          title,
          routerLink: '/bookmarks',
          // Cumulative thresholds fire more often than book-completes —
          // keep them shorter but still visible enough to read.
          durationMs: 12000,
        });
      }
    }

    this.prevSnapshot = { books: new Map(map), total };
  }

  private onBadgeEarned(badge: Badge): void {
    const label = this.i18n.get(badge.labelKey);
    const desc = this.i18n.get(badge.descKey);
    const tmpl = this.i18n.get('reading.badgeEarnedTitle');
    const title = tmpl === 'reading.badgeEarnedTitle'
      ? `Badge earned — ${label === badge.labelKey ? badge.id : label}`
      : tmpl.replace(/\{\{\s*label\s*\}\}/g, label === badge.labelKey ? badge.id : label);
    this.push({
      kind: 'badge-earned',
      title,
      body: desc === badge.descKey ? undefined : desc,
      icon: badge.icon,
      routerLink: '/bookmarks',
      // A new badge is a once-only moment — give the user time to read the
      // label + maybe click through to the shelf.
      durationMs: 20000,
    });
  }

  private formatBookCompleteTitle(bookId: string, total: number): string {
    const tmpl = this.i18n.get('reading.milestoneBookComplete');
    return tmpl
      .replace(/\{\{\s*book\s*\}\}/g, this.formatBookId(bookId))
      .replace(/\{\{\s*count\s*\}\}/g, String(total))
      .replace(/\{\{\s*noun\s*\}\}/g, this.getCountNoun(bookId));
  }

  private formatBookId(bookId: string): string {
    if (bookId === 'quran') return 'the Quran';
    return bookId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /** Plural noun for the units counted in a book. Quran ayat vs hadith narrations. */
  private getCountNoun(bookId: string): string {
    const key = bookId === 'quran' ? 'reading.countNounAyah' : 'reading.countNounHadith';
    const val = this.i18n.get(key);
    // Fallback when the i18n loader hasn't resolved the key (returns the key as-is)
    return val === key ? (bookId === 'quran' ? 'ayahs' : 'hadiths') : val;
  }
}
