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

export class ClearSearch {
  public static readonly type = '[Search] Clear';
}
