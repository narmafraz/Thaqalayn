export class LoadBookPart {
  public static readonly type = '[Books] Load part';
  constructor(public payload: string) { }
}
