import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { BookProgress, MilestoneEvent, ReadingStatsService } from './reading-stats.service';
import { I18nService } from './i18n.service';

export interface MilestoneToast {
  id: number;
  /** Headline shown in bold. */
  title: string;
  /** Optional secondary line. */
  body?: string;
  /** Visual variant — drives the emoji + accent colour. */
  kind: MilestoneEvent['kind'];
  /** Auto-dismiss timer in ms. 0 = sticky. */
  durationMs: number;
  /** Optional router link to navigate to on click. */
  routerLink?: string;
}

/** Emits toasts at meaningful reading milestones — book completion + cumulative thresholds. */
@Injectable({ providedIn: 'root' })
export class MilestoneToastService {
  private stats = inject(ReadingStatsService);
  private i18n = inject(I18nService);

  private subject = new BehaviorSubject<MilestoneToast[]>([]);
  toasts$: Observable<MilestoneToast[]> = this.subject.asObservable();

  private nextId = 1;
  private prevSnapshot: { books: Map<string, BookProgress>; total: number } | null = null;
  private started = false;

  /** Wire up the subscription once at app boot. Safe to call multiple times. */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.stats.bookProgressMap$.subscribe(map => this.onProgress(map));
  }

  dismiss(id: number): void {
    this.subject.next(this.subject.value.filter(t => t.id !== id));
  }

  /** Manually push a toast — used by milestone unit tests and the chapter-content
   * component (chapter-complete events, which require chapter-level data the
   * service doesn't see directly). */
  push(toast: Omit<MilestoneToast, 'id'>): void {
    const t: MilestoneToast = { id: this.nextId++, ...toast };
    this.subject.next([...this.subject.value, t]);
    if (t.durationMs > 0) {
      setTimeout(() => this.dismiss(t.id), t.durationMs);
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
            durationMs: 8000,
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
          durationMs: 6000,
        });
      }
    }

    this.prevSnapshot = { books: new Map(map), total };
  }

  private formatBookCompleteTitle(bookId: string, total: number): string {
    const tmpl = this.i18n.get('reading.milestoneBookComplete');
    return tmpl
      .replace(/\{\{\s*book\s*\}\}/g, this.formatBookId(bookId))
      .replace(/\{\{\s*count\s*\}\}/g, String(total));
  }

  private formatBookId(bookId: string): string {
    if (bookId === 'quran') return 'the Quran';
    return bookId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
