import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { SearchState } from '@store/search/search.state';
import { InitSearchIndex, SearchQuery, SetSearchMode } from '@store/search/search.actions';
import { SearchMode, SearchResult, SearchService } from '@app/services/search.service';
import { Observable, Subscription } from 'rxjs';

interface BookFilterEntry {
  name: string;
  count: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-search-results',
    templateUrl: './search-results.component.html',
    styleUrls: ['./search-results.component.scss'],
    standalone: false
})
export class SearchResultsComponent implements OnInit, OnDestroy {
  results$: Observable<SearchResult[]> = inject(Store).select(SearchState.getResults);
  loading$: Observable<boolean> = inject(Store).select(SearchState.isLoading);
  query$: Observable<string> = inject(Store).select(SearchState.getQuery);
  error$: Observable<string> = inject(Store).select(SearchState.getError);
  mode$: Observable<SearchMode> = inject(Store).select(SearchState.getMode);
  fullTextLoading$: Observable<boolean> = inject(Store).select(SearchState.isFullTextLoading);

  bookFilters: BookFilterEntry[] = [];
  activeBookFilter: string | null = null;
  filteredResults: SearchResult[] = [];
  activeFilter: { prefix: string; value: string } | null = null;
  displayedCount = 30;
  private allResults: SearchResult[] = [];
  private subscriptions: Subscription[] = [];
  private searchService = inject(SearchService);

  constructor(private store: Store, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.store.dispatch(new InitSearchIndex());

    this.subscriptions.push(
      this.route.queryParamMap.subscribe(params => {
        const q = params.get('q');
        if (q) {
          this.activeFilter = this.searchService.parseFilteredQuery(q);
          this.store.dispatch(new SearchQuery(q));
        } else {
          this.activeFilter = null;
        }
      })
    );

    this.subscriptions.push(
      this.results$.subscribe(results => {
        this.allResults = results;
        this.displayedCount = 30;
        this.buildBookFilters(results);
        this.applyFilter();
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  setMode(mode: SearchMode): void {
    this.store.dispatch(new SetSearchMode(mode));
  }

  toggleBookFilter(bookName: string): void {
    this.activeBookFilter = this.activeBookFilter === bookName ? null : bookName;
    this.applyFilter();
    this.cdr.markForCheck();
  }

  getBookPath(result: SearchResult): string {
    return result.path.startsWith('/books/')
      ? result.path.substring(7)
      : result.path;
  }

  /** Format a raw path like "/books/al-khisal:4:189" to "Al-Khisal 4:189" */
  formatPath(path: string): string {
    const match = path.match(/\/books\/([^:]+):?(.*)/);
    if (!match) return path;
    const slug = match[1];
    const rest = match[2];
    const name = slug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('-');
    return rest ? `${name} ${rest}` : name;
  }

  get displayedResults(): SearchResult[] {
    return this.filteredResults.slice(0, this.displayedCount);
  }

  get hasMoreResults(): boolean {
    return this.displayedCount < this.filteredResults.length;
  }

  loadMore(): void {
    this.displayedCount += 30;
    this.cdr.markForCheck();
  }

  formatFilterLabel(value: string): string {
    return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private buildBookFilters(results: SearchResult[]): void {
    const counts = new Map<string, number>();
    for (const r of results) {
      if (r.bookName) {
        counts.set(r.bookName, (counts.get(r.bookName) || 0) + 1);
      }
    }
    this.bookFilters = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Reset filter if the active book is no longer in results
    if (this.activeBookFilter && !counts.has(this.activeBookFilter)) {
      this.activeBookFilter = null;
    }
  }

  private applyFilter(): void {
    if (!this.activeBookFilter) {
      this.filteredResults = this.allResults;
    } else {
      this.filteredResults = this.allResults.filter(r => r.bookName === this.activeBookFilter);
    }
  }
}
