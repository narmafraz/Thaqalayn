export class BooksAction {
  public static readonly type = '[Books] Add item';
  constructor(public payload: string) { }
}

export class LoadBookPart {
  public static readonly type = '[Books] Load part';
  constructor(public payload: string) { }
}

export class LoadNarrator {
  public static readonly type = '[People] Load narrator';
  constructor(public payload: string) { }
}
