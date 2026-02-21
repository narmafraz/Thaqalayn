export class LoadNarrator {
  public static readonly type = '[People] Load narrator';
  constructor(public payload: string) { }
}

export class RetryLoadNarrator {
  public static readonly type = '[People] Retry load narrator';
  constructor(public payload: string) { }
}
