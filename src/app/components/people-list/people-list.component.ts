import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { KeyValue } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { NarratorMetadata } from '@app/models';
import { PeopleState } from '@store/people/people.state';
import { Observable, Subscription, fromEvent, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, startWith, tap, withLatestFrom } from 'rxjs/operators';
import { MultiLingualText } from './../../models/text';
import { Store } from '@ngxs/store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-people-list',
  templateUrl: './people-list.component.html',
  styleUrls: ['./people-list.component.scss']
})
export class PeopleListComponent implements AfterViewInit, OnInit, OnDestroy {

  narrators$: Observable<NarratorMetadata[]> = inject(Store).select(PeopleState.getEnrichedNarratorsList);

  readonly SMALL_SCREEN_ALIAS = 'xs';
  filterValue = '';

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild('filterInput') filterInput: ElementRef;
  dataSource: MatTableDataSource<NarratorMetadata>;
  subscriptions: Subscription[] = [];

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  displayedColumns$: Observable<string[]> = of([]);

  mqAlias$: Observable<string>;

  narratorsTitles: MultiLingualText;

  constructor(private store: Store,
              private breakpointObserver: BreakpointObserver,
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
    this.narratorsTitles = {
      ar: 'الرواة',
      en: 'Narrators'
    };
    this.dataSource = new MatTableDataSource([]);
  }

  ngOnInit() {
    // Set columns to display dynamically based on what we get from server
    this.displayedColumns$ = this.mqAlias$.pipe(
      startWith(this.SMALL_SCREEN_ALIAS),
      withLatestFrom(this.narrators$),
      map(this.selectApplicableColumnsBasedOnBook())
    );
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'name.ar': return item.titles.ar;
        default: return item[property];
      }
    };
    this.dataSource.sort = this.sort;

    const subscription = this.narrators$.pipe(
      filter(x => x !== undefined))
      .subscribe((narratorMetadatas) => this.dataSource.data = narratorMetadatas);
    this.subscriptions.push(subscription);

    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

    // debounced search
    const s2 = fromEvent(this.filterInput.nativeElement, 'keyup')
      .pipe(
        debounceTime(150),
        distinctUntilChanged(),
        tap(() => {
          this.paginator.pageIndex = 0;
          this.applyFilter(this.filterValue);
        })
      )
      .subscribe();
    this.subscriptions.push(s2);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
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

  private selectApplicableColumnsBasedOnBook(): (value: [string, NarratorMetadata[]], index: number) => string[] {
    return ([mqAlias, narratorList]) => {
      const columns = [];
      if (!narratorList) {
        return columns;
      }
      if (mqAlias === this.SMALL_SCREEN_ALIAS) {
        return ['octrta']; // one column to rule them all
      }
      columns.push('index');
      // columns.push('name.en');
      columns.push('name.ar');
      columns.push('narrations');
      columns.push('narrated_from');
      columns.push('narrated_to');
      columns.push('conarrators');
      return columns;
    };
  }

  applyFilter(filterValue: string) {
    filterValue = filterValue.trim(); // Remove whitespace
    filterValue = filterValue.toLowerCase(); // Datasource defaults to lowercase matches
    this.dataSource.filter = filterValue;
  }

  keyAscOrder = (a: KeyValue<number, string>, b: KeyValue<number, string>): number => {
    const an = +a.key;
    const bn = +b.key;
    return an > bn ? 1 : (bn > an ? -1 : 0);
  }

  nameOrder = (a: KeyValue<number, string>, b: KeyValue<number, string>): number => {
    return a.value.localeCompare(b.value);
  }
}
