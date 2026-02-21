import { Pipe, PipeTransform } from '@angular/core';


@Pipe({
    name: 'expandLanguage',
    standalone: false
})
export class ExpandLanguagePipe implements PipeTransform {

  private static readonly Languages: Record<string, string> = {
    ar: 'العربية',
    en: 'English',
    fa: 'فارسی',
    fr: 'Français',
    ur: 'اردو',
    tr: 'Türkçe',
    id: 'Bahasa Indonesia',
    bn: 'বাংলা',
    es: 'Español',
    de: 'Deutsch',
    ru: 'Русский',
    zh: '中文',
  };

  transform(value: string): string {
    return (value && ExpandLanguagePipe.Languages[value]) || value || 'UNKNOWN LANGUAGE';
  }

}
