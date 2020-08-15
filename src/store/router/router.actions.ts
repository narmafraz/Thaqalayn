export class RouterAction {
  public static readonly type = '[Router] Add item';
  constructor(public payload: string) { }
}

export class BookPartIndexChanged {
  public static readonly type = '[Router] Book Part Index Changed';
  constructor(public payload: string) { }
}

export class SortChanged {
  public static readonly type = '[Router] Sort Changed';
  constructor(public payload: string) { }
}

export class TranslationChanged {
  public static readonly type = '[Router] Translation Changed';
  constructor(public payload: string) { }
}
