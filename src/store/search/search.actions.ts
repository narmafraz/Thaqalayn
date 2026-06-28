import { SearchMode, SortMode } from '@app/services/search.service';

export class InitSearchIndex {
  public static readonly type = '[Search] Init index';
}

export class SearchQuery {
  public static readonly type = '[Search] Query';
  constructor(public query: string) { }
}

export class SetSearchMode {
  public static readonly type = '[Search] Set mode';
  constructor(public mode: SearchMode) { }
}

export class SetSearchLanguage {
  public static readonly type = '[Search] Set language';
  constructor(public lang: string) { }
}

/** Toggle a facet value on/off (filter e.g. 'book' | 'content_type' | 'has_chain' | 'topic' | 'tag'). */
export class SetFacet {
  public static readonly type = '[Search] Set facet';
  constructor(public filter: string, public value: string, public selected: boolean) { }
}

export class ClearFacets {
  public static readonly type = '[Search] Clear facets';
}

/** Set the result ordering ('relevance' = engine score, 'book' = canonical book order). */
export class SetSort {
  public static readonly type = '[Search] Set sort';
  constructor(public sort: SortMode) { }
}

/** Restore a full search from URL params (query + language + mode + facets) in one shot. */
export class HydrateSearch {
  public static readonly type = '[Search] Hydrate';
  constructor(public params: {
    query?: string;
    lang?: string;
    mode?: SearchMode;
    sort?: SortMode;
    facets?: Record<string, string[]>;
  }) { }
}

export class ClearSearch {
  public static readonly type = '[Search] Clear';
}
