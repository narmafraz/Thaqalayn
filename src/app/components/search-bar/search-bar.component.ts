import { ChangeDetectionStrategy, Component, ElementRef, inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { SearchState } from '@store/search/search.state';
import { ClearSearch, InitSearchIndex, SearchQuery, SetSearchMode } from '@store/search/search.actions';
import { SearchMode, SearchResult } from '@app/services/search.service';
import { Observable, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-search-bar',
    templateUrl: './search-bar.component.html',
    styleUrls: ['./search-bar.component.scss'],
    standalone: false
})
export class SearchBarComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput: ElementRef;

  results$: Observable<SearchResult[]> = inject(Store).select(SearchState.getResults);
  loading$: Observable<boolean> = inject(Store).select(SearchState.isLoading);
  query$: Observable<string> = inject(Store).select(SearchState.getQuery);
  mode$: Observable<SearchMode> = inject(Store).select(SearchState.getMode);

  searchValue = '';
  showDropdown = false;
  showTips = false;
  showRecent = false;
  recentSearches: string[] = [];
  activeResultIndex = -1;
  private indexRequested = false;
  private searchSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];
  private readonly RECENT_KEY = 'thaqalayn-recent-searches';
  private readonly RECENT_MAX = 6;
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor(private store: Store, private router: Router) {}

  ngOnInit(): void {
    this.recentSearches = this.loadRecent();

    // NOTE: the search index is NOT loaded here. It is loaded lazily on first
    // focus (onFocus) so nothing downloads on page load — the search bar is in
    // the header on every page (mobile-bandwidth rule).
    this.subscriptions.push(
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(query => {
        if (query.length >= 2) {
          this.store.dispatch(new SearchQuery(query));
          this.showDropdown = true;
        } else {
          this.showDropdown = false;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  onSearchInput(value: string): void {
    this.searchValue = value;
    this.showTips = false;
    this.showRecent = value.trim().length === 0 && this.recentSearches.length > 0;
    this.activeResultIndex = -1;
    this.searchSubject.next(value);
  }

  onSearchSubmit(): void {
    const q = this.searchValue.trim();
    if (q.length >= 2) {
      this.showDropdown = false;
      this.showRecent = false;
      this.recordRecent(q);
      this.router.navigate(['/search'], {
        queryParams: { q },
        queryParamsHandling: 'merge'
      });
    }
  }

  /** Run a saved recent search. */
  runRecent(term: string): void {
    this.searchValue = term;
    this.showRecent = false;
    this.onSearchSubmit();
  }

  removeRecent(term: string, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.recentSearches = this.recentSearches.filter((t) => t !== term);
    this.persistRecent();
    if (!this.recentSearches.length) { this.showRecent = false; }
  }

  clearRecent(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.recentSearches = [];
    this.persistRecent();
    this.showRecent = false;
  }

  private loadRecent(): string[] {
    if (!this.isBrowser) { return []; }
    try {
      const raw = localStorage.getItem(this.RECENT_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((t) => typeof t === 'string').slice(0, this.RECENT_MAX) : [];
    } catch { return []; }
  }

  private recordRecent(term: string): void {
    const t = term.trim();
    if (!t) { return; }
    this.recentSearches = [t, ...this.recentSearches.filter((x) => x !== t)].slice(0, this.RECENT_MAX);
    this.persistRecent();
  }

  private persistRecent(): void {
    if (!this.isBrowser) { return; }
    try { localStorage.setItem(this.RECENT_KEY, JSON.stringify(this.recentSearches)); } catch { /* ignore quota */ }
  }

  selectResult(result: SearchResult): void {
    this.showDropdown = false;
    this.searchValue = '';
    this.store.dispatch(new ClearSearch());
    this.router.navigate(['/books', result.path.replace('/books/', '')], {
      queryParamsHandling: 'preserve'
    });
  }

  setMode(mode: SearchMode): void {
    this.store.dispatch(new SetSearchMode(mode));
  }

  onBlur(): void {
    setTimeout(() => {
      this.showDropdown = false;
      this.showTips = false;
      this.showRecent = false;
    }, 200);
  }

  onFocus(): void {
    // Lazy-load the search index on first engagement (not on page load).
    if (!this.indexRequested) {
      this.indexRequested = true;
      this.store.dispatch(new InitSearchIndex());
    }
    if (this.searchValue.length >= 2) {
      this.showDropdown = true;
    } else if (this.recentSearches.length > 0) {
      this.showRecent = true;
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.showDropdown) return;

    // We need current results synchronously for arrow key navigation
    const results = this.store.selectSnapshot(SearchState.getResults) || [];
    const visibleCount = Math.min(results.length, 8);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeResultIndex = this.activeResultIndex < visibleCount - 1
          ? this.activeResultIndex + 1
          : 0;
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeResultIndex = this.activeResultIndex > 0
          ? this.activeResultIndex - 1
          : visibleCount - 1;
        break;
      case 'Enter':
        if (this.activeResultIndex >= 0 && this.activeResultIndex < visibleCount) {
          event.preventDefault();
          this.selectResult(results[this.activeResultIndex]);
        }
        break;
      case 'Escape':
        this.showDropdown = false;
        this.activeResultIndex = -1;
        break;
    }
  }

  getActiveDescendantId(): string | null {
    return this.activeResultIndex >= 0 ? `search-result-${this.activeResultIndex}` : null;
  }

  clearSearch(): void {
    this.searchValue = '';
    this.showDropdown = false;
    this.showRecent = this.recentSearches.length > 0;
    this.activeResultIndex = -1;
    this.store.dispatch(new ClearSearch());
  }
}
