import { KeyValue } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, OnDestroy } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ChainVerses, Narrator, NarratorMetadata } from '@app/models';
import { Store } from '@ngxs/store';
import { PeopleState } from '@store/people/people.state';
import { RetryLoadNarrator } from '@store/people/people.actions';
import { RouterState } from '@store/router/router.state';
import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, takeUntil } from 'rxjs/operators';

export interface ConarratorSummary {
  id: number;
  name: string;
  count: number;
}

export interface BookDistribution {
  book: string;
  displayName: string;
  count: number;
  percentage: number;
}

/** Display name mapping for book path prefixes */
const BOOK_DISPLAY_NAMES: Record<string, string> = {
  'al-kafi': 'Al-Kafi',
  'quran': 'Quran',
  'tahdhib-al-ahkam': 'Tahdhib al-Ahkam',
  'al-istibsar': 'Al-Istibsar',
  'man-la-yahduruhu-al-faqih': 'Man La Yahduruhu al-Faqih',
  'kitab-al-irshad': 'Kitab al-Irshad',
  'al-amali': 'Al-Amali',
  'kitab-sulaym-ibn-qays': 'Kitab Sulaym ibn Qays',
  'nahj-al-balagha': 'Nahj al-Balagha',
  'al-sahifa-al-sajjadiyya': 'Al-Sahifa al-Sajjadiyya',
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-people-content',
    templateUrl: './people-content.component.html',
    styleUrls: ['./people-content.component.scss'],
    standalone: false
})
export class PeopleContentComponent implements OnInit, OnDestroy {
  narrator$: Observable<Narrator> = inject(Store).select(PeopleState.getCurrentNavigatedNarrator);
  narratorIndex$: Observable<Record<number, NarratorMetadata>> = inject(Store).select(PeopleState.getEnrichedNarratorIndex);
  loading$: Observable<boolean> = inject(Store).select(PeopleState.getCurrentLoading);
  error$: Observable<string> = inject(Store).select(PeopleState.getCurrentError);

  private store = inject(Store);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  // All paths data
  private allPaths: { path: string }[] = [];
  filteredPaths: { path: string }[] = [];
  paginatedPaths: { path: string }[] = [];
  pathsPageSize = 50;
  pathsPage = 0;

  // All subchains data
  private allSubchains: KeyValue<string, ChainVerses>[] = [];
  filteredSubchains: KeyValue<string, ChainVerses>[] = [];
  paginatedSubchains: KeyValue<string, ChainVerses>[] = [];
  subchainsPageSize = 10;
  subchainsPage = 0;

  // Expansion tracking for subchain verse paths
  expandedSubchains = new Set<string>();

  // Top co-narrators (NAR-04)
  topConarrators: ConarratorSummary[] = [];
  uniqueConarratorCount = 0;
  showAllConarrators = false;

  // Stats summary (NAR-02)
  totalNarrations = 0;
  bookCount = 0;
  bookDistribution: BookDistribution[] = [];

  // Filter
  private pathsFilterSubject = new Subject<string>();
  private subchainsFilterSubject = new Subject<string>();
  private narratorIndex: Record<number, NarratorMetadata> = {};
  private currentNarratorIndex: string = '';

  ngOnInit() {
    // Load narrator index for filtering
    this.narratorIndex$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(index => {
      this.narratorIndex = index || {};
    });

    // Setup paths filter
    this.pathsFilterSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(filterValue => {
      this.pathsPage = 0;
      if (!filterValue) {
        this.filteredPaths = this.allPaths;
      } else {
        const lower = filterValue.toLowerCase();
        this.filteredPaths = this.allPaths.filter(item =>
          item.path.toLowerCase().includes(lower)
        );
      }
      this.updatePaginatedPaths();
      this.cdr.markForCheck();
    });

    // Setup subchains filter with Arabic support
    this.subchainsFilterSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(filterValue => {
      this.subchainsPage = 0;
      if (!filterValue) {
        this.filteredSubchains = this.allSubchains;
      } else {
        const normalizedFilter = this.normalizeArabic(filterValue);
        this.filteredSubchains = this.allSubchains.filter(data => {
          const normalizedKey = this.normalizeArabic(data.key);
          if (normalizedKey.includes(normalizedFilter)) {
            return true;
          }
          return (data.value.narrator_ids || []).some(id => {
            const narrator = this.narratorIndex[id];
            return narrator ? this.normalizeArabic(narrator.titles.ar).includes(normalizedFilter) : false;
          });
        });
      }
      this.updatePaginatedSubchains();
      this.cdr.markForCheck();
    });

    // Handle narrator data loading
    this.narrator$.pipe(
      filter(narrator => !!narrator),
      takeUntil(this.destroy$)
    ).subscribe(narrator => {
      this.currentNarratorIndex = narrator.index;

      // Process verse paths
      if (narrator.verse_paths) {
        this.allPaths = this.sortBy(narrator.verse_paths).map(path => ({ path }));
      } else {
        this.allPaths = [];
      }
      this.filteredPaths = this.allPaths;
      this.pathsPage = 0;
      this.updatePaginatedPaths();

      // Compute stats summary (NAR-02)
      this.computeStats(narrator);

      // Process subchains
      if (narrator.subchains) {
        this.allSubchains = Object.entries(narrator.subchains)
          .map(([key, value]) => ({ key, value }))
          .sort((a, b) => {
            const an = a.value.narrator_ids ? a.value.narrator_ids.length : 0;
            const bn = b.value.narrator_ids ? b.value.narrator_ids.length : 0;
            return bn - an;
          });

        // Compute top co-narrators (NAR-04)
        this.computeTopConarrators(narrator);
      } else {
        this.allSubchains = [];
        this.topConarrators = [];
        this.uniqueConarratorCount = 0;
      }
      this.filteredSubchains = this.allSubchains;
      this.subchainsPage = 0;
      this.showAllConarrators = false;
      this.expandedSubchains.clear();
      this.updatePaginatedSubchains();

      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyPathsFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim();
    this.pathsFilterSubject.next(filterValue);
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim();
    this.subchainsFilterSubject.next(filterValue);
  }

  onPathsPageChange(event: PageEvent) {
    this.pathsPage = event.pageIndex;
    this.pathsPageSize = event.pageSize;
    this.updatePaginatedPaths();
  }

  onSubchainsPageChange(event: PageEvent) {
    this.subchainsPage = event.pageIndex;
    this.subchainsPageSize = event.pageSize;
    this.updatePaginatedSubchains();
  }

  getVisiblePaths(element: KeyValue<string, ChainVerses>): string[] {
    if (!element.value.verse_paths) return [];
    if (this.expandedSubchains.has(element.key)) {
      return element.value.verse_paths;
    }
    return element.value.verse_paths.slice(0, 3);
  }

  toggleExpandSubchain(key: string) {
    if (this.expandedSubchains.has(key)) {
      this.expandedSubchains.delete(key);
    } else {
      this.expandedSubchains.add(key);
    }
  }

  isExpanded(key: string): boolean {
    return this.expandedSubchains.has(key);
  }

  sortVersePathsByLength() {
    this.allPaths = [...this.allPaths].sort((a, b) => a.path.length - b.path.length);
    this.filteredPaths = this.allPaths;
    this.pathsPage = 0;
    this.updatePaginatedPaths();
  }

  onRetry(): void {
    const index = this.store.selectSnapshot(RouterState.getBookPartIndex) || 'people';
    this.store.dispatch(new RetryLoadNarrator(index));
  }

  private updatePaginatedPaths() {
    const start = this.pathsPage * this.pathsPageSize;
    this.paginatedPaths = this.filteredPaths.slice(start, start + this.pathsPageSize);
  }

  private updatePaginatedSubchains() {
    const start = this.subchainsPage * this.subchainsPageSize;
    this.paginatedSubchains = this.filteredSubchains.slice(start, start + this.subchainsPageSize);
  }

  private sortBy(lst: string[]) {
    return [...lst].sort((a, b) => (a > b ? 1 : a === b ? 0 : -1));
  }

  private normalizeArabic(text: string): string {
    if (!text) return '';
    return text
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8]/g, '')
      .replace(/[إأآا]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[يى]/g, 'ي')
      .toLowerCase()
      .trim();
  }

  /** Compute top co-narrators from subchains (NAR-04) */
  private computeTopConarrators(narrator: Narrator): void {
    const currentId = parseInt(narrator.index, 10);
    const conarratorCounts = new Map<number, number>();

    if (narrator.subchains) {
      for (const chain of Object.values(narrator.subchains)) {
        if (!chain.narrator_ids) continue;
        const verseCount = chain.verse_paths ? chain.verse_paths.length : 0;
        for (const id of chain.narrator_ids) {
          if (id === currentId) continue;
          conarratorCounts.set(id, (conarratorCounts.get(id) || 0) + verseCount);
        }
      }
    }

    this.uniqueConarratorCount = conarratorCounts.size;

    const sorted = Array.from(conarratorCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    this.topConarrators = sorted.slice(0, 10).map(([id, count]) => ({
      id,
      name: this.narratorIndex[id]?.titles?.ar || String(id),
      count
    }));
  }

  /** Compute stats summary from verse_paths (NAR-02) */
  private computeStats(narrator: Narrator): void {
    const paths = narrator.verse_paths || [];
    this.totalNarrations = paths.length;

    const bookCounts = new Map<string, number>();
    for (const path of paths) {
      // path format: /books/al-kafi:1:2:3:4
      const match = path.match(/^\/books\/([^:]+)/);
      if (match) {
        const book = match[1];
        bookCounts.set(book, (bookCounts.get(book) || 0) + 1);
      }
    }

    this.bookCount = bookCounts.size;
    const maxCount = Math.max(...Array.from(bookCounts.values()), 1);

    this.bookDistribution = Array.from(bookCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([book, count]) => ({
        book,
        displayName: BOOK_DISPLAY_NAMES[book] || book,
        count,
        percentage: (count / maxCount) * 100
      }));
  }
}
