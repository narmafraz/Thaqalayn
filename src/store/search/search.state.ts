import { Injectable } from '@angular/core';
import { SearchMode, SearchResult, SearchService } from '@app/services/search.service';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { ClearSearch, InitSearchIndex, SearchQuery, SetSearchMode } from './search.actions';

export interface SearchStateModel {
  query: string;
  mode: SearchMode;
  results: SearchResult[];
  loading: boolean;
  indexReady: boolean;
  fullTextLoading: boolean;
  error: string | undefined;
}

@State<SearchStateModel>({
  name: 'search',
  defaults: {
    query: '',
    mode: 'titles',
    results: [],
    loading: false,
    indexReady: false,
    fullTextLoading: false,
    error: undefined
  }
})
@Injectable()
export class SearchState {
  constructor(private searchService: SearchService) {}

  @Selector([SearchState])
  public static getQuery(state: SearchStateModel): string {
    return state.query;
  }

  @Selector([SearchState])
  public static getMode(state: SearchStateModel): SearchMode {
    return state.mode;
  }

  @Selector([SearchState])
  public static getResults(state: SearchStateModel): SearchResult[] {
    return state.results;
  }

  @Selector([SearchState])
  public static isLoading(state: SearchStateModel): boolean {
    return state.loading;
  }

  @Selector([SearchState])
  public static isIndexReady(state: SearchStateModel): boolean {
    return state.indexReady;
  }

  @Selector([SearchState])
  public static isFullTextLoading(state: SearchStateModel): boolean {
    return state.fullTextLoading;
  }

  @Selector([SearchState])
  public static getError(state: SearchStateModel): string | undefined {
    return state.error;
  }

  @Action(InitSearchIndex)
  public async initIndex(ctx: StateContext<SearchStateModel>) {
    try {
      await this.searchService.loadTitlesIndex();
      ctx.patchState({ indexReady: true });
    } catch {
      ctx.patchState({ error: 'Failed to load search index' });
    }
  }

  @Action(SetSearchMode)
  public async setMode(ctx: StateContext<SearchStateModel>, action: SetSearchMode) {
    const state = ctx.getState();
    ctx.patchState({ mode: action.mode });

    // If switching to fulltext and we have a query, re-run the search
    if (state.query) {
      ctx.dispatch(new SearchQuery(state.query));
    }
  }

  @Action(SearchQuery)
  public async search(ctx: StateContext<SearchStateModel>, action: SearchQuery) {
    const query = action.query.trim();
    if (!query) {
      ctx.patchState({ query: '', results: [], loading: false });
      return;
    }

    const state = ctx.getState();
    const parsed = this.searchService.parseFilteredQuery(query);
    const needsFullText = state.mode === 'fulltext' || parsed?.prefix === 'topic';

    ctx.patchState({
      query,
      loading: true,
      fullTextLoading: needsFullText && !this.searchService.isFullTextLoaded,
      error: undefined
    });

    try {
      // Ensure titles index is loaded before searching
      await this.searchService.loadTitlesIndex();
      if (!ctx.getState().indexReady) {
        ctx.patchState({ indexReady: true });
      }
      const results = await this.searchService.searchAll(query, state.mode);
      ctx.patchState({ results, loading: false, fullTextLoading: false });
    } catch {
      ctx.patchState({
        loading: false,
        fullTextLoading: false,
        error: 'Search failed'
      });
    }
  }

  @Action(ClearSearch)
  public clear(ctx: StateContext<SearchStateModel>) {
    ctx.patchState({ query: '', results: [], error: undefined });
  }
}
