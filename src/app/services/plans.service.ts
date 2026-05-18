import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { Observable, combineLatest, map, of, shareReplay } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { BookmarkService, EnrolledPlan, ReadVerse } from './bookmark.service';

/**
 * A single day's slot inside a plan — list of chapter-index ranges.
 *
 * `chapterIndex` is the canonical hierarchical index (same as the JSON
 * `index` field on each chapter). Examples:
 *   - Quran surah 2: "quran:2"
 *   - Al-Kafi vol 1 / book 1 / chapter 1: "al-kafi:1:1:1"
 *
 * `verseStart` / `verseEnd` are 1-based, inclusive — the user-facing
 * verse numbers within that chapter. expandDayPaths() turns them into
 * `/books/<chapterIndex>:<n>` verse paths.
 *
 * The legacy `surah` field is still accepted for the original
 * Quran-in-30-days plan; if present and `chapterIndex` is missing the
 * loader builds `chapterIndex = "quran:<surah>"`.
 */
export interface PlanDayRange {
  /** Canonical chapter index. Preferred for new plans. */
  chapterIndex?: string;
  /** Legacy Quran-only field. If set, `chapterIndex` is derived as `quran:<surah>`. */
  surah?: number;
  verseStart: number;
  verseEnd: number;
}

export interface PlanDay {
  day: number;
  titleEn: string;
  verseCount: number;
  ranges: PlanDayRange[];
}

export interface ReadingPlan {
  id: string;
  version: number;
  titleEn: string;
  descEn: string;
  totalDays: number;
  totalVerses: number;
  /** Slug list (`['quran']`) — narrows the plan to its source book(s). */
  books: string[];
  days: PlanDay[];
}

export interface PlanCatalogueEntry {
  id: string;
  titleEn: string;
  descEn: string;
  totalDays: number;
  totalVerses: number;
  books: string[];
}

interface CatalogueFile {
  version: number;
  plans: PlanCatalogueEntry[];
}

/** Per-user, derived view of an enrolled plan: where it is, what today is, how today's going. */
export interface PlanState {
  plan: ReadingPlan;
  enrollment: EnrolledPlan;
  /** 1..totalDays — clamped to plan.totalDays after completion. */
  currentDay: number;
  /** True if the user has already read every verse path in today's slot. */
  todayDone: boolean;
  /** Count of paths the user has marked from today's slot (out of today.verseCount). */
  todayRead: number;
  /** The PlanDay for `currentDay`. */
  today: PlanDay;
}

/**
 * Loads reading-plan JSON from ThaqalaynData and projects the user's
 * enrolled plans into a ready-to-render `PlanState`. Pure projection on
 * top of BookmarkService — no state owned here besides HTTP caching.
 */
@Injectable({ providedIn: 'root' })
export class PlansService {
  private http = inject(HttpClient);
  private bookmarks = inject(BookmarkService);

  private catalogueCache$: Observable<CatalogueFile> | null = null;
  private planCache = new Map<string, Observable<ReadingPlan>>();

  /** Plans the data API knows about. */
  catalogue$(): Observable<PlanCatalogueEntry[]> {
    if (!this.catalogueCache$) {
      this.catalogueCache$ = this.http
        .get<CatalogueFile>(`${environment.apiBaseUrl}plans/index.json`)
        .pipe(
          catchError(() => of({ version: 0, plans: [] } as CatalogueFile)),
          shareReplay(1),
        );
    }
    return this.catalogueCache$.pipe(map(c => c.plans || []));
  }

  /** Fetch the full schedule for a plan id. */
  plan$(id: string): Observable<ReadingPlan | null> {
    let cached = this.planCache.get(id);
    if (!cached) {
      cached = this.http
        .get<ReadingPlan>(`${environment.apiBaseUrl}plans/${id}.json`)
        .pipe(
          catchError(() => of(null as unknown as ReadingPlan)),
          shareReplay(1),
        );
      this.planCache.set(id, cached);
    }
    return cached;
  }

  /**
   * Live state for every plan the user is enrolled in. Empty array when
   * none. Re-emits whenever enrollment list OR read-marks change.
   */
  enrolledStates$: Observable<PlanState[]> = combineLatest([
    this.bookmarks.enrolledPlans$,
    this.bookmarks.readVerses$,
  ]).pipe(
    switchMap(([enrollments, readVerses]) => {
      if (enrollments.length === 0) return of([] as PlanState[]);
      return combineLatest(enrollments.map(e =>
        this.plan$(e.planId).pipe(
          map(plan => plan ? this.deriveState(plan, e, readVerses) : null),
        ),
      )).pipe(map(states => states.filter((s): s is PlanState => s !== null)));
    }),
  );

  /** Enroll the user in a plan (or restart it). */
  async enroll(planId: string): Promise<void> {
    await this.bookmarks.enrollPlan(planId);
  }

  /** Drop a plan. */
  async unenroll(planId: string): Promise<void> {
    await this.bookmarks.unenrollPlan(planId);
  }

  /** Concrete verse paths for one day of a plan. Used for read-completion + deep-linking. */
  expandDayPaths(book: string, day: PlanDay): string[] {
    const paths: string[] = [];
    for (const r of day.ranges) {
      const idx = this.rangeChapterIndex(book, r);
      for (let v = r.verseStart; v <= r.verseEnd; v++) {
        paths.push(`/books/${idx}:${v}`);
      }
    }
    return paths;
  }

  /**
   * The first path of a plan-day. Useful for the homepage ribbon's
   * "open today's reading" CTA — landing on the first verse of the day,
   * the user can scroll through and let auto-detect mark everything.
   */
  firstPathOfDay(book: string, day: PlanDay): string | null {
    const first = day.ranges[0];
    if (!first) return null;
    return `/books/${this.rangeChapterIndex(book, first)}:${first.verseStart}`;
  }

  /** Resolve a range's chapter index, falling back to the legacy `surah` field for Quran plans. */
  private rangeChapterIndex(book: string, r: PlanDayRange): string {
    if (r.chapterIndex) return r.chapterIndex;
    if (r.surah !== undefined) return `${book}:${r.surah}`;
    return book;
  }

  // ---------------------------------------------------------------------------

  private deriveState(plan: ReadingPlan, enrollment: EnrolledPlan, readVerses: ReadVerse[]): PlanState {
    const startedAt = enrollment.startedAt instanceof Date
      ? enrollment.startedAt
      : new Date(enrollment.startedAt);

    // Local-date day index — same approach as `dayKey` elsewhere so a user in
    // any timezone gets the "right" day.
    const dayMs = 86_400_000;
    const startKey = this.dayKey(startedAt);
    const todayKey = this.dayKey(new Date());
    const elapsedDays = Math.floor((this.parseDayKey(todayKey).getTime() - this.parseDayKey(startKey).getTime()) / dayMs);
    const currentDay = Math.max(1, Math.min(plan.totalDays, elapsedDays + 1));
    const today = plan.days.find(d => d.day === currentDay) ?? plan.days[plan.days.length - 1];

    // Today's completion — how many of today's expected paths are in readVerses?
    // We assume single-book plans for v1; multi-book would need a different mapping.
    const book = plan.books[0] ?? 'quran';
    const expected = new Set(this.expandDayPaths(book, today));
    let todayRead = 0;
    for (const r of readVerses) {
      if (expected.has(r.path)) {
        todayRead++;
        if (todayRead === expected.size) break;
      }
    }
    const todayDone = todayRead >= expected.size;

    return { plan, enrollment, currentDay, today, todayRead, todayDone };
  }

  private dayKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private parseDayKey(key: string): Date {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
}
