import { Injectable } from '@angular/core';
import { SearchResult, SearchService } from '@app/services/search.service';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { ClearSearch, InitSearchIndex, SearchQuery } from './search.actions';

export interface SearchStateModel {
  query: string;
  results: SearchResult[];
  loading: boolean;
  indexReady: boolean;
  error: string | undefined;
}

@State<SearchStateModel>({
  name: 'search',
  defaults: {
    query: '',
    results: [],
    loading: false,
    indexReady: false,
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

  @Action(SearchQuery)
  public async search(ctx: StateContext<SearchStateModel>, action: SearchQuery) {
    const query = action.query.trim();
    if (!query) {
      ctx.patchState({ query: '', results: [], loading: false });
      return;
    }

    ctx.patchState({ query, loading: true, error: undefined });

    try {
      const results = await this.searchService.searchTitles(query);
      ctx.patchState({ results, loading: false });
    } catch {
      ctx.patchState({
        loading: false,
        error: 'Search failed'
      });
    }
  }

  @Action(ClearSearch)
  public clear(ctx: StateContext<SearchStateModel>) {
    ctx.patchState({ query: '', results: [], error: undefined });
  }
}
