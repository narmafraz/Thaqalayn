import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Book } from '@app/models';
import { Select } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-book-dispatcher',
  templateUrl: './book-dispatcher.component.html',
  styleUrls: ['./book-dispatcher.component.scss']
})
export class BookDispatcherComponent {

  @Select(BooksState.getCurrentNavigatedPart) book$: Observable<Book>;

  constructor() {
  }
}
