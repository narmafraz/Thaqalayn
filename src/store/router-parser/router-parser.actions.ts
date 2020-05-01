export class RouterParserAction {
  public static readonly type = '[RouterParser] Add item';
  constructor(public payload: string) { }
}