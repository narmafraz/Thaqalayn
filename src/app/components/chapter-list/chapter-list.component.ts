import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { Chapter, ChapterList } from '@app/models';
import { BookAuthor, getBookAuthor } from '@app/data/book-authors';
import { combineLatest, Observable, Subscription, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, startWith } from 'rxjs/operators';
import { ChapterListDataSource } from './chapter-list-data-source';
import { BookmarkService } from '@app/services/bookmark.service';
import { ReadingStatsService } from '@app/services/reading-stats.service';
import { VerseCountsService } from '@app/services/verse-counts.service';

/** Per-row progress fragment: { read, total, fraction, percent }. Null = unknown. */
export interface ChapterListRowProgress {
  read: number;
  total: number;
  fraction: number;
  percent: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-chapter-list',
    templateUrl: './chapter-list.component.html',
    styleUrls: ['./chapter-list.component.scss'],
    standalone: false
})
export class ChapterListComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() book$: Observable<ChapterList>;

  readonly SMALL_SCREEN_ALIAS = 'xs';

  @ViewChild(MatSort, { static: false }) sort: MatSort;
  @ViewChild(MatTable, { static: false }) table: MatTable<Chapter>;

  dataSource: ChapterListDataSource;

  displayedColumns$: Observable<string[]>;
  mqAlias$: Observable<string>;
  author$: Observable<BookAuthor | undefined>;
  bookProgress: ChapterListRowProgress | null = null;
  /** Per-row (chapter index → progress fragment). Empty for paths with no manifest entry. */
  chapterProgressMap: Map<string, ChapterListRowProgress> = new Map();
  /** When true, the user has filtered the table to only show chapters with unread content. */
  unreadOnly = false;
  private currentBookIndex: string | null = null;
  private subs: Subscription[] = [];

  constructor(
    private breakpointObserver: BreakpointObserver,
    private changeDetectorRef: ChangeDetectorRef,
    private bookmarkService: BookmarkService,
    private readingStats: ReadingStatsService,
    private verseCounts: VerseCountsService,
  ) {
    this.mqAlias$ = this.breakpointObserver.observe([
      Breakpoints.XSmall,
      Breakpoints.Small,
      Breakpoints.Medium,
      Breakpoints.Large,
      Breakpoints.XLarge
    ]).pipe(
      map(result => this.getScreenSizeAlias(result.breakpoints)),
      distinctUntilChanged()
    );
  }

  ngOnInit() {
    // Kick off the manifest fetch (no-op if already cached).
    this.verseCounts.get().subscribe();

    // Derive author from the book index (root slug)
    this.author$ = this.book$.pipe(
      filter((book): book is ChapterList => !!book),
      map(book => {
        const depth = (book.index.match(/:/g) || []).length;
        return depth <= 1 ? getBookAuthor(book.index) : undefined;
      }),
      startWith(undefined)
    );

    // RE-04 / RE-07: per-book strip + per-row rings. Both depend on the
    // current book index, the verse-counts manifest, and the live readVerses
    // stream.
    this.subs.push(
      combineLatest([
        this.book$.pipe(filter((b): b is ChapterList => !!b)),
        this.verseCounts.get(),
        this.bookmarkService.readVerses$,
      ]).subscribe(([book, , readVerses]) => {
        this.currentBookIndex = book.index;
        const prefix = book.index === 'books' ? '' : book.index;
        if (!prefix) {
          this.bookProgress = null;
          this.chapterProgressMap = new Map();
          this.changeDetectorRef.markForCheck();
          return;
        }

        const chapterReadCounts = this.readingStats.buildChapterReadCounts(readVerses);

        // Whole-book / sub-tree progress
        const total = this.verseCounts.totalForPrefix(prefix);
        let bookRead = 0;
        for (const idx of this.verseCounts.chapterIndexesForPrefix(prefix)) {
          bookRead += chapterReadCounts.get(idx) || 0;
        }
        if (bookRead > total) bookRead = total;
        this.bookProgress = total > 0 ? this.toProgress(bookRead, total) : null;

        // Per-row rings — keyed by chapter `path` (which matches the `path`
        // field on Chapter rows, e.g. `/books/al-kafi:1:1:1`)
        const map = new Map<string, ChapterListRowProgress>();
        for (const ch of book.data.chapters) {
          const path = (ch as Chapter).path;
          if (!path) continue;
          const chapterIdx = path.replace(/^\/books\//, '');
          const chTotal = this.verseCounts.forChapter(chapterIdx);
          if (chTotal === 0) {
            // Could be a section/volume that aggregates child chapters
            const subTotal = this.verseCounts.totalForPrefix(chapterIdx);
            if (subTotal === 0) continue;
            let subRead = 0;
            for (const childIdx of this.verseCounts.chapterIndexesForPrefix(chapterIdx)) {
              subRead += chapterReadCounts.get(childIdx) || 0;
            }
            if (subRead > subTotal) subRead = subTotal;
            map.set(path, this.toProgress(subRead, subTotal));
          } else {
            const chRead = Math.min(chapterReadCounts.get(chapterIdx) || 0, chTotal);
            map.set(path, this.toProgress(chRead, chTotal));
          }
        }
        this.chapterProgressMap = map;
        this.changeDetectorRef.markForCheck();
      })
    );

    // Enhanced error handling for book$ observable. We include `readVerses$`
    // in the combine so the "progress" column shows up the moment we know
    // there are read marks to render.
    this.displayedColumns$ = combineLatest([
      this.mqAlias$.pipe(startWith(this.SMALL_SCREEN_ALIAS)),
      this.book$.pipe(
        catchError(err => {
          console.error('Error loading book data', err);
          return of(null);
        }),
        filter(book => book !== undefined && book.data?.chapters?.length > 0),
        startWith(null)
      ),
      this.bookmarkService.readVerses$.pipe(startWith([])),
    ]).pipe(
      map(([mqAlias, book]) => this.selectApplicableColumns(mqAlias, book))
    );

    // Create data source with fallback
    const bookChapters$ = this.book$.pipe(
      filter((book): book is ChapterList => book !== undefined && !!book.data?.chapters?.length),
      map(book => book.data.chapters),
      catchError(err => {
        console.error('Error processing book chapters', err);
        return of([]);
      })
    );

    this.dataSource = new ChapterListDataSource(bookChapters$);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  /** Look up the per-row progress fragment for a chapter row. */
  progressForRow(row: Chapter): ChapterListRowProgress | null {
    return row.path ? this.chapterProgressMap.get(row.path) ?? null : null;
  }

  /** True when the unread-only filter chip is active and this row has no unread content. */
  isRowHiddenByFilter(row: Chapter): boolean {
    if (!this.unreadOnly) return false;
    const p = this.progressForRow(row);
    return !!(p && p.read >= p.total);
  }

  toggleUnreadOnly(): void {
    this.unreadOnly = !this.unreadOnly;
    this.changeDetectorRef.markForCheck();
  }

  private toProgress(read: number, total: number): ChapterListRowProgress {
    const fraction = total > 0 ? Math.min(1, read / total) : 0;
    return {
      read,
      total,
      fraction,
      percent: Math.round(fraction * 1000) / 10,
    };
  }

  ngAfterViewInit() {
    // Use setTimeout to ensure all bindings are resolved
    setTimeout(() => {
      try {
        if (this.sort && this.table) {
          this.dataSource.sort = this.sort;
          this.table.dataSource = this.dataSource;
          this.changeDetectorRef.detectChanges();
        } else {
          console.warn('Sort or Table not fully initialized', {
            sort: !!this.sort,
            table: !!this.table
          });
        }
      } catch (err) {
        console.error('Error in ngAfterViewInit', err);
      }
    });
  }

  private getScreenSizeAlias(breakpoints: { [key: string]: boolean }): string {
    if (breakpoints[Breakpoints.XSmall]) return 'xs';
    if (breakpoints[Breakpoints.Small]) return 'sm';
    if (breakpoints[Breakpoints.Medium]) return 'md';
    if (breakpoints[Breakpoints.Large]) return 'lg';
    if (breakpoints[Breakpoints.XLarge]) return 'xl';
    return 'unknown';
  }

  private selectApplicableColumns(mqAlias: string, book: ChapterList): string[] {
    // If book is undefined or has no chapters, return a minimal set of columns
    if (!book?.data?.chapters?.length) {
      console.warn('No chapters available');
      return ['index', 'name.en', 'name.ar'];
    } else {
      console.warn('Got chapters');
    }

    if (mqAlias === this.SMALL_SCREEN_ALIAS) {
      // For mobile, create a summary column
      return ['octrta'];
    }

    const columns: string[] = [];
    if (book.index !== 'books') {
      columns.push('index');
    }
    if (book.data.chapters.some(chapter => chapter.reveal_type)) {
      columns.push('badges');
    }
    columns.push('name.en', 'name.ar');
    if (book.data.chapters.some(chapter => chapter.verse_start_index !== undefined)) {
      columns.push('verse_start_index', 'verse_to_index', 'verse_end_index');
    }
    if (book.data.chapters.some(chapter => chapter.verse_count)) {
      columns.push('verse_count');
    }
    // RE-07: per-row progress ring appears whenever any chapter has manifest data.
    if (this.chapterProgressMap.size > 0) {
      columns.push('progress');
    }
    return columns;
  }
}
