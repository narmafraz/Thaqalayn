import { Pipe, PipeTransform } from '@angular/core';


@Pipe({
  name: 'expandLanguage'
})
export class ExpandLanguagePipe implements PipeTransform {

  private static readonly Languages = {
    en: 'English',
    fa: 'Persian',
  };

  transform(value: string): string {
    return (value && ExpandLanguagePipe.Languages[value]) || 'UNKNOWN LANGUAGE';
  }

}
