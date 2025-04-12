import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Book } from '@app/models';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-book-dispatcher',
  templateUrl: './book-dispatcher.component.html',
  styleUrls: ['./book-dispatcher.component.scss']
})
export class BookDispatcherComponent {

  book$: Observable<Book> = inject(Store).select(BooksState.getCurrentNavigatedPart);

  constructor(private store: Store) {
  }
}
