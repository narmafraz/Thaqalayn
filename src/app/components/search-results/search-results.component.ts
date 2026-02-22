import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { SearchState } from '@store/search/search.state';
import { InitSearchIndex, SearchQuery, SetSearchMode } from '@store/search/search.actions';
import { SearchMode, SearchResult } from '@app/services/search.service';
import { Observable, Subscription } from 'rxjs';

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

  private subscriptions: Subscription[] = [];

  constructor(private store: Store, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.store.dispatch(new InitSearchIndex());

    this.subscriptions.push(
      this.route.queryParamMap.subscribe(params => {
        const q = params.get('q');
        if (q) {
          this.store.dispatch(new SearchQuery(q));
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  setMode(mode: SearchMode): void {
    this.store.dispatch(new SetSearchMode(mode));
  }

  getBookPath(result: SearchResult): string {
    return result.path.startsWith('/books/')
      ? result.path.substring(7)
      : result.path;
  }
}
