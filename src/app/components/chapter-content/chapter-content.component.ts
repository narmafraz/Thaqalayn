import { ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { ChapterContent, Crumb, Verse } from '@app/models';
import { AudioService } from '@app/services/audio.service';
import { BookmarkService } from '@app/services/bookmark.service';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { RouterState } from '@store/router/router.state';
import { Observable, Subscription } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chapter-content',
  templateUrl: './chapter-content.component.html',
  styleUrls: ['./chapter-content.component.scss'],
})
export class ChapterContentComponent implements OnInit, OnDestroy {
  fragment$: Observable<string> = inject(Store).select(RouterState.getUrlFragment);
  translation$: Observable<string> = inject(Store).select(BooksState.getTranslationIfInBookOrDefault);
  crumbs$: Observable<Crumb[]> = inject(Store).select(BooksState.getCurrentNavigatedCrumbs);

  @Input() book$: Observable<ChapterContent>;

  bookmarkedPaths = new Set<string>();
  private sub: Subscription | null = null;

  audioState$ = this.audioService.state$;

  constructor(
    private store: Store,
    private viewportScroller: ViewportScroller,
    private bookmarkService: BookmarkService,
    private cdr: ChangeDetectorRef,
    public audioService: AudioService,
  ) {
    this.fragment$.subscribe(fragment => {
      setTimeout(() => {
          this.viewportScroller.scrollToAnchor(fragment);
      });
    });
  }

  ngOnInit(): void {
    this.sub = this.book$.subscribe(book => {
      if (!book) return;
      // Track reading progress
      const title = book.data.titles?.en || book.index;
      this.bookmarkService.updateReadingProgress('/books/' + book.index, title);
      // Load bookmark states for all verses
      this.loadBookmarkStates(book);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  getInBookReference(crumbs: Crumb[], verse: Verse): string {
    let result = '';

    crumbs.forEach(crumb => {
      result += crumb.indexed_titles.en + ' ';
    });

    result += verse.part_type + ' ' + verse.local_index;

    return result;
  }

  getBookName(crumbs: Crumb[]): string {
    if (crumbs.length > 0) {
      return crumbs[0].titles.en;
    }
    return '';
  }

  isVerseBookmarked(bookIndex: string, verse: Verse): boolean {
    const path = '/books/' + bookIndex + ':' + verse.local_index;
    return this.bookmarkedPaths.has(path);
  }

  async toggleVerseBookmark(bookIndex: string, verse: Verse, crumbs: Crumb[]): Promise<void> {
    const path = '/books/' + bookIndex + ':' + verse.local_index;
    const title = this.getBookName(crumbs) + ' ' + this.getInBookReference(crumbs, verse);
    const added = await this.bookmarkService.toggleBookmark(path, title);
    if (added) {
      this.bookmarkedPaths.add(path);
    } else {
      this.bookmarkedPaths.delete(path);
    }
    this.cdr.markForCheck();
  }

  isQuranBook(bookIndex: string): boolean {
    return bookIndex.startsWith('quran:');
  }

  getQuranSurah(bookIndex: string): number {
    // bookIndex like "quran:1" -> surah 1
    const parts = bookIndex.split(':');
    return parts.length >= 2 ? parseInt(parts[1], 10) : 0;
  }

  toggleAudio(bookIndex: string, ayah: number): void {
    const surah = this.getQuranSurah(bookIndex);
    if (surah > 0) {
      this.audioService.togglePlayPause(surah, ayah);
    }
  }

  private async loadBookmarkStates(book: ChapterContent): Promise<void> {
    const bookmarks = await this.bookmarkService.getBookmarks();
    this.bookmarkedPaths.clear();
    for (const bm of bookmarks) {
      this.bookmarkedPaths.add(bm.path);
    }
    this.cdr.markForCheck();
  }
}
