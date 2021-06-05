import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Translation } from '@app/models';
import { Navigate } from '@ngxs/router-plugin';
import { Select, Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-translation-selection',
  templateUrl: './translation-selection.component.html',
  styleUrls: ['./translation-selection.component.scss']
})
export class TranslationSelectionComponent {
  @Select(BooksState.getTranslationIfInBookOrDefault) translation$: Observable<string>;
  @Select(BooksState.getBookTranslations) translations$: Observable<Translation[]>;

  constructor(private store: Store) {
  }

  selectedTranslation(value: string) {
    this.store.dispatch(new Navigate([], {translation: value}, {queryParamsHandling: 'merge'}));
  }

}
