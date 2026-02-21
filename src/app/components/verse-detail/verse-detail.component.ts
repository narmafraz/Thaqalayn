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
})
export class VerseDetailComponent implements OnInit, OnDestroy {
  @Input() book$: Observable<VerseDetail>;

  translation$: Observable<string> = inject(Store).select(BooksState.getTranslationIfInBookOrDefault);

  translationClass$: Observable<string> = this.translation$.pipe(
    map(t => t ? t.split('.')[0] : 'en')
  );

  linkCopied = false;
  isBookmarked = false;
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
      // Track reading progress
      const title = (book.data.chapter_title?.en || '') + ' ' +
        book.data.verse.part_type + ' ' + book.data.verse.local_index;
      this.bookmarkService.updateReadingProgress(path, title);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  getGradingClass(grading: string): string {
    const lower = grading.toLowerCase();
    if (lower === 'sahih' || lower === 'صحيح') return 'grading-sahih';
    if (lower === 'hasan' || lower === 'حسن') return 'grading-hasan';
    if (lower === "da'if" || lower === 'ضعيف' || lower === 'daif') return 'grading-daif';
    if (lower === "mu'tabar" || lower === 'معتبر' || lower === 'muatabar') return 'grading-mutabar';
    return 'grading-unknown';
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
