import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { KeyValue } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { NarratorMetadata } from '@app/models';
import { PeopleState } from '@store/people/people.state';
import { RetryLoadNarrator } from '@store/people/people.actions';
import { Observable, Subscription, fromEvent, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, startWith, tap, withLatestFrom } from 'rxjs/operators';
import { MultiLingualText } from './../../models/text';
import { Store } from '@ngxs/store';

/** Known Imam narrator IDs from the dataset (the Ahl al-Bayt) */
export const IMAM_IDS: Record<number, { en: string; ar: string }> = {
  15:  { en: 'Imam Ali', ar: 'الإمام علي (ع)' },
  279: { en: 'Imam Ali (Amir al-Mu\'minin)', ar: 'أمير المؤمنين (ع)' },
  8:   { en: 'Imam al-Baqir', ar: 'الإمام الباقر (ع)' },
  19:  { en: 'Imam al-Sadiq', ar: 'الإمام الصادق (ع)' },
  161: { en: 'Imam al-Sajjad', ar: 'الإمام السجاد (ع)' },
  90:  { en: 'Imam al-Ridha', ar: 'الإمام الرضا (ع)' },
  128: { en: 'Imam al-Kadhim', ar: 'الإمام الكاظم (ع)' },
  351: { en: 'Imam (Abu al-Hasan)', ar: 'أبي الحسن (ع)' },
  731: { en: 'Imam al-Jawad', ar: 'الإمام الجواد (ع)' },
  712: { en: 'Imam al-Hadi', ar: 'الإمام الهادي (ع)' },
};

/** IDs used for the featured Imams cards (main entries only, avoiding duplicates) */
const FEATURED_IMAM_IDS = [19, 8, 351, 161, 90, 128, 279, 15, 731, 712];

export interface FeaturedImam {
  id: number;
  nameEn: string;
  nameAr: string;
  narrations: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-people-list',
    templateUrl: './people-list.component.html',
    styleUrls: ['./people-list.component.scss'],
    standalone: false
})
export class PeopleListComponent implements AfterViewInit, OnInit, OnDestroy {

  narrators$: Observable<NarratorMetadata[]> = inject(Store).select(PeopleState.getEnrichedNarratorsList);
  loading$: Observable<boolean> = inject(Store).select(PeopleState.getCurrentLoading);
  error$: Observable<string> = inject(Store).select(PeopleState.getCurrentError);

  readonly SMALL_SCREEN_ALIAS = 'xs';
  filterValue = '';
  featuredImams: FeaturedImam[] = [];

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
        case 'name.en': return item.titles.en || '';
        default: return item[property];
      }
    };

    // Set default sort to narrations descending (NAR-01)
    this.sort.active = 'narrations';
    this.sort.direction = 'desc';

    this.dataSource.sort = this.sort;
    this.dataSource.filterPredicate = (data: NarratorMetadata, filter: string) => {
      const searchStr = ((data.titles.ar || '') + ' ' + (data.titles.en || '') + ' ' + data.index).toLowerCase();
      return searchStr.includes(filter);
    };

    const subscription = this.narrators$.pipe(
      filter(x => x !== undefined))
      .subscribe((narratorMetadatas) => {
        this.dataSource.data = narratorMetadatas;
        this.computeFeaturedImams(narratorMetadatas);
      });
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
      columns.push('name.en');
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

  isImam(index: string): boolean {
    return +index in IMAM_IDS;
  }

  getImamLabel(index: string): string {
    const imam = IMAM_IDS[+index];
    return imam ? imam.en : '';
  }

  private computeFeaturedImams(narrators: NarratorMetadata[]): void {
    if (!narrators) {
      this.featuredImams = [];
      return;
    }
    const narratorMap = new Map<string, NarratorMetadata>();
    for (const n of narrators) {
      narratorMap.set(n.index, n);
    }

    this.featuredImams = FEATURED_IMAM_IDS
      .filter(id => narratorMap.has(String(id)))
      .map(id => {
        const n = narratorMap.get(String(id))!;
        const imam = IMAM_IDS[id];
        return {
          id,
          nameEn: imam.en,
          nameAr: n.titles.ar,
          narrations: n.narrations
        };
      })
      .sort((a, b) => b.narrations - a.narrations);

    this.changeDetectorRefs.markForCheck();
  }

  onRetry(): void {
    this.store.dispatch(new RetryLoadNarrator('index'));
  }
}
