export class LoadIndex {
  static readonly type = '[Index] Load Index';
  constructor(public language: string) {}
}

export class LoadTranslations {
  static readonly type = '[Index] Load Translations';
}
