import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Translation } from '@app/models';
import { Navigate } from '@ngxs/router-plugin';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { RouterState } from '@store/router/router.state';
import { Observable } from 'rxjs';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-translation-selection',
    templateUrl: './translation-selection.component.html',
    styleUrls: ['./translation-selection.component.scss'],
    standalone: false
})
export class TranslationSelectionComponent {
  translation$: Observable<string> = inject(Store).select(BooksState.getTranslationIfInBookOrDefault);
  translation2$: Observable<string> = inject(Store).select(RouterState.getTranslation2);
  translations$: Observable<Translation[]> = inject(Store).select(BooksState.getBookTranslations);

  constructor(private store: Store) {
  }

  selectedTranslation(value: string) {
    this.store.dispatch(new Navigate([], {translation: value}, {queryParamsHandling: 'merge'}));
  }

  selectedTranslation2(value: string) {
    this.store.dispatch(new Navigate([], {translation2: value || null}, {queryParamsHandling: 'merge'}));
  }

  toggleCompare(translations: Translation[], currentTranslation: string) {
    const current2 = this.store.selectSnapshot(RouterState.getTranslation2);
    if (current2) {
      // Turn off compare mode
      this.store.dispatch(new Navigate([], {translation2: null}, {queryParamsHandling: 'merge'}));
    } else {
      // Turn on compare mode - pick a different translation
      const other = translations.find(t => t.id !== currentTranslation);
      if (other) {
        this.store.dispatch(new Navigate([], {translation2: other.id}, {queryParamsHandling: 'merge'}));
      }
    }
  }
}
