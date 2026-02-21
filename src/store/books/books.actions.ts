export class LoadBookPart {
  public static readonly type = '[Books] Load part';
  constructor(public payload: string) { }
}

export class RetryLoadBookPart {
  public static readonly type = '[Books] Retry load part';
  constructor(public payload: string) { }
}
