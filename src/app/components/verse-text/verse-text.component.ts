import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { Verse } from '@app/models';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-verse-text',
  templateUrl: './verse-text.component.html',
  styleUrls: ['./verse-text.component.scss']
})
export class VerseTextComponent {
  translation$: Observable<string> = inject(Store).select(BooksState.getTranslationIfInBookOrDefault);
  translationClass$: Observable<string> = inject(Store).select(BooksState.getTranslationClass);

  @Input() verse: Verse;

  constructor(private store: Store) {
  }
}
