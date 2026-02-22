import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { Book, Verse, VerseDetail } from '@app/models';
import { BookmarkService } from '@app/services/bookmark.service';
import { BooksService } from '@app/services/books.service';
import { ShareCardService, ShareCardData } from '@app/services/share-card.service';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

interface CompareEntry {
  path: string;
  verse: Verse | null;
  chapterTitle: string;
  loading: boolean;
  error: string | null;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-verse-detail',
    templateUrl: './verse-detail.component.html',
    styleUrls: ['./verse-detail.component.scss'],
    standalone: false
})
export class VerseDetailComponent implements OnInit, OnDestroy {
  @Input() book$: Observable<VerseDetail>;

  translation$: Observable<string> = inject(Store).select(BooksState.getTranslationIfInBookOrDefault);

  translationClass$: Observable<string> = this.translation$.pipe(
    map(t => t ? t.split('.')[0] : 'en')
  );

  linkCopied = false;
  generatingImage = false;
  isBookmarked = false;
  noteText = '';
  showNoteEditor = false;
  hasNote = false;
  currentTranslation = '';
  private sub: Subscription | null = null;
  private transSub: Subscription | null = null;

  // Comparative view state
  compareEntries = new Map<string, CompareEntry>();
  compareExpanded = false;

  constructor(
    private bookmarkService: BookmarkService,
    private cdr: ChangeDetectorRef,
    private booksService: BooksService,
    private shareCard: ShareCardService,
  ) {}

  ngOnInit(): void {
    this.transSub = this.translation$.subscribe(t => {
      this.currentTranslation = t || '';
    });
    this.sub = this.book$.subscribe(book => {
      if (!book) return;
      const path = '/books/' + book.index;
      this.bookmarkService.isBookmarked(path).then(result => {
        this.isBookmarked = result;
        this.cdr.markForCheck();
      });
      // Load existing annotation
      this.bookmarkService.getAnnotation(path).then(ann => {
        this.noteText = ann?.text || '';
        this.hasNote = !!ann;
        this.showNoteEditor = false;
        this.cdr.markForCheck();
      });
      // Track reading progress
      const title = (book.data.chapter_title?.en || '') + ' ' +
        book.data.verse.part_type + ' ' + book.data.verse.local_index;
      this.bookmarkService.updateReadingProgress(path, title);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.transSub?.unsubscribe();
  }

  getGradingClass(term: string): string {
    const lower = term.toLowerCase();
    if (lower.includes('صحيح') || lower.includes('sahih')) return 'grading-sahih';
    if (lower.includes('حسن') || lower.includes('hasan')) return 'grading-hasan';
    if (lower.includes('ضعيف') || lower.includes("da'if") || lower.includes('daif')) return 'grading-daif';
    if (lower.includes('معتبر') || lower.includes("mu'tabar") || lower.includes('muatabar')) return 'grading-mutabar';
    if (lower.includes('مجهول') || lower.includes('majhul')) return 'grading-majhul';
    if (lower.includes('موثق') || lower.includes('muwathaq')) return 'grading-muwathaq';
    return 'grading-unknown';
  }

  parseGradingTerm(raw: string): string {
    const match = raw.match(/<span>\s*(.+?)\s*<\/span>/);
    return match ? match[1] : raw;
  }

  parseGradingScholar(raw: string): string {
    const match = raw.match(/^(.+?):/);
    return match ? match[1].trim() : '';
  }

  getChapterRouterLink(chapterPath: string): string {
    return chapterPath.replace('/books/', '');
  }

  getNavRouterLink(path: string): string {
    return path.replace('/books/', '');
  }

  async toggleBookmark(book: VerseDetail): Promise<void> {
    const path = '/books/' + book.index;
    const title = (book.data.chapter_title?.en || '') + ' ' +
      book.data.verse.part_type + ' ' + book.data.verse.local_index;
    const arabicTitle = book.data.chapter_title?.ar;
    this.isBookmarked = await this.bookmarkService.toggleBookmark(path, title, arabicTitle);
    this.cdr.markForCheck();
  }

  async saveNote(book: VerseDetail): Promise<void> {
    const path = '/books/' + book.index;
    if (this.noteText.trim()) {
      await this.bookmarkService.saveAnnotation(path, this.noteText.trim());
      this.hasNote = true;
    } else {
      await this.bookmarkService.deleteAnnotation(path);
      this.hasNote = false;
    }
    this.showNoteEditor = false;
    this.cdr.markForCheck();
  }

  async deleteNote(book: VerseDetail): Promise<void> {
    const path = '/books/' + book.index;
    await this.bookmarkService.deleteAnnotation(path);
    this.noteText = '';
    this.hasNote = false;
    this.showNoteEditor = false;
    this.cdr.markForCheck();
  }

  async shareHadith(index: string): Promise<void> {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Hadith - ${index}`, url });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url);
      this.linkCopied = true;
      setTimeout(() => this.linkCopied = false, 2000);
    }
  }

  async shareAsImage(book: VerseDetail, translationId: string): Promise<void> {
    this.generatingImage = true;
    this.cdr.markForCheck();
    try {
      const verse = book.data.verse;
      const arabicText = (verse.text || []).join(' ').replace(/<[^>]*>/g, '');
      const translations = verse.translations || {};
      const transTexts = translations[translationId] || Object.values(translations)[0] || [];
      const translationText = transTexts.join(' ').replace(/<[^>]*>/g, '');
      const reference = `${verse.part_type} ${verse.local_index}`;
      const bookTitle = book.data.chapter_title?.en || book.index;
      const grading = verse.gradings?.[0] ? this.parseGradingTerm(verse.gradings[0]) : undefined;

      await this.shareCard.shareAsImage({
        arabicText,
        translationText,
        reference,
        bookTitle,
        grading,
      });
    } catch {
      // Failed to generate/share
    }
    this.generatingImage = false;
    this.cdr.markForCheck();
  }

  // Comparative view methods
  toggleCompare(): void {
    this.compareExpanded = !this.compareExpanded;
    this.cdr.markForCheck();
  }

  isCompareLoaded(path: string): boolean {
    return this.compareEntries.has(path);
  }

  getCompareEntry(path: string): CompareEntry | undefined {
    return this.compareEntries.get(path);
  }

  loadCompareVerse(path: string): void {
    if (this.compareEntries.has(path)) return;

    const entry: CompareEntry = { path, verse: null, chapterTitle: '', loading: true, error: null };
    this.compareEntries.set(path, entry);
    this.cdr.markForCheck();

    // Parse path: /books/quran:59:2 → chapter index "quran:59", verse local_index 2
    const stripped = path.replace('/books/', '');
    const parts = stripped.split(':');
    const verseIdx = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : 0;
    const chapterIndex = parts.slice(0, -1).join(':');

    this.booksService.getPart(chapterIndex).subscribe({
      next: (book: Book) => {
        entry.loading = false;
        if (book.kind === 'verse_list' && book.data.verses) {
          const found = book.data.verses.find(v => v.local_index === verseIdx);
          entry.verse = found || null;
          entry.chapterTitle = book.data.titles?.en || chapterIndex;
          if (!found) {
            entry.error = `Verse ${verseIdx} not found in chapter`;
          }
        } else if (book.kind === 'chapter_list' && book.data.chapters) {
          // For chapter_list, the verse might be in nested chapters
          entry.error = 'Content is a chapter list, not verse content';
        } else {
          entry.error = 'Unexpected data format';
        }
        this.cdr.markForCheck();
      },
      error: () => {
        entry.loading = false;
        entry.error = 'Failed to load referenced content';
        this.cdr.markForCheck();
      }
    });
  }

  loadAllRelations(relations: Record<string, string[]>): void {
    this.compareExpanded = true;
    for (const paths of Object.values(relations)) {
      for (const path of paths) {
        this.loadCompareVerse(path);
      }
    }
  }

  getFirstTranslation(verse: Verse): string[] | null {
    if (!verse.translations) return null;
    const keys = Object.keys(verse.translations);
    return keys.length > 0 ? verse.translations[keys[0]] : null;
  }

  removeBookPrefix(path: string): string {
    return path.replace('/books/', '');
  }
}
