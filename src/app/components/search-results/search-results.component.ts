import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { SearchState } from '@store/search/search.state';
import { InitSearchIndex, SearchQuery } from '@store/search/search.actions';
import { SearchResult } from '@app/services/search.service';
import { Observable, Subscription } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.scss']
})
export class SearchResultsComponent implements OnInit, OnDestroy {
  results$: Observable<SearchResult[]> = inject(Store).select(SearchState.getResults);
  loading$: Observable<boolean> = inject(Store).select(SearchState.isLoading);
  query$: Observable<string> = inject(Store).select(SearchState.getQuery);
  error$: Observable<string> = inject(Store).select(SearchState.getError);

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

  getBookPath(result: SearchResult): string {
    // path is like "/books/al-kafi:1:2" — strip /books/ prefix
    return result.path.startsWith('/books/')
      ? result.path.substring(7)
      : result.path;
  }
}
