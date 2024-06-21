import { DataSource } from '@angular/cdk/collections';
import { MatSort } from '@angular/material/sort';
import { Chapter } from '@app/models';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Data source for the TableSample view. This class should
 * encapsulate all logic for fetching and manipulating the displayed data
 * (including sorting, pagination, and filtering).
 */
export class ChapterListDataSource extends DataSource<Chapter> {
  sort: MatSort;
  private dataSubject = new BehaviorSubject<Chapter[]>([]);

  constructor(private data: Observable<Chapter[]>) {
    super();
    // Subscribe to the data Observable to keep the dataSubject updated
    this.data.subscribe(data => this.dataSubject.next(data));
  }

  /**
   * Connect this data source to the table. The table will only update when
   * the returned stream emits new items.
   * @returns A stream of the items to be rendered.
   */
  connect(): Observable<Chapter[]> {
    // Subscribe to sort changes and trigger updates
    this.sort.sortChange.subscribe(() => {
      this.dataSubject.next(this.getSortedData(this.dataSubject.getValue()));
    });

    // Return the dataSubject as the data stream for the table
    return this.dataSubject.asObservable().pipe(
      map(data => this.getPagedData(this.getSortedData(data)))
    );
  }

  /**
   * Called when the table is being destroyed. Use this function to clean up
   * any open connections or free any held resources that were set up during connect.
   */
  disconnect() {}

  /**
   * Paginate the data (client-side). If you're using server-side pagination,
   * this would be replaced by requesting the appropriate data from the server.
   */
  private getPagedData(data: Chapter[]) {
    return data;
  }

  /**
   * Sort the data (client-side). If you're using server-side sorting,
   * this would be replaced by requesting the appropriate data from the server.
   */
  private getSortedData(data: Chapter[]) {
    if (!this.sort.active || this.sort.direction === '') {
      return data;
    }

    return [...data].sort((a, b) => {
      const isAsc = this.sort.direction === 'asc';
      switch (this.sort.active) {
        case 'name.en': return compare(a.titles.en, b.titles.en, isAsc);
        case 'name.ar': return compare(a.titles.ar, b.titles.ar, isAsc);
        case 'index': return compare(+a.index, +b.index, isAsc);
        case 'verse_count': return compare(+a.verse_count, +b.verse_count, isAsc);
        default: return 0;
      }
    });
  }
}

/** Simple sort comparator for example ID/Name columns (for client-side sorting). */
function compare(a: string | number, b: string | number, isAsc: boolean) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
