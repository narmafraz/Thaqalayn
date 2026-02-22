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

class ThaqalaynDb extends Dexie {
  bookmarks!: Table<Bookmark, number>;
  readingProgress!: Table<ReadingProgress, string>;
  annotations!: Table<Annotation, number>;

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

  bookmarks$: Observable<Bookmark[]> = this.bookmarksSubject.asObservable();
  readingProgress$: Observable<ReadingProgress[]> = this.progressSubject.asObservable();
  annotations$: Observable<Annotation[]> = this.annotationsSubject.asObservable();

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

  /** Export all bookmarks and annotations as JSON */
  async exportBookmarks(): Promise<string> {
    const bookmarks = await this.getBookmarks();
    const progress = await this.getReadingProgress();
    const annotations = await this.getAnnotations();
    return JSON.stringify({ bookmarks, readingProgress: progress, annotations }, null, 2);
  }

  /** Import bookmarks and annotations from JSON */
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

  /** Clear all bookmarks */
  async clearAll(): Promise<void> {
    await this.db.bookmarks.clear();
    await this.db.readingProgress.clear();
    await this.db.annotations.clear();
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
}
