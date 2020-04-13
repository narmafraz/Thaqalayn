export class BooksAction {
  public static readonly type = '[Books] Add item';
  constructor(public payload: string) { }
}

export class LoadBookTitles {
  public static readonly type = '[Books] Load titles';
}

export class LoadBookPart {
  public static readonly type = '[Books] Load part';
  constructor(public payload: string) { }
}
