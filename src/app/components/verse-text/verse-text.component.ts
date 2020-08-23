import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Verse } from '@app/models';
import { Select } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-verse-text',
  templateUrl: './verse-text.component.html',
  styleUrls: ['./verse-text.component.scss']
})
export class VerseTextComponent {
  @Select(BooksState.getTranslationIfInBookOrDefault) translation$: Observable<string>;
  @Select(BooksState.getTranslationClass) translationClass$: Observable<string>;

  @Input() verse: Verse;

}
