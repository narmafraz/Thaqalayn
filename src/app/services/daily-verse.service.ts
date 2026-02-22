import { Injectable } from '@angular/core';
import { BooksService } from './books.service';
import { Observable, of, map, catchError, shareReplay, switchMap } from 'rxjs';
import { Book } from '../models/book';

export interface DailyVerse {
  path: string;
  bookLabel: string;
  arabicText: string;
  translationText: string;
  translatorId: string;
  chapterTitle: string;
  reference: string;
}

// Al-Kafi book-level paths (volume:book) — each has sub-chapters with hadiths
const KAFI_BOOKS = [
  'al-kafi:1:1', 'al-kafi:1:2', 'al-kafi:1:3', 'al-kafi:1:4',
  'al-kafi:2:1', 'al-kafi:2:2', 'al-kafi:2:3', 'al-kafi:2:4',
  'al-kafi:3:1', 'al-kafi:3:2', 'al-kafi:3:3', 'al-kafi:3:4', 'al-kafi:3:5',
  'al-kafi:4:1', 'al-kafi:4:2', 'al-kafi:4:3',
  'al-kafi:5:1', 'al-kafi:5:2', 'al-kafi:5:3',
  'al-kafi:6:1', 'al-kafi:6:2', 'al-kafi:6:3', 'al-kafi:6:4', 'al-kafi:6:5',
  'al-kafi:6:6', 'al-kafi:6:7', 'al-kafi:6:8', 'al-kafi:6:9',
  'al-kafi:7:1', 'al-kafi:7:2', 'al-kafi:7:3', 'al-kafi:7:4', 'al-kafi:7:5',
  'al-kafi:7:6', 'al-kafi:7:7',
  'al-kafi:8:1',
];

@Injectable({ providedIn: 'root' })
export class DailyVerseService {
  private cached$: Observable<DailyVerse | null> | null = null;
  private cachedDate = '';

  constructor(private booksService: BooksService) {}

  getDailyVerse(): Observable<DailyVerse | null> {
    const today = this.getDateString();
    if (this.cached$ && this.cachedDate === today) {
      return this.cached$;
    }

    // Check localStorage cache
    const cached = this.getFromCache(today);
    if (cached) {
      this.cachedDate = today;
      this.cached$ = of(cached);
      return this.cached$;
    }

    const seed = this.getDaySeed();
    const isQuran = seed % 2 === 0;

    if (isQuran) {
      // Quran: simple direct fetch (surahs 1-114 always exist)
      const surahNum = (seed % 114) + 1;
      const chapterPath = `quran:${surahNum}`;
      const verseOffset = (seed >> 3) % 7;

      this.cached$ = this.booksService.getPart(chapterPath).pipe(
        map((book: Book) => this.extractVerse(book, chapterPath, verseOffset, true)),
        catchError(() => of(null)),
        shareReplay(1),
      );
    } else {
      // Al-Kafi: two-step — fetch chapter list, then pick a chapter
      const bookIdx = seed % KAFI_BOOKS.length;
      const bookPath = KAFI_BOOKS[bookIdx];

      this.cached$ = this.booksService.getPart(bookPath).pipe(
        switchMap((bookList: Book) => {
          if (bookList.kind !== 'chapter_list' || !bookList.data?.chapters?.length) {
            return of(null);
          }
          // Pick a chapter from the list
          const chapters = bookList.data.chapters;
          const chapterIdx = (seed >> 3) % chapters.length;
          const chapter = chapters[chapterIdx];
          // Extract the chapter path from path field (strip "/books/" prefix)
          const chapterPath = chapter.path?.startsWith('/books/')
            ? chapter.path.substring(7)
            : `${bookPath}:${chapter.local_index}`;
          return this.booksService.getPart(chapterPath).pipe(
            map((book: Book) => this.extractVerse(book, chapterPath, 0, false)),
          );
        }),
        catchError(() => of(null)),
        shareReplay(1),
      );
    }

    this.cachedDate = today;

    // Cache result to localStorage
    this.cached$.subscribe(verse => {
      if (verse) {
        this.saveToCache(today, verse);
      }
    });

    return this.cached$;
  }

  private extractVerse(book: Book, chapterPath: string, verseOffset: number, isQuran: boolean): DailyVerse | null {
    if (book.kind !== 'verse_list') return null;
    const chapter = book.data;
    if (!chapter.verses || chapter.verses.length === 0) return null;

    const idx = Math.min(verseOffset, chapter.verses.length - 1);
    const verse = chapter.verses[idx];

    // Get Arabic text
    const arabicText = verse.text?.join(' ') || '';

    // Get first available English translation
    let translationText = '';
    let translatorId = '';
    const translationKeys = Object.keys(verse.translations || {});
    const enKey = translationKeys.find(k => k.startsWith('en.'));
    if (enKey && verse.translations[enKey]) {
      translationText = verse.translations[enKey].join(' ');
      translatorId = enKey;
    }

    // Truncate long texts for the card
    const maxLen = 300;
    const displayArabic = arabicText.length > maxLen ? arabicText.substring(0, maxLen) + '...' : arabicText;
    const displayTranslation = translationText.length > maxLen ? translationText.substring(0, maxLen) + '...' : translationText;

    const chapterTitle = chapter.titles?.en || chapter.titles?.ar || '';
    const bookLabel = isQuran ? 'The Holy Quran' : 'Al-Kafi';
    const reference = isQuran
      ? `Surah ${chapter.titles?.en || chapterPath}, Verse ${verse.local_index}`
      : `Al-Kafi, Hadith ${verse.local_index}`;

    return {
      path: `/books/${chapterPath}`,
      bookLabel,
      arabicText: displayArabic,
      translationText: displayTranslation,
      translatorId,
      chapterTitle,
      reference,
    };
  }

  private getDaySeed(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return now.getFullYear() * 366 + dayOfYear;
  }

  private getDateString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  }

  private getFromCache(dateKey: string): DailyVerse | null {
    try {
      const raw = localStorage.getItem('thaqalayn-daily-verse');
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (cached.date === dateKey) return cached.verse;
    } catch {
      // ignore
    }
    return null;
  }

  private saveToCache(dateKey: string, verse: DailyVerse): void {
    try {
      localStorage.setItem('thaqalayn-daily-verse', JSON.stringify({ date: dateKey, verse }));
    } catch {
      // ignore
    }
  }
}
