import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { Chapter, ChapterList } from '@app/models';
import { combineLatest, Observable, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, startWith } from 'rxjs/operators';
import { ChapterListDataSource } from './chapter-list-data-source';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chapter-list',
  templateUrl: './chapter-list.component.html',
  styleUrls: ['./chapter-list.component.scss']
})
export class ChapterListComponent implements OnInit, AfterViewInit {
  @Input() book$: Observable<ChapterList>;

  readonly SMALL_SCREEN_ALIAS = 'xs';

  @ViewChild(MatSort, { static: false }) sort: MatSort;
  @ViewChild(MatTable, { static: false }) table: MatTable<Chapter>;

  dataSource: ChapterListDataSource;

  displayedColumns$: Observable<string[]>;
  mqAlias$: Observable<string>;

  constructor(
    private breakpointObserver: BreakpointObserver,
    private changeDetectorRef: ChangeDetectorRef
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
    // Enhanced error handling for book$ observable
    this.displayedColumns$ = combineLatest([
      this.mqAlias$.pipe(startWith(this.SMALL_SCREEN_ALIAS)),
      this.book$.pipe(
        catchError(err => {
          console.error('Error loading book data', err);
          return of(null);
        }),
        filter(book => book !== undefined && book.data?.chapters?.length > 0),
        startWith(null)
      )
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
    return columns;
  }
}
