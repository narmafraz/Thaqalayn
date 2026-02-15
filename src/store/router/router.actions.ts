export class BookPartIndexChanged {
  public static readonly type = '[Router] Book Part Index Changed';
  constructor(public payload: string) { }
}

export class SortChanged {
  public static readonly type = '[Router] Sort Changed';
  constructor(public payload: string) { }
}
