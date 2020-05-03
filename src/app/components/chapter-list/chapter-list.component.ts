import { AfterViewInit, ChangeDetectionStrategy, Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { Chapter, ChapterList } from '@app/models';
import { Observable } from 'rxjs';
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
  displayedColumns = ['index', 'badges', 'name.en', 'name.ar', 'verseCount', 'verseStartIndex'];

  constructor() { }
  ngOnInit() {
    this.dataSource = new ChapterListDataSource(this.book$.pipe(map(x => x.data.chapters)));
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.table.dataSource = this.dataSource;
  }

}
