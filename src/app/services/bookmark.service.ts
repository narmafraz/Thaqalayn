import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Bookmark {
  id?: number;
  path: string;
  title: string;
  arabicTitle?: string;
  bookId: string;
  createdAt: Date;
}

export interface ReadingProgress {
  bookId: string;
  lastPath: string;
  lastTitle: string;
  lastVisited: Date;
}

export interface Annotation {
  id?: number;
  path: string;
  bookId: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A single verse marked as read. Unique by path. */
export interface ReadVerse {
  id?: number;
  path: string;
  bookId: string;
  /** Time the verse was first marked read. Does not change on re-mark. */
  readAt: Date;
  /** How the mark was created. */
  source: 'auto' | 'manual';
}

/** Singleton row holding user reading-goal preferences (`id` always 0). */
export interface GoalConfig {
  id: 0;
  /** Target verses per day. 0 disables the goal. */
  dailyVerseTarget: number;
  createdAt: Date;
  updatedAt: Date;
}

/** A badge the user has earned. Once earned, never auto-removed. */
export interface EarnedBadge {
  /** Stable badge identifier (matches `Badge.id` in the catalogue). Primary key. */
  badgeId: string;
  earnedAt: Date;
}

/** An enrolled reading plan (RE-10). Only one active at a time per planId — the
 *  table is keyed by planId so re-enrolling resets `startedAt` to "now". */
export interface EnrolledPlan {
  /** Stable plan id from `plans/index.json`. Primary key. */
  planId: string;
  /** Date the user pressed "Start this plan." `currentDay` derives from this. */
  startedAt: Date;
}

class ThaqalaynDb extends Dexie {
  bookmarks!: Table<Bookmark, number>;
  readingProgress!: Table<ReadingProgress, string>;
  annotations!: Table<Annotation, number>;
  readVerses!: Table<ReadVerse, number>;
  goalConfig!: Table<GoalConfig, number>;
  earnedBadges!: Table<EarnedBadge, string>;
  enrolledPlans!: Table<EnrolledPlan, string>;

  constructor() {
    super('thaqalayn-bookmarks');
    this.version(1).stores({
      bookmarks: '++id, path, bookId, createdAt',
      readingProgress: 'bookId, lastVisited',
    });
    this.version(2).stores({
      bookmarks: '++id, path, bookId, createdAt',
      readingProgress: 'bookId, lastVisited',
      annotations: '++id, path, bookId, updatedAt',
    });
    this.version(3).stores({
      bookmarks: '++id, path, bookId, createdAt',
      readingProgress: 'bookId, lastVisited',
      annotations: '++id, path, bookId, updatedAt',
      // `&path` = unique index → marking the same verse twice is a no-op upsert
      readVerses: '++id, &path, bookId, readAt',
      goalConfig: 'id',
    });
    this.version(4).stores({
      bookmarks: '++id, path, bookId, createdAt',
      readingProgress: 'bookId, lastVisited',
      annotations: '++id, path, bookId, updatedAt',
      readVerses: '++id, &path, bookId, readAt',
      goalConfig: 'id',
      // Primary key is `badgeId` directly — one row per badge, idempotent on
      // re-earn (we just keep the original earnedAt).
      earnedBadges: 'badgeId, earnedAt',
    });
    this.version(5).stores({
      bookmarks: '++id, path, bookId, createdAt',
      readingProgress: 'bookId, lastVisited',
      annotations: '++id, path, bookId, updatedAt',
      readVerses: '++id, &path, bookId, readAt',
      goalConfig: 'id',
      earnedBadges: 'badgeId, earnedAt',
      // RE-10: plans the user has enrolled in. PK is the plan id so re-enrolling
      // simply overwrites the startedAt timestamp.
      enrolledPlans: 'planId, startedAt',
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class BookmarkService {

  private db: ThaqalaynDb;
  private bookmarksSubject = new BehaviorSubject<Bookmark[]>([]);
  private progressSubject = new BehaviorSubject<ReadingProgress[]>([]);
  private annotationsSubject = new BehaviorSubject<Annotation[]>([]);
  private readVersesSubject = new BehaviorSubject<ReadVerse[]>([]);
  private goalConfigSubject = new BehaviorSubject<GoalConfig | null>(null);
  private earnedBadgesSubject = new BehaviorSubject<EarnedBadge[]>([]);
  private enrolledPlansSubject = new BehaviorSubject<EnrolledPlan[]>([]);

  bookmarks$: Observable<Bookmark[]> = this.bookmarksSubject.asObservable();
  readingProgress$: Observable<ReadingProgress[]> = this.progressSubject.asObservable();
  annotations$: Observable<Annotation[]> = this.annotationsSubject.asObservable();
  readVerses$: Observable<ReadVerse[]> = this.readVersesSubject.asObservable();
  goalConfig$: Observable<GoalConfig | null> = this.goalConfigSubject.asObservable();
  earnedBadges$: Observable<EarnedBadge[]> = this.earnedBadgesSubject.asObservable();
  enrolledPlans$: Observable<EnrolledPlan[]> = this.enrolledPlansSubject.asObservable();

  constructor() {
    this.db = new ThaqalaynDb();
    this.loadAll();
  }

  /** Add a bookmark for a verse/chapter */
  async addBookmark(path: string, title: string, arabicTitle?: string): Promise<void> {
    const bookId = this.extractBookId(path);
    await this.db.bookmarks.add({
      path,
      title,
      arabicTitle,
      bookId,
      createdAt: new Date(),
    });
    await this.refreshBookmarks();
  }

  /** Remove a bookmark by path */
  async removeBookmark(path: string): Promise<void> {
    await this.db.bookmarks.where('path').equals(path).delete();
    await this.refreshBookmarks();
  }

  /** Check if a path is bookmarked */
  async isBookmarked(path: string): Promise<boolean> {
    const count = await this.db.bookmarks.where('path').equals(path).count();
    return count > 0;
  }

  /** Toggle bookmark for a path */
  async toggleBookmark(path: string, title: string, arabicTitle?: string): Promise<boolean> {
    const exists = await this.isBookmarked(path);
    if (exists) {
      await this.removeBookmark(path);
      return false;
    } else {
      await this.addBookmark(path, title, arabicTitle);
      return true;
    }
  }

  /** Get all bookmarks */
  async getBookmarks(): Promise<Bookmark[]> {
    return this.db.bookmarks.orderBy('createdAt').reverse().toArray();
  }

  /** Update reading progress for a book */
  async updateReadingProgress(path: string, title: string): Promise<void> {
    const bookId = this.extractBookId(path);
    if (!bookId) return;

    await this.db.readingProgress.put({
      bookId,
      lastPath: path,
      lastTitle: title,
      lastVisited: new Date(),
    });
    await this.refreshProgress();
  }

  /** Get reading progress for all books */
  async getReadingProgress(): Promise<ReadingProgress[]> {
    return this.db.readingProgress.orderBy('lastVisited').reverse().toArray();
  }

  /** Clear a specific reading progress entry */
  async clearReadingProgress(bookId: string): Promise<void> {
    await this.db.readingProgress.delete(bookId);
    await this.refreshProgress();
  }

  /**
   * Export bookmarks, reading-progress, annotations, read-verses, and goal config as JSON.
   *
   * Format version `2` adds `readVerses` + `goalConfig` to the v1 payload. Older
   * exports (no `version` field) still import cleanly via {@link importBookmarks}.
   */
  async exportBookmarks(): Promise<string> {
    const bookmarks = await this.getBookmarks();
    const progress = await this.getReadingProgress();
    const annotations = await this.getAnnotations();
    const readVerses = await this.getReadVerses();
    const goalConfig = await this.getGoalConfig();
    const earnedBadges = await this.getEarnedBadges();
    return JSON.stringify({
      version: 3,
      exportedAt: new Date().toISOString(),
      bookmarks,
      readingProgress: progress,
      annotations,
      readVerses,
      goalConfig,
      earnedBadges,
    }, null, 2);
  }

  /**
   * Import an export payload. Returns the count of NEW rows added across:
   * bookmarks, annotations, and readVerses. Reading-progress + goalConfig
   * use upsert semantics (overwrite the existing row if present) and are
   * NOT counted in the returned total.
   */
  async importBookmarks(json: string): Promise<number> {
    const data = JSON.parse(json);
    let imported = 0;

    if (data.bookmarks && Array.isArray(data.bookmarks)) {
      for (const bm of data.bookmarks) {
        const exists = await this.isBookmarked(bm.path);
        if (!exists) {
          await this.db.bookmarks.add({
            path: bm.path,
            title: bm.title,
            arabicTitle: bm.arabicTitle,
            bookId: bm.bookId || this.extractBookId(bm.path),
            createdAt: new Date(bm.createdAt),
          });
          imported++;
        }
      }
    }

    if (data.readingProgress && Array.isArray(data.readingProgress)) {
      for (const rp of data.readingProgress) {
        await this.db.readingProgress.put({
          bookId: rp.bookId,
          lastPath: rp.lastPath,
          lastTitle: rp.lastTitle,
          lastVisited: new Date(rp.lastVisited),
        });
      }
    }

    if (data.annotations && Array.isArray(data.annotations)) {
      for (const ann of data.annotations) {
        const existing = await this.getAnnotation(ann.path);
        if (!existing) {
          await this.db.annotations.add({
            path: ann.path,
            bookId: ann.bookId || this.extractBookId(ann.path),
            text: ann.text,
            createdAt: new Date(ann.createdAt),
            updatedAt: new Date(ann.updatedAt),
          });
          imported++;
        }
      }
    }

    if (data.readVerses && Array.isArray(data.readVerses)) {
      // Bulk-skip duplicates: ask Dexie which paths already exist, then add the rest.
      const incomingPaths = data.readVerses.map((r: { path: string }) => r.path);
      const existingPaths = new Set(
        (await this.db.readVerses.where('path').anyOf(incomingPaths).toArray()).map(r => r.path)
      );
      const fresh = data.readVerses
        .filter((r: { path: string }) => !existingPaths.has(r.path))
        .map((r: { path: string; bookId?: string; readAt: string; source?: string }) => ({
          path: r.path,
          bookId: r.bookId || this.extractBookId(r.path),
          readAt: new Date(r.readAt),
          source: (r.source === 'manual' ? 'manual' : 'auto') as 'auto' | 'manual',
        }));
      if (fresh.length > 0) {
        await this.db.readVerses.bulkAdd(fresh);
        imported += fresh.length;
      }
    }

    if (data.goalConfig && typeof data.goalConfig === 'object') {
      const g = data.goalConfig;
      await this.db.goalConfig.put({
        id: 0,
        dailyVerseTarget: Number(g.dailyVerseTarget) || 0,
        createdAt: g.createdAt ? new Date(g.createdAt) : new Date(),
        updatedAt: g.updatedAt ? new Date(g.updatedAt) : new Date(),
      });
    }

    if (data.earnedBadges && Array.isArray(data.earnedBadges)) {
      for (const eb of data.earnedBadges) {
        if (!eb.badgeId) continue;
        const existing = await this.db.earnedBadges.get(eb.badgeId);
        if (!existing) {
          await this.db.earnedBadges.add({
            badgeId: eb.badgeId,
            earnedAt: eb.earnedAt ? new Date(eb.earnedAt) : new Date(),
          });
          imported++;
        }
      }
    }

    await this.loadAll();
    return imported;
  }

  /** Save or update an annotation for a verse */
  async saveAnnotation(path: string, text: string): Promise<void> {
    const existing = await this.db.annotations.where('path').equals(path).first();
    const now = new Date();
    if (existing) {
      await this.db.annotations.update(existing.id!, { text, updatedAt: now });
    } else {
      await this.db.annotations.add({
        path,
        bookId: this.extractBookId(path),
        text,
        createdAt: now,
        updatedAt: now,
      });
    }
    await this.refreshAnnotations();
  }

  /** Get annotation for a specific path */
  async getAnnotation(path: string): Promise<Annotation | undefined> {
    return this.db.annotations.where('path').equals(path).first();
  }

  /** Delete an annotation */
  async deleteAnnotation(path: string): Promise<void> {
    await this.db.annotations.where('path').equals(path).delete();
    await this.refreshAnnotations();
  }

  /** Get all annotations */
  async getAnnotations(): Promise<Annotation[]> {
    return this.db.annotations.orderBy('updatedAt').reverse().toArray();
  }

  // ---------------------------------------------------------------------------
  // Read-verse tracking (Wave A / RE-01)
  // ---------------------------------------------------------------------------

  /**
   * Mark a verse as read. Idempotent — calling twice with the same path
   * keeps the original `readAt` (first-read wins), so streak / history math
   * stays stable when users re-visit content.
   */
  async markRead(path: string, source: 'auto' | 'manual' = 'auto'): Promise<void> {
    const bookId = this.extractBookId(path);
    if (!bookId) return;
    const existing = await this.db.readVerses.where('path').equals(path).first();
    if (existing) return;
    await this.db.readVerses.add({
      path,
      bookId,
      readAt: new Date(),
      source,
    });
    await this.refreshReadVerses();
  }

  /** Mark many paths in one transaction — used by "mark all up to here." */
  async markReadBulk(paths: string[], source: 'auto' | 'manual' = 'manual'): Promise<number> {
    if (paths.length === 0) return 0;
    const existing = new Set(
      (await this.db.readVerses.where('path').anyOf(paths).toArray()).map(r => r.path)
    );
    const now = new Date();
    const fresh = paths
      .filter(p => !existing.has(p))
      .map(p => ({ path: p, bookId: this.extractBookId(p), readAt: now, source }));
    if (fresh.length === 0) return 0;
    await this.db.readVerses.bulkAdd(fresh);
    await this.refreshReadVerses();
    return fresh.length;
  }

  /** Remove a single read mark. Manual escape hatch. */
  async unmarkRead(path: string): Promise<void> {
    await this.db.readVerses.where('path').equals(path).delete();
    await this.refreshReadVerses();
  }

  async isRead(path: string): Promise<boolean> {
    const n = await this.db.readVerses.where('path').equals(path).count();
    return n > 0;
  }

  /** All read verses for a given book (e.g. 'al-kafi'). */
  async getReadVersesForBook(bookId: string): Promise<ReadVerse[]> {
    return this.db.readVerses.where('bookId').equals(bookId).toArray();
  }

  async getReadVerses(): Promise<ReadVerse[]> {
    return this.db.readVerses.orderBy('readAt').reverse().toArray();
  }

  /** Wipe all read marks. Used by clearAll. */
  async clearReadVerses(): Promise<void> {
    await this.db.readVerses.clear();
    await this.refreshReadVerses();
  }

  /**
   * Remove read marks whose path lies under `pathPrefix` (which can be a
   * whole book, a volume, a section, or a leaf chapter). Returns the count
   * deleted. `pathPrefix` is the index form — e.g. `al-kafi`, `al-kafi:1`,
   * `al-kafi:1:1:1`. The leading `/books/` is added automatically; the
   * caller passes the index, not the URL path.
   */
  async resetReadProgressForPrefix(pathPrefix: string): Promise<number> {
    if (!pathPrefix) return 0;
    const slug = pathPrefix.split(':')[0];
    const prefixPath = '/books/' + pathPrefix;
    const needle = prefixPath + ':';
    // Fetch all reads in the book and filter — cheaper than a full scan
    // because Dexie has an index on `bookId`.
    const all = await this.db.readVerses.where('bookId').equals(slug).toArray();
    const toDelete = all.filter(r => r.path === prefixPath || r.path.startsWith(needle));
    if (toDelete.length === 0) return 0;
    const ids = toDelete.map(r => r.id!).filter(id => id !== undefined);
    await this.db.readVerses.bulkDelete(ids);
    await this.refreshReadVerses();
    return toDelete.length;
  }

  /**
   * Preview helper — how many read marks live under `pathPrefix`. Used by
   * the confirmation dialog so we can say "Remove N marks from <label>?"
   * without first running the destructive op.
   */
  async countReadProgressForPrefix(pathPrefix: string): Promise<number> {
    if (!pathPrefix) return 0;
    const slug = pathPrefix.split(':')[0];
    const prefixPath = '/books/' + pathPrefix;
    const needle = prefixPath + ':';
    const all = await this.db.readVerses.where('bookId').equals(slug).toArray();
    return all.filter(r => r.path === prefixPath || r.path.startsWith(needle)).length;
  }

  // ---------------------------------------------------------------------------
  // Goal config (Wave D / RE-09)
  // ---------------------------------------------------------------------------

  async getGoalConfig(): Promise<GoalConfig | null> {
    const row = await this.db.goalConfig.get(0);
    return row ?? null;
  }

  /** Upsert the (singleton) goal-config row. Set `dailyVerseTarget = 0` to disable. */
  async setGoalConfig(dailyVerseTarget: number): Promise<void> {
    const existing = await this.db.goalConfig.get(0);
    const now = new Date();
    await this.db.goalConfig.put({
      id: 0,
      dailyVerseTarget,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    await this.refreshGoalConfig();
  }

  async clearGoalConfig(): Promise<void> {
    await this.db.goalConfig.clear();
    await this.refreshGoalConfig();
  }

  // ---------------------------------------------------------------------------
  // Earned badges (RE-16)
  // ---------------------------------------------------------------------------

  async getEarnedBadges(): Promise<EarnedBadge[]> {
    return this.db.earnedBadges.orderBy('earnedAt').toArray();
  }

  /**
   * Mark a badge as earned. Idempotent — if it's already earned, the original
   * earnedAt is kept. Returns true if this call was the one that earned it,
   * false if it was already earned (lets callers fire the toast exactly once).
   *
   * The `add()` is wrapped in try/catch because two concurrent BadgeService
   * evaluate() calls can both clear the pre-check but only one wins the
   * unique-key constraint. The loser converts to `false` and the toast fires
   * exactly once.
   */
  async earnBadge(badgeId: string): Promise<boolean> {
    if (!badgeId) return false;
    const existing = await this.db.earnedBadges.get(badgeId);
    if (existing) return false;
    try {
      await this.db.earnedBadges.add({ badgeId, earnedAt: new Date() });
    } catch {
      // Concurrent earn lost the race — already in the table.
      return false;
    }
    await this.refreshEarnedBadges();
    return true;
  }

  /** Wipe all earned badges. Used by the badge-reset escape hatch + clearAll. */
  async clearEarnedBadges(): Promise<void> {
    await this.db.earnedBadges.clear();
    await this.refreshEarnedBadges();
  }

  // ---------------------------------------------------------------------------
  // Enrolled reading plans (RE-10)
  // ---------------------------------------------------------------------------

  async getEnrolledPlans(): Promise<EnrolledPlan[]> {
    return this.db.enrolledPlans.toArray();
  }

  async getEnrollment(planId: string): Promise<EnrolledPlan | undefined> {
    return this.db.enrolledPlans.get(planId);
  }

  /** Enroll in (or re-enroll in — resets startedAt) a plan. */
  async enrollPlan(planId: string): Promise<void> {
    if (!planId) return;
    await this.db.enrolledPlans.put({ planId, startedAt: new Date() });
    await this.refreshEnrolledPlans();
  }

  async unenrollPlan(planId: string): Promise<void> {
    await this.db.enrolledPlans.delete(planId);
    await this.refreshEnrolledPlans();
  }

  async clearEnrolledPlans(): Promise<void> {
    await this.db.enrolledPlans.clear();
    await this.refreshEnrolledPlans();
  }

  /** Clear all bookmarks */
  async clearAll(): Promise<void> {
    await this.db.bookmarks.clear();
    await this.db.readingProgress.clear();
    await this.db.annotations.clear();
    await this.db.readVerses.clear();
    await this.db.goalConfig.clear();
    await this.db.earnedBadges.clear();
    await this.db.enrolledPlans.clear();
    await this.loadAll();
  }

  private extractBookId(path: string): string {
    // path like "/books/al-kafi:1:2:3" -> "al-kafi"
    // or "al-kafi:1:2:3" -> "al-kafi"
    const clean = path.replace(/^\/books\//, '');
    const colonIdx = clean.indexOf(':');
    return colonIdx > 0 ? clean.substring(0, colonIdx) : clean;
  }

  private async loadAll(): Promise<void> {
    await this.refreshBookmarks();
    await this.refreshProgress();
    await this.refreshAnnotations();
    await this.refreshReadVerses();
    await this.refreshGoalConfig();
    await this.refreshEarnedBadges();
    await this.refreshEnrolledPlans();
  }

  private async refreshEarnedBadges(): Promise<void> {
    const earned = await this.getEarnedBadges();
    this.earnedBadgesSubject.next(earned);
  }

  private async refreshEnrolledPlans(): Promise<void> {
    const plans = await this.getEnrolledPlans();
    this.enrolledPlansSubject.next(plans);
  }

  private async refreshBookmarks(): Promise<void> {
    const bookmarks = await this.getBookmarks();
    this.bookmarksSubject.next(bookmarks);
  }

  private async refreshProgress(): Promise<void> {
    const progress = await this.getReadingProgress();
    this.progressSubject.next(progress);
  }

  private async refreshAnnotations(): Promise<void> {
    const annotations = await this.getAnnotations();
    this.annotationsSubject.next(annotations);
  }

  private async refreshReadVerses(): Promise<void> {
    const rv = await this.getReadVerses();
    this.readVersesSubject.next(rv);
  }

  private async refreshGoalConfig(): Promise<void> {
    const cfg = await this.getGoalConfig();
    this.goalConfigSubject.next(cfg);
  }
}
