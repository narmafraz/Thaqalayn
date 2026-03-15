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

export interface NarratorFilter {
  text: string;
  minNarrations?: number;
  maxNarrations?: number;
  minFrom?: number;
  maxFrom?: number;
  minTo?: number;
  maxTo?: number;
  category?: string;
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

  // ADV-05: Advanced filter state
  showFilters = false;
  minNarrations: number | null = null;
  maxNarrations: number | null = null;
  minFrom: number | null = null;
  maxFrom: number | null = null;
  minTo: number | null = null;
  maxTo: number | null = null;

  // ADV-06: Category chips
  selectedCategory = 'all';
  allNarrators: NarratorMetadata[] = [];
  imamCount = 0;
  topCount = 0;

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
        case 'name': return item.titles.en || item.titles.ar;
        default: return item[property];
      }
    };

    // Set default sort to narrations descending (NAR-01)
    this.sort.active = 'narrations';
    this.sort.direction = 'desc';

    this.dataSource.sort = this.sort;
    this.dataSource.filterPredicate = (data: NarratorMetadata, filterStr: string) => {
      if (!filterStr) return true;
      try {
        const f: NarratorFilter = JSON.parse(filterStr);
        // Text match
        if (f.text) {
          const text = f.text.toLowerCase();
          const searchStr = ((data.titles.ar || '') + ' ' + (data.titles.en || '') + ' ' + data.index).toLowerCase();
          if (!searchStr.includes(text)) return false;
        }
        // Numeric range filters
        if (f.minNarrations && data.narrations < f.minNarrations) return false;
        if (f.maxNarrations && data.narrations > f.maxNarrations) return false;
        if (f.minFrom && data.narrated_from < f.minFrom) return false;
        if (f.maxFrom && data.narrated_from > f.maxFrom) return false;
        if (f.minTo && data.narrated_to < f.minTo) return false;
        if (f.maxTo && data.narrated_to > f.maxTo) return false;
        return true;
      } catch {
        // Fallback to simple text filter for backward compatibility
        const searchStr = ((data.titles.ar || '') + ' ' + (data.titles.en || '') + ' ' + data.index).toLowerCase();
        return searchStr.includes(filterStr);
      }
    };

    const subscription = this.narrators$.pipe(
      filter(x => x !== undefined))
      .subscribe((narratorMetadatas) => {
        this.allNarrators = narratorMetadatas;
        this.computeCategoryCounts(narratorMetadatas);
        this.applyCategoryFilter(narratorMetadatas);
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
      columns.push('name');
      columns.push('narrations');
      columns.push('narrated_from');
      columns.push('narrated_to');
      columns.push('conarrators');
      return columns;
    };
  }

  getNarrationPillClass(narrations: number): string {
    if (narrations >= 1000) return 'pill-high';
    if (narrations >= 100) return 'pill-medium';
    return 'pill-low';
  }

  applyFilter(filterValue: string) {
    const f: NarratorFilter = {
      text: (filterValue || '').trim().toLowerCase(),
      minNarrations: this.minNarrations || undefined,
      maxNarrations: this.maxNarrations || undefined,
      minFrom: this.minFrom || undefined,
      maxFrom: this.maxFrom || undefined,
      minTo: this.minTo || undefined,
      maxTo: this.maxTo || undefined,
    };
    this.dataSource.filter = JSON.stringify(f);
  }

  applyAdvancedFilter(): void {
    this.paginator.pageIndex = 0;
    this.applyFilter(this.filterValue);
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  clearFilters(): void {
    this.minNarrations = null;
    this.maxNarrations = null;
    this.minFrom = null;
    this.maxFrom = null;
    this.minTo = null;
    this.maxTo = null;
    this.applyAdvancedFilter();
  }

  get hasActiveFilters(): boolean {
    return !!(this.minNarrations || this.maxNarrations || this.minFrom || this.maxFrom || this.minTo || this.maxTo);
  }

  // ADV-06: Category filtering
  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.applyCategoryFilter(this.allNarrators);
    // Re-apply text/numeric filters on top
    this.applyAdvancedFilter();
  }

  private applyCategoryFilter(narrators: NarratorMetadata[]): void {
    if (!narrators) return;
    switch (this.selectedCategory) {
      case 'imams':
        this.dataSource.data = narrators.filter(n => +n.index in IMAM_IDS);
        break;
      case 'top':
        this.dataSource.data = narrators.filter(n => n.narrations >= 500);
        break;
      default:
        this.dataSource.data = narrators;
        break;
    }
  }

  private computeCategoryCounts(narrators: NarratorMetadata[]): void {
    if (!narrators) {
      this.imamCount = 0;
      this.topCount = 0;
      return;
    }
    this.imamCount = narrators.filter(n => +n.index in IMAM_IDS).length;
    this.topCount = narrators.filter(n => n.narrations >= 500).length;
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
