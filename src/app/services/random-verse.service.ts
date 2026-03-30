import { Injectable } from '@angular/core';
import { BooksService } from './books.service';
import { Store } from '@ngxs/store';
import { IndexState } from '@store/index/index.state';
import { RouterState } from '@store/router/router.state';
import { Observable, of, map, catchError, switchMap, filter, first } from 'rxjs';
import { Book } from '../models/book';

export interface RandomVerse {
  path: string;
  bookSlug: string;
  bookLabel: string;
  arabicText: string;
  translationText: string;
  translatorId: string;
  reference: string;
}

/** Verse counts per Quran surah (1-indexed: QURAN_VERSE_COUNTS[0] = surah 1 = 7 verses) */
const QURAN_VERSE_COUNTS = [
  7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
  112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,
  54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,
  14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,
  29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,
  11,8,3,9,5,4,7,3,6,3,5,4,5,6,
];

@Injectable({ providedIn: 'root' })
export class RandomVerseService {

  constructor(private booksService: BooksService, private store: Store) {}

  getRandomQuranVerse(): Observable<RandomVerse | null> {
    const surah = Math.floor(Math.random() * 114) + 1;
    const verseCount = QURAN_VERSE_COUNTS[surah - 1];
    const verse = Math.floor(Math.random() * verseCount) + 1;
    const verseDetailPath = `quran:${surah}:${verse}`;

    return this.booksService.getPart(verseDetailPath).pipe(
      map((book: Book) => this.extractFromVerseDetail(book, 'quran', `${surah}:${verse}`)),
      catchError(() => of(null)),
    );
  }

  getRandomHadith(): Observable<RandomVerse | null> {
    // Wait for the index to be loaded before picking a random chapter
    return this.store.select(IndexState.getBookForLanguage).pipe(
      map(fn => fn?.('en')),
      filter(enIndex => !!enIndex),
      first(),
      switchMap(enIndex => {
        // Filter for non-Quran leaf chapters
        const hadithChapters = Object.keys(enIndex).filter(path => {
          const entry = enIndex[path];
          return entry.part_type === 'Chapter' && !path.startsWith('/books/quran');
        });

        if (hadithChapters.length === 0) return of(null);

        // Pick a random chapter
        const chapterPath = hadithChapters[Math.floor(Math.random() * hadithChapters.length)];
        const chapterIndex = chapterPath.replace('/books/', '');

        // Fetch the chapter shell to discover verse_refs
        return this.fetchRandomHadithFromChapter(chapterIndex);
      }),
      catchError(() => of(null)),
    );
  }

  private fetchRandomHadithFromChapter(chapterIndex: string): Observable<RandomVerse | null> {
    return this.booksService.getPart(chapterIndex).pipe(
      switchMap((book: Book) => {
        if (book.kind !== 'verse_list') return of(null);
        const chapter = book.data;

        // Shell format: use verse_refs
        if (chapter.verse_refs?.length) {
          const hadithRefs = chapter.verse_refs.filter(r => r.path && r.part_type !== 'Heading');
          if (hadithRefs.length === 0) return of(null);
          const ref = hadithRefs[Math.floor(Math.random() * hadithRefs.length)];
          const detailIndex = ref.path.replace('/books/', '');
          const bookSlug = detailIndex.split(':')[0];
          return this.booksService.getPart(detailIndex).pipe(
            map((detail: Book) => this.extractFromVerseDetail(detail, bookSlug, detailIndex)),
          );
        }

        // Legacy format: inline verses
        if (chapter.verses?.length) {
          const verses = chapter.verses.filter(v => v.part_type !== 'Heading');
          if (verses.length === 0) return of(null);
          const verse = verses[Math.floor(Math.random() * verses.length)];
          const bookSlug = chapterIndex.split(':')[0];
          return of(this.extractFromInlineVerse(verse, bookSlug));
        }

        return of(null);
      }),
      catchError(() => of(null)),
    );
  }

  private extractFromVerseDetail(book: Book, bookSlug: string, indexPath: string): RandomVerse | null {
    if (book.kind !== 'verse_detail') return null;
    const verse = book.data.verse;
    if (!verse) return null;

    const isHadith = bookSlug !== 'quran';
    const { arabic, translation, translatorId } = isHadith
      ? this.extractHadithText(verse)
      : this.extractFullText(verse);

    const bookLabel = this.formatBookName(bookSlug);
    const reference = !isHadith
      ? `${book.data.chapter_title?.en || indexPath}, ${verse.local_index}`
      : `${bookLabel}, Hadith ${verse.local_index}`;

    return {
      path: verse.path || `/books/${indexPath}`,
      bookSlug,
      bookLabel,
      arabicText: arabic,
      translationText: translation,
      translatorId,
      reference,
    };
  }

  private extractFromInlineVerse(verse: any, bookSlug: string): RandomVerse | null {
    const { arabic, translation, translatorId } = this.extractHadithText(verse);
    const bookLabel = this.formatBookName(bookSlug);

    return {
      path: verse.path || '',
      bookSlug,
      bookLabel,
      arabicText: arabic,
      translationText: translation,
      translatorId,
      reference: `${bookLabel}, Hadith ${verse.local_index}`,
    };
  }

  /** Extract text skipping isnad chunks if AI chunk data is available */
  private extractHadithText(verse: any): { arabic: string; translation: string; translatorId: string } {
    const chunks = verse.ai?.chunks;
    if (chunks?.length) {
      const lang = this.store.selectSnapshot(RouterState.getLanguage) || 'en';
      const bodyChunks = chunks.filter((c: any) => c.chunk_type !== 'isnad');

      if (bodyChunks.length > 0) {
        // Reconstruct Arabic from word ranges of non-isnad chunks
        const fullText = verse.text?.join(' ') || '';
        const words = fullText.split(/\s+/);
        const arabicParts = bodyChunks.map((c: any) =>
          words.slice(c.word_start, c.word_end).join(' ')
        );
        const arabic = arabicParts.join(' ');

        // Use chunk translations (keyed by language code, e.g. 'en', 'fa')
        const translationParts = bodyChunks
          .map((c: any) => c.translations?.[lang] || c.translations?.['en'] || '')
          .filter((t: string) => t);
        if (translationParts.length > 0) {
          return { arabic, translation: translationParts.join(' '), translatorId: `${lang}.ai` };
        }

        // Chunk translations not available for this language — fall back to verse translations
        const { text: translation, id: translatorId } = this.pickTranslation(verse.translations);
        return { arabic, translation, translatorId };
      }
    }

    // No chunks or all chunks are isnad — fall back to full text
    return this.extractFullText(verse);
  }

  private extractFullText(verse: any): { arabic: string; translation: string; translatorId: string } {
    const arabic = verse.text?.join(' ') || '';
    const { text: translation, id: translatorId } = this.pickTranslation(verse.translations);
    return { arabic, translation, translatorId };
  }

  private pickTranslation(translations: Record<string, string[]> | undefined): { text: string; id: string } {
    if (!translations) return { text: '', id: '' };

    const lang = this.store.selectSnapshot(RouterState.getLanguage) || 'en';
    const keys = Object.keys(translations);

    // Prefer current language, then English, then first available
    const langKey = keys.find(k => k.startsWith(lang + '.'))
      || keys.find(k => k.startsWith('en.'))
      || keys[0];

    if (langKey && translations[langKey]) {
      return { text: translations[langKey].join(' '), id: langKey };
    }
    return { text: '', id: '' };
  }

  private formatBookName(slug: string): string {
    const names: Record<string, string> = {
      'quran': 'The Holy Quran',
      'al-kafi': 'Al-Kafi',
      'tahdhib-al-ahkam': 'Tahdhib al-Ahkam',
      'al-istibsar': 'Al-Istibsar',
      'man-la-yahduruhu-al-faqih': 'Man La Yahduruhu al-Faqih',
      'nahj-al-balagha': 'Nahj al-Balagha',
      'al-sahifa-al-sajjadiyya': 'Al-Sahifa al-Sajjadiyya',
      'bihar-al-anwar': 'Bihar al-Anwar',
      'wasael-ul-shia': "Wasa'il al-Shi'a",
      'al-amali-saduq': 'Al-Amali (Saduq)',
      'al-amali-mufid': 'Al-Amali (Mufid)',
      'kitab-al-irshad': 'Kitab al-Irshad',
      'kitab-sulaym-ibn-qays': 'Kitab Sulaym ibn Qays',
      'al-khisal': 'Al-Khisal',
      'al-tawhid': 'Al-Tawhid',
      'kamal-al-din': 'Kamal al-Din',
      'maani-al-akhbar': "Ma'ani al-Akhbar",
      'thawab-al-amal': "Thawab al-A'mal",
      'uyun-akhbar-al-rida': 'Uyun Akhbar al-Rida',
      'kamil-al-ziyarat': 'Kamil al-Ziyarat',
      'risalat-al-huquq': 'Risalat al-Huquq',
      'kitab-al-zuhd': 'Kitab al-Zuhd',
      'kitab-al-mumin': "Kitab al-Mu'min",
      'kitab-al-ghayba-numani': "Kitab al-Ghayba (Nu'mani)",
      'kitab-al-ghayba-tusi': 'Kitab al-Ghayba (Tusi)',
      'fadail-al-shia': "Fada'il al-Shi'a",
      'sifat-al-shia': "Sifat al-Shi'a",
      'kitab-al-duafa': "Kitab al-Du'afa",
      'mujam-al-ahadith-al-mutabara': "Mu'jam al-Ahadith",
    };
    return names[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
