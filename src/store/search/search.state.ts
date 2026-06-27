import { Injectable } from '@angular/core';
import { SearchMode, SearchResult, SearchService } from '@app/services/search.service';
import { PagefindFilterCounts } from '@app/services/pagefind.service';
import { I18nService } from '@app/services/i18n.service';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import {
  ClearFacets, ClearSearch, InitSearchIndex, SearchQuery,
  SetFacet, SetSearchLanguage, SetSearchMode,
} from './search.actions';

export interface SearchStateModel {
  query: string;
  mode: SearchMode;
  searchLang: string;
  results: SearchResult[];
  facets: PagefindFilterCounts; // counts for the sidebar (from Pagefind totalFilters)
  activeFacets: Record<string, string[]>; // selected facet values per filter
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
    searchLang: 'en',
    results: [],
    facets: {},
    activeFacets: {},
    loading: false,
    indexReady: false,
    fullTextLoading: false,
    error: undefined,
  },
})
@Injectable()
export class SearchState {
  constructor(private searchService: SearchService, private i18n: I18nService) {}

  @Selector([SearchState])
  public static getQuery(state: SearchStateModel): string { return state.query; }

  @Selector([SearchState])
  public static getMode(state: SearchStateModel): SearchMode { return state.mode; }

  @Selector([SearchState])
  public static getSearchLang(state: SearchStateModel): string { return state.searchLang; }

  @Selector([SearchState])
  public static getResults(state: SearchStateModel): SearchResult[] { return state.results; }

  @Selector([SearchState])
  public static getFacets(state: SearchStateModel): PagefindFilterCounts { return state.facets; }

  @Selector([SearchState])
  public static getActiveFacets(state: SearchStateModel): Record<string, string[]> { return state.activeFacets; }

  @Selector([SearchState])
  public static isLoading(state: SearchStateModel): boolean { return state.loading; }

  @Selector([SearchState])
  public static isIndexReady(state: SearchStateModel): boolean { return state.indexReady; }

  @Selector([SearchState])
  public static isFullTextLoading(state: SearchStateModel): boolean { return state.fullTextLoading; }

  @Selector([SearchState])
  public static getError(state: SearchStateModel): string | undefined { return state.error; }

  @Action(InitSearchIndex)
  public async initIndex(ctx: StateContext<SearchStateModel>) {
    // Default the search language to the active UI language (the picker can change it).
    if (ctx.getState().searchLang === 'en' && this.i18n.currentLang) {
      ctx.patchState({ searchLang: this.i18n.currentLang });
    }
    try {
      await this.searchService.loadTitlesIndex();
      ctx.patchState({ indexReady: true });
    } catch {
      ctx.patchState({ error: 'Failed to load search index' });
    }
  }

  @Action(SetSearchMode)
  public setMode(ctx: StateContext<SearchStateModel>, action: SetSearchMode) {
    ctx.patchState({ mode: action.mode });
    const { query } = ctx.getState();
    if (query) { ctx.dispatch(new SearchQuery(query)); }
  }

  @Action(SetSearchLanguage)
  public setLanguage(ctx: StateContext<SearchStateModel>, action: SetSearchLanguage) {
    ctx.patchState({ searchLang: action.lang });
    const { query, mode } = ctx.getState();
    if (query && mode === 'fulltext') { ctx.dispatch(new SearchQuery(query)); }
  }

  @Action(SetFacet)
  public setFacet(ctx: StateContext<SearchStateModel>, action: SetFacet) {
    const active = { ...ctx.getState().activeFacets };
    const current = new Set(active[action.filter] || []);
    if (action.selected) { current.add(action.value); } else { current.delete(action.value); }
    if (current.size) { active[action.filter] = [...current]; } else { delete active[action.filter]; }
    ctx.patchState({ activeFacets: active });
    const { query } = ctx.getState();
    if (query) { ctx.dispatch(new SearchQuery(query)); }
  }

  @Action(ClearFacets)
  public clearFacets(ctx: StateContext<SearchStateModel>) {
    ctx.patchState({ activeFacets: {} });
    const { query } = ctx.getState();
    if (query) { ctx.dispatch(new SearchQuery(query)); }
  }

  @Action(SearchQuery)
  public async search(ctx: StateContext<SearchStateModel>, action: SearchQuery) {
    const query = action.query.trim();
    if (!query) {
      ctx.patchState({ query: '', results: [], facets: {}, loading: false });
      return;
    }

    const state = ctx.getState();
    const isFullText = state.mode === 'fulltext';

    ctx.patchState({
      query,
      loading: true,
      fullTextLoading: isFullText && !this.searchService.isFullTextLoaded(state.searchLang),
      error: undefined,
    });

    try {
      await this.searchService.loadTitlesIndex();
      if (!ctx.getState().indexReady) { ctx.patchState({ indexReady: true }); }

      const outcome = await this.searchService.searchAll(query, state.mode, state.searchLang, state.activeFacets);
      ctx.patchState({
        results: outcome.results,
        facets: outcome.facets,
        loading: false,
        fullTextLoading: false,
      });
    } catch {
      ctx.patchState({ loading: false, fullTextLoading: false, error: 'Search failed' });
    }
  }

  @Action(ClearSearch)
  public clear(ctx: StateContext<SearchStateModel>) {
    ctx.patchState({ query: '', results: [], facets: {}, activeFacets: {}, error: undefined });
  }
}
