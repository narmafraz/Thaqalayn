import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, ViewChild } from '@angular/core';
import { MediaObserver } from '@angular/flex-layout';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
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

  SMALL_SCREEN_ALIAS = 'xs';

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatTable) table: MatTable<Chapter>;
  dataSource: ChapterListDataSource;

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  displayedColumns$: Observable<string[]> = of([]);

  mqAlias$: Observable<string>;

  constructor(private mediaObserver: MediaObserver,
              private changeDetectorRefs: ChangeDetectorRef) {
    this.mqAlias$ = mediaObserver.asObservable().pipe(
      map(m => m.map(c => c.mqAlias).find(a => a !== undefined)),
      distinctUntilChanged()
    );
  }

  ngOnInit() {
    const bookChapters = this.book$.pipe(
      filter(x => x !== undefined),
      map(x => x.data.chapters));
    this.dataSource = new ChapterListDataSource(bookChapters);

    // Set columns to display dynamically based on what we get from server
    this.displayedColumns$ = this.mqAlias$.pipe(
      startWith(this.SMALL_SCREEN_ALIAS),
      withLatestFrom(this.book$),
      map(this.selectApplicableColumnsBasedOnBook())
    );
  }

  private selectApplicableColumnsBasedOnBook(): (value: [string, ChapterList], index: number) => string[] {
    return ([mqAlias, book]) => {
      const columns = [];
      if (!book || !book.data || !book.data.chapters) {
        return columns;
      }
      if (mqAlias === this.SMALL_SCREEN_ALIAS) {
        return ['octrta']; // one column to rule them all
      }
      if (book.index !== 'books') {
        columns.push('index');
      }
      if (book.data.chapters.some(x => x.reveal_type)) {
        columns.push('badges');
      }
      columns.push('name.en');
      columns.push('name.ar');
      if (book.data.chapters.some(x => x.verse_start_index)) {
        columns.push('verse_start_index');
        columns.push('verse_to_index');
        columns.push('verse_end_index');
      }
      if (book.data.chapters.some(x => x.verse_count)) {
        columns.push('verse_count');
      }
      return columns;
    };
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.table.dataSource = this.dataSource;
  }

}
