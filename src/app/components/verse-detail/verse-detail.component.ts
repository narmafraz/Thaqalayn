import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { VerseDetail } from '@app/models';
import { BookmarkService } from '@app/services/bookmark.service';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

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
  isBookmarked = false;
  noteText = '';
  showNoteEditor = false;
  hasNote = false;
  private sub: Subscription | null = null;

  constructor(
    private bookmarkService: BookmarkService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
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
}
