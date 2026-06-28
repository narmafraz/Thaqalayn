import { Injectable } from '@angular/core';
import { SearchMode, SearchResult, SearchService, SortMode } from '@app/services/search.service';
import { PagefindFilterCounts } from '@app/services/pagefind.service';
import { I18nService } from '@app/services/i18n.service';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import {
  ClearFacets, ClearSearch, HydrateSearch, InitSearchIndex, SearchQuery,
  SetFacet, SetSearchLanguage, SetSearchMode, SetSort,
} from './search.actions';

export interface SearchStateModel {
  query: string;
  mode: SearchMode;
  searchLang: string;
  sort: SortMode;
  results: SearchResult[];
  facets: PagefindFilterCounts; // counts for the sidebar (from Pagefind totalFilters)
  activeFacets: Record<string, string[]>; // selected facet values per filter
  resultsCapped: boolean; // more matches exist than were loaded
  loading: boolean;
  indexReady: boolean;
  fullTextLoading: boolean;
  error: string | undefined;
}

@State<SearchStateModel>({
  name: 'search',
  defaults: {
    query: '',
    mode: 'fulltext', // content search by default (Pagefind fetches only per-query fragments)
    searchLang: 'both', // 'both' = the UI language + the original Arabic, merged
    sort: 'relevance', // 'relevance' (engine score) | 'book' (canonical book order)
    results: [],
    facets: {},
    activeFacets: {},
    resultsCapped: false,
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
  public static getSort(state: SearchStateModel): SortMode { return state.sort; }

  @Selector([SearchState])
  public static getResults(state: SearchStateModel): SearchResult[] { return state.results; }

  @Selector([SearchState])
  public static getFacets(state: SearchStateModel): PagefindFilterCounts { return state.facets; }

  @Selector([SearchState])
  public static getActiveFacets(state: SearchStateModel): Record<string, string[]> { return state.activeFacets; }

  @Selector([SearchState])
  public static getResultsCapped(state: SearchStateModel): boolean { return state.resultsCapped; }

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

  // Sort is a pure view-ordering change — no re-query needed; the results
  // component re-orders the existing results when this changes.
  @Action(SetSort)
  public setSort(ctx: StateContext<SearchStateModel>, action: SetSort) {
    ctx.patchState({ sort: action.sort });
  }

  @Action(ClearFacets)
  public clearFacets(ctx: StateContext<SearchStateModel>) {
    ctx.patchState({ activeFacets: {} });
    const { query } = ctx.getState();
    if (query) { ctx.dispatch(new SearchQuery(query)); }
  }

  // cancelUncompleted: a newer query cancels an in-flight one, so a slow search
  // can't resolve late and clobber the latest results with stale/empty data.
  @Action(SearchQuery, { cancelUncompleted: true })
  public async search(ctx: StateContext<SearchStateModel>, action: SearchQuery) {
    const query = action.query.trim();
    if (!query) {
      ctx.patchState({ query: '', results: [], facets: {}, loading: false });
      return;
    }

    const state = ctx.getState();
    const isFullText = state.mode === 'fulltext';

    // 'both' (default) searches the UI language AND the original Arabic index,
    // merged — so a query in either the reader's language or Arabic finds
    // results. A specific picked language narrows to just that index. (fa/ur are
    // themselves Arabic-script and are searched as their own index.)
    const langs = state.searchLang === 'both'
      ? [...new Set([this.i18n.currentLang, 'ar'])]
      : [state.searchLang];

    ctx.patchState({
      query,
      loading: true,
      fullTextLoading: isFullText && langs.some((l) => !this.searchService.isFullTextLoaded(l)),
      error: undefined,
    });

    try {
      await this.searchService.loadTitlesIndex();
      if (!ctx.getState().indexReady) { ctx.patchState({ indexReady: true }); }

      const outcome = await this.searchService.searchAll(query, state.mode, langs, state.activeFacets);
      ctx.patchState({
        results: outcome.results,
        facets: outcome.facets,
        resultsCapped: outcome.capped,
        loading: false,
        fullTextLoading: false,
      });
    } catch {
      ctx.patchState({ loading: false, fullTextLoading: false, error: 'Search failed' });
    }
  }

  // Restore a full search from the URL (query + language + mode + facets) in one
  // shot, then run a single search.
  @Action(HydrateSearch)
  public hydrate(ctx: StateContext<SearchStateModel>, action: HydrateSearch) {
    const p = action.params;
    const patch: Partial<SearchStateModel> = {};
    if (p.lang) { patch.searchLang = p.lang; }
    if (p.mode) { patch.mode = p.mode; }
    if (p.sort) { patch.sort = p.sort; }
    if (p.facets) { patch.activeFacets = p.facets; }
    if (Object.keys(patch).length) { ctx.patchState(patch); }
    ctx.dispatch(new SearchQuery(p.query || ''));
  }

  @Action(ClearSearch)
  public clear(ctx: StateContext<SearchStateModel>) {
    ctx.patchState({ query: '', results: [], facets: {}, activeFacets: {}, error: undefined });
  }
}
