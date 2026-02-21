import { Pipe, PipeTransform } from '@angular/core';
import { I18nService } from '@app/services/i18n.service';

@Pipe({
  name: 'translate',
  pure: false
})
export class TranslatePipe implements PipeTransform {

  private cachedLang = '';
  private cachedKey = '';
  private cachedValue = '';

  constructor(private i18n: I18nService) {}

  transform(key: string): string {
    const currentLang = this.getCurrentLang();
    if (key === this.cachedKey && currentLang === this.cachedLang) {
      return this.cachedValue;
    }
    this.cachedKey = key;
    this.cachedLang = currentLang;
    this.cachedValue = this.i18n.get(key);
    return this.cachedValue;
  }

  private getCurrentLang(): string {
    let lang = '';
    this.i18n.currentLang$.subscribe(l => lang = l).unsubscribe();
    return lang;
  }
}
