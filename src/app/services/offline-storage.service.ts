import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Book } from '@app/models';
import { environment } from '@env/environment';
import { BehaviorSubject, Observable } from 'rxjs';

const DB_NAME = 'thaqalayn-offline';
const DB_VERSION = 2;
const STORE_NAME = 'books';
const META_STORE = 'meta';
const CACHE_STORE = 'cache';

export interface OfflineBookMeta {
  bookId: string;
  downloadedAt: Date;
  fileCount: number;
  sizeBytes: number;
}

export interface DownloadProgress {
  bookId: string;
  loaded: number;
  total: number;
  status: 'idle' | 'downloading' | 'complete' | 'error';
  error?: string;
}

/** Book IDs available for offline download, with their manifest URLs */
const BOOK_MANIFESTS: Record<string, string> = {
  'quran': 'books/complete/quran.json',
  'al-kafi': 'books/complete/al-kafi.json',
};

@Injectable({
  providedIn: 'root'
})
export class OfflineStorageService {

  private db: IDBDatabase | null = null;
  private progressSubject = new BehaviorSubject<DownloadProgress>({
    bookId: '', loaded: 0, total: 0, status: 'idle'
  });

  /** In-memory cache of parsed complete book data to avoid repeated JSON parsing */
  private parsedBookCache = new Map<string, any>();

  progress$: Observable<DownloadProgress> = this.progressSubject.asObservable();

  constructor(private http: HttpClient) {
    this.openDb();
    this.checkDataVersion();
  }

  /** Get list of books available for offline download */
  getAvailableBooks(): string[] {
    return Object.keys(BOOK_MANIFESTS);
  }

  /** Download a complete book for offline access */
  async downloadBook(bookId: string): Promise<void> {
    const manifestPath = BOOK_MANIFESTS[bookId];
    if (!manifestPath) {
      throw new Error(`Unknown book: ${bookId}`);
    }

    this.progressSubject.next({
      bookId, loaded: 0, total: 1, status: 'downloading'
    });

    try {
      const url = environment.apiBaseUrl + manifestPath;
      const data = await this.http.get(url, { responseType: 'text' }).toPromise();
      if (!data) throw new Error('Empty response');

      const db = await this.getDb();
      const sizeBytes = new Blob([data]).size;

      await this.putInStore(db, STORE_NAME, bookId, data);
      await this.putInStore(db, META_STORE, bookId, {
        bookId,
        downloadedAt: new Date(),
        fileCount: 1,
        sizeBytes,
      } as OfflineBookMeta);

      this.progressSubject.next({
        bookId, loaded: 1, total: 1, status: 'complete'
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      this.progressSubject.next({
        bookId, loaded: 0, total: 1, status: 'error', error: message
      });
      throw err;
    }
  }

  /** Remove a downloaded book from offline storage */
  async removeBook(bookId: string): Promise<void> {
    const db = await this.getDb();
    await this.deleteFromStore(db, STORE_NAME, bookId);
    await this.deleteFromStore(db, META_STORE, bookId);
    this.parsedBookCache.delete(bookId);
  }

  /** Check if a book is available offline */
  async isBookDownloaded(bookId: string): Promise<boolean> {
    try {
      const db = await this.getDb();
      const meta = await this.getFromStore<OfflineBookMeta>(db, META_STORE, bookId);
      return meta !== undefined;
    } catch {
      return false;
    }
  }

  /** Get metadata for all downloaded books */
  async getDownloadedBooks(): Promise<OfflineBookMeta[]> {
    try {
      const db = await this.getDb();
      return this.getAllFromStore<OfflineBookMeta>(db, META_STORE);
    } catch {
      return [];
    }
  }

  /** Get stored offline data for a book */
  async getBookData(bookId: string): Promise<string | undefined> {
    try {
      const db = await this.getDb();
      return this.getFromStore<string>(db, STORE_NAME, bookId);
    } catch {
      return undefined;
    }
  }

  /** Look up a specific part from a downloaded complete book.
   *  Returns the Book response as the API would, or null if not found offline. */
  async getPartFromBook(index: string): Promise<Book | null> {
    const bookId = index.split(':')[0];
    if (!BOOK_MANIFESTS[bookId]) return null;

    try {
      if (!(await this.isBookDownloaded(bookId))) return null;

      if (!this.parsedBookCache.has(bookId)) {
        const rawData = await this.getBookData(bookId);
        if (!rawData) return null;
        this.parsedBookCache.set(bookId, JSON.parse(rawData));
      }

      const completeBook = this.parsedBookCache.get(bookId);
      return this.findPart(completeBook, index);
    } catch {
      return null;
    }
  }

  /** Cache an individual API response for offline re-reading */
  async cacheResponse(index: string, data: Book): Promise<void> {
    try {
      const db = await this.getDb();
      await this.putInStore(db, CACHE_STORE, index, JSON.stringify(data));
    } catch {
      // Silently fail — caching is best-effort
    }
  }

  /** Retrieve a cached API response */
  async getCachedResponse(index: string): Promise<Book | null> {
    try {
      const db = await this.getDb();
      const raw = await this.getFromStore<string>(db, CACHE_STORE, index);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private findPart(book: any, targetIndex: string): Book | null {
    if (!book) return null;

    const data = book.data || book;

    // Check if this node matches
    if (book.index === targetIndex || data.index === targetIndex) {
      if (book.kind) return book as Book;
      // Construct the Book wrapper
      const hasVerses = data.verses && data.verses.length > 0;
      const hasSubChapters = data.chapters && data.chapters.length > 0;
      const kind = hasVerses ? 'verse_list' : 'chapter_list';
      return { kind, index: targetIndex, data } as Book;
    }

    // Search in sub-chapters
    const chapters = data.chapters || [];
    for (const chapter of chapters) {
      if (chapter.index === targetIndex) {
        const hasVerses = chapter.verses && chapter.verses.length > 0;
        const kind = hasVerses ? 'verse_list' : 'chapter_list';
        return { kind, index: targetIndex, data: chapter } as Book;
      }
      // Recurse only if target starts with this chapter's index
      if (targetIndex.startsWith(chapter.index + ':')) {
        const found = this.findPart({ index: chapter.index, data: chapter }, targetIndex);
        if (found) return found;
      }
    }

    return null;
  }

  /** Check if data version has changed and clear cache if so */
  private async checkDataVersion(): Promise<void> {
    try {
      const url = environment.apiBaseUrl + 'index/data_version.json';
      const data = await this.http.get<{ version: string }>(url).toPromise();
      if (!data?.version) return;

      const db = await this.getDb();
      const stored = await this.getFromStore<string>(db, META_STORE, '_data_version');
      if (stored === data.version) return;

      // Version changed — clear auto-cached responses (not downloaded books)
      await this.clearStore(db, CACHE_STORE);
      await this.putInStore(db, META_STORE, '_data_version', data.version);
      console.log(`Data version updated: ${stored || '(none)'} → ${data.version}, cache cleared`);
    } catch {
      // Network error — skip version check (offline)
    }
  }

  private clearStore(db: IDBDatabase, storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // -- IndexedDB helpers --

  private openDb(): void {
    if (typeof indexedDB === 'undefined') return;

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE);
      }
    };

    request.onsuccess = () => {
      this.db = request.result;
    };
  }

  private getDb(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE);
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private putInStore(db: IDBDatabase, storeName: string, key: string, value: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private getFromStore<T>(db: IDBDatabase, storeName: string, key: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  private getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  private deleteFromStore(db: IDBDatabase, storeName: string, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
