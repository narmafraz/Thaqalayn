import { SearchMode } from '@app/services/search.service';

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

export class ClearSearch {
  public static readonly type = '[Search] Clear';
}
