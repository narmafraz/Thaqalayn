import { ChangeDetectionStrategy, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { SearchState } from '@store/search/search.state';
import { ClearSearch, InitSearchIndex, SearchQuery } from '@store/search/search.actions';
import { SearchResult } from '@app/services/search.service';
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

  searchValue = '';
  showDropdown = false;
  private searchSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];

  constructor(private store: Store, private router: Router) {}

  ngOnInit(): void {
    // Initialize the search index on first use
    this.store.dispatch(new InitSearchIndex());

    // Debounce search input
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

  onBlur(): void {
    // Delay to allow click on dropdown items
    setTimeout(() => {
      this.showDropdown = false;
    }, 200);
  }

  onFocus(): void {
    if (this.searchValue.length >= 2) {
      this.showDropdown = true;
    }
  }

  clearSearch(): void {
    this.searchValue = '';
    this.showDropdown = false;
    this.store.dispatch(new ClearSearch());
  }
}
