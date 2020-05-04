import { AfterViewInit, ChangeDetectionStrategy, Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { Chapter, ChapterList } from '@app/models';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChapterListDataSource } from './chapter-list-data-source';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chapter-list',
  templateUrl: './chapter-list.component.html',
  styleUrls: ['./chapter-list.component.scss']
})
export class ChapterListComponent implements AfterViewInit, OnInit {
  @Input() book$: Observable<ChapterList>;

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatTable) table: MatTable<Chapter>;
  dataSource: ChapterListDataSource;

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  displayedColumns$: Observable<string[]> = of([]);

  constructor() { }
  ngOnInit() {
    this.dataSource = new ChapterListDataSource(this.book$.pipe(map(x => x.data.chapters)));

    // Set columns to display dynamically based on what we get from server
    this.displayedColumns$ = this.book$.pipe(
      map(book => {
        const columns = []; // , 'name.en', 'name.ar', 'verse_count', 'verse_start_index'];
        if (!book || !book.data || !book.data.chapters) { return columns; }
        if (book.index !== 'books') { columns.push('index'); }
        if (book.data.chapters.some(x => x.verse_type)) { columns.push('badges'); }
        columns.push('name.en');
        columns.push('name.ar');
        if (book.data.chapters.some(x => x.verse_count)) { columns.push('verse_count'); }
        if (book.data.chapters.some(x => x.verse_start_index)) { columns.push('verse_start_index'); }
        return columns;
      })
    );
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.table.dataSource = this.dataSource;
  }

}
