import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatLegacyTable as MatTable } from '@angular/material/legacy-table';
import { Chapter, ChapterList } from '@app/models';
import { Observable, of } from 'rxjs';
import { distinctUntilChanged, filter, map, startWith, withLatestFrom } from 'rxjs/operators';
import { ChapterListDataSource } from './chapter-list-data-source';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chapter-list',
  templateUrl: './chapter-list.component.html',
  styleUrls: ['./chapter-list.component.scss']
})
export class ChapterListComponent implements AfterViewInit, OnInit {
  @Input() book$: Observable<ChapterList>;

  readonly SMALL_SCREEN_ALIAS = 'xs';

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatTable) table: MatTable<Chapter>;
  dataSource: ChapterListDataSource;

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  displayedColumns$: Observable<string[]> = of([]);

  mqAlias$: Observable<string>;

  constructor(private breakpointObserver: BreakpointObserver,
              private changeDetectorRefs: ChangeDetectorRef) {
    this.mqAlias$ = this.breakpointObserver.observe([
        Breakpoints.XSmall,
        Breakpoints.Small,
        Breakpoints.Medium,
        Breakpoints.Large,
        Breakpoints.XLarge
      ])
      .pipe(
        map(result => this.getScreenSizeAlias(result.breakpoints)),
        distinctUntilChanged()
      );
  }

  ngOnInit() {
    const bookChapters$ = this.book$.pipe(
      filter((book): book is ChapterList => book !== undefined),
      map(book => book.data.chapters)
    );
    this.dataSource = new ChapterListDataSource(bookChapters$);

    // Set columns to display dynamically based on what we get from the server
    this.displayedColumns$ = this.mqAlias$.pipe(
      startWith(this.SMALL_SCREEN_ALIAS),
      withLatestFrom(this.book$),
      map(([mqAlias, book]) => this.selectApplicableColumns(mqAlias, book))
    );
  }

  private getScreenSizeAlias(breakpoints: { [key: string]: boolean }): string {
    if (breakpoints[Breakpoints.XSmall]) {
      return 'xs';
    } else if (breakpoints[Breakpoints.Small]) {
      return 'sm';
    } else if (breakpoints[Breakpoints.Medium]) {
      return 'md';
    } else if (breakpoints[Breakpoints.Large]) {
      return 'lg';
    } else if (breakpoints[Breakpoints.XLarge]) {
      return 'xl';
    } else {
      return 'unknown';
    }
  }

  private selectApplicableColumns(mqAlias: string, book: ChapterList): string[] {
    const columns: string[] = [];
    if (!book || !book.data || !book.data.chapters) {
      return columns;
    }
    if (mqAlias === this.SMALL_SCREEN_ALIAS) {
      return ['octrta']; // one column to rule them all
    }
    if (book.index !== 'books') {
      columns.push('index');
    }
    if (book.data.chapters.some(chapter => chapter.reveal_type)) {
      columns.push('badges');
    }
    columns.push('name.en', 'name.ar');
    if (book.data.chapters.some(chapter => chapter.verse_start_index)) {
      columns.push('verse_start_index', 'verse_to_index', 'verse_end_index');
    }
    if (book.data.chapters.some(chapter => chapter.verse_count)) {
      columns.push('verse_count');
    }
    return columns;
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.table.dataSource = this.dataSource;
  }
}
