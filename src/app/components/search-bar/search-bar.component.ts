import { ChangeDetectionStrategy, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
  activeResultIndex = -1;
  private searchSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];

  constructor(private store: Store, private router: Router) {}

  ngOnInit(): void {
    this.store.dispatch(new InitSearchIndex());

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
    this.activeResultIndex = -1;
    this.searchSubject.next(value);
  }

  onSearchSubmit(): void {
    if (this.searchValue.trim().length >= 2) {
      this.showDropdown = false;
      this.router.navigate(['/search'], {
        queryParams: { q: this.searchValue.trim() },
        queryParamsHandling: 'merge'
      });
    }
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
    }, 200);
  }

  onFocus(): void {
    if (this.searchValue.length >= 2) {
      this.showDropdown = true;
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
    this.activeResultIndex = -1;
    this.store.dispatch(new ClearSearch());
  }
}
