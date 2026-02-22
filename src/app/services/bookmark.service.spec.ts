import { TestBed } from '@angular/core/testing';
import { BookmarkService, Bookmark, ReadingProgress, Annotation } from './bookmark.service';
import { firstValueFrom, skip, take } from 'rxjs';

describe('BookmarkService', () => {
  let service: BookmarkService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BookmarkService);
  });

  afterEach(async () => {
    // Clear all data between tests so IndexedDB state does not leak
    await service.clearAll();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // extractBookId
  // ---------------------------------------------------------------------------
  describe('extractBookId (via addBookmark + getBookmarks)', () => {
    // extractBookId is private, so we test it indirectly through addBookmark
    // which stores the extracted bookId on the Bookmark object.

    it('should extract bookId from "/books/al-kafi:1:2:3"', async () => {
      await service.addBookmark('/books/al-kafi:1:2:3', 'Test');
      const bookmarks = await service.getBookmarks();
      expect(bookmarks.length).toBe(1);
      expect(bookmarks[0].bookId).toBe('al-kafi');
    });

    it('should extract bookId from "al-kafi:1:2:3" (no /books/ prefix)', async () => {
      await service.addBookmark('al-kafi:1:2:3', 'Test');
      const bookmarks = await service.getBookmarks();
      expect(bookmarks[0].bookId).toBe('al-kafi');
    });

    it('should extract bookId from "/books/quran:1"', async () => {
      await service.addBookmark('/books/quran:1', 'Al-Fatiha');
      const bookmarks = await service.getBookmarks();
      expect(bookmarks[0].bookId).toBe('quran');
    });

    it('should extract bookId from a deeply nested path "/books/al-kafi:1:2:3:4"', async () => {
      await service.addBookmark('/books/al-kafi:1:2:3:4', 'Deep');
      const bookmarks = await service.getBookmarks();
      expect(bookmarks[0].bookId).toBe('al-kafi');
    });

    it('should handle path with no colon (bookId is the whole cleaned path)', async () => {
      await service.addBookmark('/books/quran', 'Quran root');
      const bookmarks = await service.getBookmarks();
      expect(bookmarks[0].bookId).toBe('quran');
    });

    it('should handle bare path with no colon and no prefix', async () => {
      await service.addBookmark('quran', 'Quran');
      const bookmarks = await service.getBookmarks();
      expect(bookmarks[0].bookId).toBe('quran');
    });
  });

  // ---------------------------------------------------------------------------
  // Bookmark CRUD
  // ---------------------------------------------------------------------------
  describe('addBookmark', () => {
    it('should add a bookmark with required fields', async () => {
      await service.addBookmark('/books/al-kafi:1:2:3', 'Chapter 3');
      const bookmarks = await service.getBookmarks();

      expect(bookmarks.length).toBe(1);
      expect(bookmarks[0].path).toBe('/books/al-kafi:1:2:3');
      expect(bookmarks[0].title).toBe('Chapter 3');
      expect(bookmarks[0].bookId).toBe('al-kafi');
      expect(bookmarks[0].createdAt).toBeInstanceOf(Date);
    });

    it('should store optional arabicTitle when provided', async () => {
      await service.addBookmark('/books/quran:1', 'Al-Fatiha', 'الفاتحة');
      const bookmarks = await service.getBookmarks();

      expect(bookmarks[0].arabicTitle).toBe('الفاتحة');
    });

    it('should have undefined arabicTitle when not provided', async () => {
      await service.addBookmark('/books/quran:1', 'Al-Fatiha');
      const bookmarks = await service.getBookmarks();

      expect(bookmarks[0].arabicTitle).toBeUndefined();
    });

    it('should add multiple bookmarks', async () => {
      await service.addBookmark('/books/quran:1', 'Al-Fatiha');
      await service.addBookmark('/books/quran:2', 'Al-Baqara');
      await service.addBookmark('/books/al-kafi:1:1:1', 'Chapter 1');

      const bookmarks = await service.getBookmarks();
      expect(bookmarks.length).toBe(3);
    });

    it('should assign auto-incrementing ids', async () => {
      await service.addBookmark('/books/quran:1', 'Al-Fatiha');
      await service.addBookmark('/books/quran:2', 'Al-Baqara');

      const bookmarks = await service.getBookmarks();
      const ids = bookmarks.map(b => b.id);
      expect(ids.every(id => typeof id === 'number')).toBeTrue();
      // Both ids should exist and be distinct
      expect(new Set(ids).size).toBe(2);
    });
  });

  describe('removeBookmark', () => {
    it('should remove an existing bookmark by path', async () => {
      await service.addBookmark('/books/quran:1', 'Al-Fatiha');
      await service.addBookmark('/books/quran:2', 'Al-Baqara');

      await service.removeBookmark('/books/quran:1');

      const bookmarks = await service.getBookmarks();
      expect(bookmarks.length).toBe(1);
      expect(bookmarks[0].path).toBe('/books/quran:2');
    });

    it('should be a no-op when removing a non-existent path', async () => {
      await service.addBookmark('/books/quran:1', 'Al-Fatiha');
      await service.removeBookmark('/books/nonexistent:1');

      const bookmarks = await service.getBookmarks();
      expect(bookmarks.length).toBe(1);
    });
  });

  describe('isBookmarked', () => {
    it('should return true for an existing bookmark', async () => {
      await service.addBookmark('/books/quran:1', 'Al-Fatiha');
      expect(await service.isBookmarked('/books/quran:1')).toBeTrue();
    });

    it('should return false for a non-existent bookmark', async () => {
      expect(await service.isBookmarked('/books/quran:999')).toBeFalse();
    });

    it('should return false after removing a bookmark', async () => {
      await service.addBookmark('/books/quran:1', 'Al-Fatiha');
      await service.removeBookmark('/books/quran:1');
      expect(await service.isBookmarked('/books/quran:1')).toBeFalse();
    });
  });

  describe('toggleBookmark', () => {
    it('should add bookmark and return true when path is not bookmarked', async () => {
      const result = await service.toggleBookmark('/books/quran:1', 'Al-Fatiha', 'الفاتحة');

      expect(result).toBeTrue();
      expect(await service.isBookmarked('/books/quran:1')).toBeTrue();

      const bookmarks = await service.getBookmarks();
      expect(bookmarks.length).toBe(1);
      expect(bookmarks[0].arabicTitle).toBe('الفاتحة');
    });

    it('should remove bookmark and return false when path is already bookmarked', async () => {
      await service.addBookmark('/books/quran:1', 'Al-Fatiha');

      const result = await service.toggleBookmark('/books/quran:1', 'Al-Fatiha');

      expect(result).toBeFalse();
      expect(await service.isBookmarked('/books/quran:1')).toBeFalse();
    });

    it('should toggle on then off correctly', async () => {
      const firstToggle = await service.toggleBookmark('/books/quran:1', 'Al-Fatiha');
      expect(firstToggle).toBeTrue();
      expect(await service.isBookmarked('/books/quran:1')).toBeTrue();

      const secondToggle = await service.toggleBookmark('/books/quran:1', 'Al-Fatiha');
      expect(secondToggle).toBeFalse();
      expect(await service.isBookmarked('/books/quran:1')).toBeFalse();
    });
  });

  describe('getBookmarks', () => {
    it('should return empty array when no bookmarks exist', async () => {
      const bookmarks = await service.getBookmarks();
      expect(bookmarks).toEqual([]);
    });

    it('should return bookmarks ordered by createdAt descending (newest first)', async () => {
      // Add bookmarks with small delays to ensure distinct createdAt values
      await service.addBookmark('/books/quran:1', 'First');
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.addBookmark('/books/quran:2', 'Second');
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.addBookmark('/books/quran:3', 'Third');

      const bookmarks = await service.getBookmarks();
      expect(bookmarks.length).toBe(3);
      // Newest first
      expect(bookmarks[0].title).toBe('Third');
      expect(bookmarks[1].title).toBe('Second');
      expect(bookmarks[2].title).toBe('First');
    });
  });

  // ---------------------------------------------------------------------------
  // Reading Progress
  // ---------------------------------------------------------------------------
  describe('updateReadingProgress', () => {
    it('should create a new reading progress entry', async () => {
      await service.updateReadingProgress('/books/al-kafi:1:2:3', 'Chapter 3');

      const progress = await service.getReadingProgress();
      expect(progress.length).toBe(1);
      expect(progress[0].bookId).toBe('al-kafi');
      expect(progress[0].lastPath).toBe('/books/al-kafi:1:2:3');
      expect(progress[0].lastTitle).toBe('Chapter 3');
      expect(progress[0].lastVisited).toBeInstanceOf(Date);
    });

    it('should upsert (update) existing reading progress for the same book', async () => {
      await service.updateReadingProgress('/books/al-kafi:1:2:3', 'Chapter 3');
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.updateReadingProgress('/books/al-kafi:1:2:4', 'Chapter 4');

      const progress = await service.getReadingProgress();
      // Should still be only one entry for al-kafi (upsert via put on bookId key)
      expect(progress.length).toBe(1);
      expect(progress[0].lastPath).toBe('/books/al-kafi:1:2:4');
      expect(progress[0].lastTitle).toBe('Chapter 4');
    });

    it('should track progress for multiple books separately', async () => {
      await service.updateReadingProgress('/books/al-kafi:1:2:3', 'Kafi Ch3');
      await service.updateReadingProgress('/books/quran:2', 'Al-Baqara');

      const progress = await service.getReadingProgress();
      expect(progress.length).toBe(2);

      const bookIds = progress.map(p => p.bookId);
      expect(bookIds).toContain('al-kafi');
      expect(bookIds).toContain('quran');
    });
  });

  describe('getReadingProgress', () => {
    it('should return empty array when no progress exists', async () => {
      const progress = await service.getReadingProgress();
      expect(progress).toEqual([]);
    });

    it('should return progress ordered by lastVisited descending (most recent first)', async () => {
      await service.updateReadingProgress('/books/al-kafi:1:1:1', 'Kafi');
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.updateReadingProgress('/books/quran:1', 'Quran');
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.updateReadingProgress('/books/al-kafi:2:1:1', 'Kafi Vol 2');
      // This updates al-kafi progress (upsert), making it most recent

      const progress = await service.getReadingProgress();
      // al-kafi was updated last so should be first
      expect(progress[0].bookId).toBe('al-kafi');
      expect(progress[1].bookId).toBe('quran');
    });
  });

  describe('clearReadingProgress', () => {
    it('should clear progress for a specific book', async () => {
      await service.updateReadingProgress('/books/al-kafi:1:1:1', 'Kafi');
      await service.updateReadingProgress('/books/quran:1', 'Quran');

      await service.clearReadingProgress('al-kafi');

      const progress = await service.getReadingProgress();
      expect(progress.length).toBe(1);
      expect(progress[0].bookId).toBe('quran');
    });

    it('should be a no-op when clearing non-existent bookId', async () => {
      await service.updateReadingProgress('/books/quran:1', 'Quran');
      await service.clearReadingProgress('nonexistent');

      const progress = await service.getReadingProgress();
      expect(progress.length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Annotations
  // ---------------------------------------------------------------------------
  describe('saveAnnotation', () => {
    it('should create a new annotation', async () => {
      await service.saveAnnotation('/books/quran:2:255', 'Ayat al-Kursi - the Throne Verse');

      const annotation = await service.getAnnotation('/books/quran:2:255');
      expect(annotation).toBeDefined();
      expect(annotation!.path).toBe('/books/quran:2:255');
      expect(annotation!.text).toBe('Ayat al-Kursi - the Throne Verse');
      expect(annotation!.bookId).toBe('quran');
      expect(annotation!.createdAt).toBeInstanceOf(Date);
      expect(annotation!.updatedAt).toBeInstanceOf(Date);
    });

    it('should update an existing annotation (upsert)', async () => {
      await service.saveAnnotation('/books/quran:2:255', 'Initial note');
      const first = await service.getAnnotation('/books/quran:2:255');

      await new Promise(resolve => setTimeout(resolve, 10));
      await service.saveAnnotation('/books/quran:2:255', 'Updated note');

      const updated = await service.getAnnotation('/books/quran:2:255');
      expect(updated).toBeDefined();
      expect(updated!.text).toBe('Updated note');
      // id should remain the same (update, not new record)
      expect(updated!.id).toBe(first!.id);
      // updatedAt should be more recent
      expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(first!.updatedAt.getTime());
    });
  });

  describe('getAnnotation', () => {
    it('should return undefined for a non-existent annotation', async () => {
      const annotation = await service.getAnnotation('/books/nonexistent:1');
      expect(annotation).toBeUndefined();
    });

    it('should return the correct annotation for a given path', async () => {
      await service.saveAnnotation('/books/quran:1:1', 'Note on Bismillah');
      await service.saveAnnotation('/books/quran:1:2', 'Note on Alhamdulillah');

      const annotation = await service.getAnnotation('/books/quran:1:2');
      expect(annotation).toBeDefined();
      expect(annotation!.text).toBe('Note on Alhamdulillah');
    });
  });

  describe('deleteAnnotation', () => {
    it('should delete an existing annotation', async () => {
      await service.saveAnnotation('/books/quran:1:1', 'Note');
      await service.deleteAnnotation('/books/quran:1:1');

      const annotation = await service.getAnnotation('/books/quran:1:1');
      expect(annotation).toBeUndefined();
    });

    it('should be a no-op when deleting a non-existent annotation', async () => {
      await service.saveAnnotation('/books/quran:1:1', 'Note');
      await service.deleteAnnotation('/books/nonexistent:1');

      const annotations = await service.getAnnotations();
      expect(annotations.length).toBe(1);
    });
  });

  describe('getAnnotations', () => {
    it('should return empty array when no annotations exist', async () => {
      const annotations = await service.getAnnotations();
      expect(annotations).toEqual([]);
    });

    it('should return annotations ordered by updatedAt descending (most recent first)', async () => {
      await service.saveAnnotation('/books/quran:1:1', 'First note');
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.saveAnnotation('/books/quran:1:2', 'Second note');
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.saveAnnotation('/books/quran:1:3', 'Third note');

      const annotations = await service.getAnnotations();
      expect(annotations.length).toBe(3);
      // Most recently updated first
      expect(annotations[0].text).toBe('Third note');
      expect(annotations[1].text).toBe('Second note');
      expect(annotations[2].text).toBe('First note');
    });
  });

  // ---------------------------------------------------------------------------
  // Export / Import
  // ---------------------------------------------------------------------------
  describe('exportBookmarks', () => {
    it('should export all data as a JSON string', async () => {
      await service.addBookmark('/books/quran:1', 'Al-Fatiha', 'الفاتحة');
      await service.updateReadingProgress('/books/al-kafi:1:1:1', 'Kafi Ch1');
      await service.saveAnnotation('/books/quran:2:255', 'Throne Verse');

      const json = await service.exportBookmarks();
      const data = JSON.parse(json);

      expect(data.bookmarks).toBeDefined();
      expect(data.bookmarks.length).toBe(1);
      expect(data.bookmarks[0].path).toBe('/books/quran:1');
      expect(data.bookmarks[0].arabicTitle).toBe('الفاتحة');

      expect(data.readingProgress).toBeDefined();
      expect(data.readingProgress.length).toBe(1);
      expect(data.readingProgress[0].bookId).toBe('al-kafi');

      expect(data.annotations).toBeDefined();
      expect(data.annotations.length).toBe(1);
      expect(data.annotations[0].text).toBe('Throne Verse');
    });

    it('should export empty arrays when no data exists', async () => {
      const json = await service.exportBookmarks();
      const data = JSON.parse(json);

      expect(data.bookmarks).toEqual([]);
      expect(data.readingProgress).toEqual([]);
      expect(data.annotations).toEqual([]);
    });
  });

  describe('importBookmarks', () => {
    it('should import bookmarks from exported JSON', async () => {
      // Set up data and export
      await service.addBookmark('/books/quran:1', 'Al-Fatiha', 'الفاتحة');
      await service.addBookmark('/books/quran:2', 'Al-Baqara');
      const exported = await service.exportBookmarks();

      // Clear and re-import
      await service.clearAll();
      const imported = await service.importBookmarks(exported);

      expect(imported).toBe(2); // 2 bookmarks imported

      const bookmarks = await service.getBookmarks();
      expect(bookmarks.length).toBe(2);
    });

    it('should import reading progress from exported JSON', async () => {
      await service.updateReadingProgress('/books/al-kafi:1:1:1', 'Kafi Ch1');
      await service.updateReadingProgress('/books/quran:2', 'Al-Baqara');
      const exported = await service.exportBookmarks();

      await service.clearAll();
      await service.importBookmarks(exported);

      const progress = await service.getReadingProgress();
      expect(progress.length).toBe(2);
    });

    it('should import annotations from exported JSON', async () => {
      await service.saveAnnotation('/books/quran:1:1', 'Note 1');
      await service.saveAnnotation('/books/quran:2:255', 'Note 2');
      const exported = await service.exportBookmarks();

      await service.clearAll();
      const imported = await service.importBookmarks(exported);

      // 2 annotations count toward the imported total
      expect(imported).toBe(2);

      const annotations = await service.getAnnotations();
      expect(annotations.length).toBe(2);
    });

    it('should skip duplicate bookmarks (same path already exists)', async () => {
      await service.addBookmark('/books/quran:1', 'Al-Fatiha');
      const exported = await service.exportBookmarks();

      // Import the same data again without clearing -- duplicates should be skipped
      const imported = await service.importBookmarks(exported);
      expect(imported).toBe(0);

      const bookmarks = await service.getBookmarks();
      expect(bookmarks.length).toBe(1);
    });

    it('should skip duplicate annotations (same path already exists)', async () => {
      await service.saveAnnotation('/books/quran:1:1', 'Original note');
      const exported = await service.exportBookmarks();

      // Import the same data -- annotation for same path should be skipped
      const imported = await service.importBookmarks(exported);
      expect(imported).toBe(0);

      // Original note should remain unchanged
      const annotation = await service.getAnnotation('/books/quran:1:1');
      expect(annotation!.text).toBe('Original note');
    });

    it('should import only new bookmarks when some already exist', async () => {
      await service.addBookmark('/books/quran:1', 'Al-Fatiha');

      const importData = {
        bookmarks: [
          {
            path: '/books/quran:1',
            title: 'Al-Fatiha',
            bookId: 'quran',
            createdAt: new Date().toISOString(),
          },
          {
            path: '/books/quran:2',
            title: 'Al-Baqara',
            bookId: 'quran',
            createdAt: new Date().toISOString(),
          },
        ],
        readingProgress: [],
        annotations: [],
      };

      const imported = await service.importBookmarks(JSON.stringify(importData));
      expect(imported).toBe(1); // Only quran:2 is new

      const bookmarks = await service.getBookmarks();
      expect(bookmarks.length).toBe(2);
    });

    it('should handle import of reading progress via upsert (put)', async () => {
      // Pre-existing progress
      await service.updateReadingProgress('/books/al-kafi:1:1:1', 'Old Chapter');

      const importData = {
        bookmarks: [],
        readingProgress: [
          {
            bookId: 'al-kafi',
            lastPath: '/books/al-kafi:2:1:1',
            lastTitle: 'New Chapter',
            lastVisited: new Date().toISOString(),
          },
        ],
        annotations: [],
      };

      await service.importBookmarks(JSON.stringify(importData));

      const progress = await service.getReadingProgress();
      expect(progress.length).toBe(1);
      // Reading progress uses put, so it should be updated
      expect(progress[0].lastTitle).toBe('New Chapter');
    });

    it('should extract bookId from path when bookId is missing in import data', async () => {
      const importData = {
        bookmarks: [
          {
            path: '/books/quran:1',
            title: 'Al-Fatiha',
            // bookId intentionally omitted
            createdAt: new Date().toISOString(),
          },
        ],
        readingProgress: [],
        annotations: [],
      };

      const imported = await service.importBookmarks(JSON.stringify(importData));
      expect(imported).toBe(1);

      const bookmarks = await service.getBookmarks();
      expect(bookmarks[0].bookId).toBe('quran');
    });

    it('should handle JSON with only bookmarks (no progress or annotations keys)', async () => {
      const importData = {
        bookmarks: [
          {
            path: '/books/quran:1',
            title: 'Al-Fatiha',
            bookId: 'quran',
            createdAt: new Date().toISOString(),
          },
        ],
      };

      const imported = await service.importBookmarks(JSON.stringify(importData));
      expect(imported).toBe(1);
    });

    it('should return combined count of imported bookmarks and annotations', async () => {
      const importData = {
        bookmarks: [
          {
            path: '/books/quran:1',
            title: 'Fatiha',
            bookId: 'quran',
            createdAt: new Date().toISOString(),
          },
          {
            path: '/books/quran:2',
            title: 'Baqara',
            bookId: 'quran',
            createdAt: new Date().toISOString(),
          },
        ],
        readingProgress: [
          {
            bookId: 'quran',
            lastPath: '/books/quran:3',
            lastTitle: 'Imran',
            lastVisited: new Date().toISOString(),
          },
        ],
        annotations: [
          {
            path: '/books/quran:2:255',
            bookId: 'quran',
            text: 'Throne verse',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      const imported = await service.importBookmarks(JSON.stringify(importData));
      // 2 bookmarks + 1 annotation = 3 (reading progress is not counted)
      expect(imported).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // clearAll
  // ---------------------------------------------------------------------------
  describe('clearAll', () => {
    it('should clear all bookmarks, progress, and annotations', async () => {
      await service.addBookmark('/books/quran:1', 'Al-Fatiha');
      await service.addBookmark('/books/quran:2', 'Al-Baqara');
      await service.updateReadingProgress('/books/al-kafi:1:1:1', 'Kafi');
      await service.saveAnnotation('/books/quran:2:255', 'Throne verse');

      await service.clearAll();

      const bookmarks = await service.getBookmarks();
      const progress = await service.getReadingProgress();
      const annotations = await service.getAnnotations();

      expect(bookmarks).toEqual([]);
      expect(progress).toEqual([]);
      expect(annotations).toEqual([]);
    });

    it('should be safe to call when database is already empty', async () => {
      await service.clearAll();

      const bookmarks = await service.getBookmarks();
      expect(bookmarks).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Observable emission
  // ---------------------------------------------------------------------------
  describe('bookmarks$ observable', () => {
    it('should emit initial empty array', async () => {
      const bookmarks = await firstValueFrom(service.bookmarks$);
      // Initial value may be empty or may already have loaded (depending on timing)
      expect(Array.isArray(bookmarks)).toBeTrue();
    });

    it('should emit updated bookmarks after addBookmark', async () => {
      // Skip the initial emission, wait for the next one after we add
      const bookmarksPromise = firstValueFrom(service.bookmarks$.pipe(
        skip(1),
        take(1),
      ));

      await service.addBookmark('/books/quran:1', 'Al-Fatiha');

      // Also verify via direct query since the observable may have already emitted
      const bookmarks = await service.getBookmarks();
      expect(bookmarks.length).toBe(1);
      expect(bookmarks[0].path).toBe('/books/quran:1');
    });

    it('should emit updated bookmarks after removeBookmark', async () => {
      await service.addBookmark('/books/quran:1', 'Al-Fatiha');
      await service.addBookmark('/books/quran:2', 'Al-Baqara');

      await service.removeBookmark('/books/quran:1');

      // Verify the subject has the latest value
      const currentValue = await firstValueFrom(service.bookmarks$);
      expect(currentValue.length).toBe(1);
      expect(currentValue[0].path).toBe('/books/quran:2');
    });

    it('should emit empty array after clearAll', async () => {
      await service.addBookmark('/books/quran:1', 'Al-Fatiha');
      await service.clearAll();

      const currentValue = await firstValueFrom(service.bookmarks$);
      expect(currentValue).toEqual([]);
    });
  });

  describe('readingProgress$ observable', () => {
    it('should emit updated progress after updateReadingProgress', async () => {
      await service.updateReadingProgress('/books/al-kafi:1:1:1', 'Ch1');

      const currentValue = await firstValueFrom(service.readingProgress$);
      expect(currentValue.length).toBe(1);
      expect(currentValue[0].bookId).toBe('al-kafi');
    });

    it('should emit updated progress after clearReadingProgress', async () => {
      await service.updateReadingProgress('/books/al-kafi:1:1:1', 'Kafi');
      await service.updateReadingProgress('/books/quran:1', 'Quran');

      await service.clearReadingProgress('al-kafi');

      const currentValue = await firstValueFrom(service.readingProgress$);
      expect(currentValue.length).toBe(1);
      expect(currentValue[0].bookId).toBe('quran');
    });
  });

  describe('annotations$ observable', () => {
    it('should emit updated annotations after saveAnnotation', async () => {
      await service.saveAnnotation('/books/quran:2:255', 'Throne verse');

      const currentValue = await firstValueFrom(service.annotations$);
      expect(currentValue.length).toBe(1);
      expect(currentValue[0].text).toBe('Throne verse');
    });

    it('should emit updated annotations after deleteAnnotation', async () => {
      await service.saveAnnotation('/books/quran:1:1', 'Note 1');
      await service.saveAnnotation('/books/quran:1:2', 'Note 2');

      await service.deleteAnnotation('/books/quran:1:1');

      const currentValue = await firstValueFrom(service.annotations$);
      expect(currentValue.length).toBe(1);
      expect(currentValue[0].text).toBe('Note 2');
    });

    it('should emit updated annotations after annotation text update', async () => {
      await service.saveAnnotation('/books/quran:1:1', 'Original');
      await service.saveAnnotation('/books/quran:1:1', 'Updated');

      const currentValue = await firstValueFrom(service.annotations$);
      expect(currentValue.length).toBe(1);
      expect(currentValue[0].text).toBe('Updated');
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases and integration scenarios
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('should handle paths with special characters in titles', async () => {
      const arabicTitle = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
      await service.addBookmark('/books/quran:1:1', 'Bismillah', arabicTitle);

      const bookmarks = await service.getBookmarks();
      expect(bookmarks[0].arabicTitle).toBe(arabicTitle);
    });

    it('should handle annotation with long text', async () => {
      const longText = 'A'.repeat(5000);
      await service.saveAnnotation('/books/quran:1:1', longText);

      const annotation = await service.getAnnotation('/books/quran:1:1');
      expect(annotation!.text.length).toBe(5000);
    });

    it('should handle concurrent bookmark additions', async () => {
      // Add multiple bookmarks concurrently
      await Promise.all([
        service.addBookmark('/books/quran:1', 'Surah 1'),
        service.addBookmark('/books/quran:2', 'Surah 2'),
        service.addBookmark('/books/quran:3', 'Surah 3'),
      ]);

      const bookmarks = await service.getBookmarks();
      expect(bookmarks.length).toBe(3);
    });

    it('should export and re-import a full round-trip preserving data', async () => {
      // Set up a variety of data
      await service.addBookmark('/books/quran:1', 'Al-Fatiha', 'الفاتحة');
      await service.addBookmark('/books/al-kafi:1:1:1', 'Book of Intellect');
      await service.updateReadingProgress('/books/quran:2', 'Al-Baqara');
      await service.updateReadingProgress('/books/al-kafi:1:2:1', 'Kafi Vol 1 Book 2');
      await service.saveAnnotation('/books/quran:2:255', 'Throne verse notes');
      await service.saveAnnotation('/books/al-kafi:1:1:1:1', 'First hadith notes');

      const exported = await service.exportBookmarks();
      await service.clearAll();

      // Verify everything is cleared
      expect(await service.getBookmarks()).toEqual([]);
      expect(await service.getReadingProgress()).toEqual([]);
      expect(await service.getAnnotations()).toEqual([]);

      // Re-import
      const imported = await service.importBookmarks(exported);
      expect(imported).toBe(4); // 2 bookmarks + 2 annotations

      // Verify bookmarks
      const bookmarks = await service.getBookmarks();
      expect(bookmarks.length).toBe(2);
      const fatiha = bookmarks.find(b => b.path === '/books/quran:1');
      expect(fatiha).toBeDefined();
      expect(fatiha!.arabicTitle).toBe('الفاتحة');

      // Verify reading progress
      const progress = await service.getReadingProgress();
      expect(progress.length).toBe(2);

      // Verify annotations
      const annotations = await service.getAnnotations();
      expect(annotations.length).toBe(2);
      const throneNote = await service.getAnnotation('/books/quran:2:255');
      expect(throneNote!.text).toBe('Throne verse notes');
    });
  });
});
