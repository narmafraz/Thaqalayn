export class InitSearchIndex {
  public static readonly type = '[Search] Init index';
}

export class SearchQuery {
  public static readonly type = '[Search] Query';
  constructor(public query: string) { }
}

export class ClearSearch {
  public static readonly type = '[Search] Clear';
}
