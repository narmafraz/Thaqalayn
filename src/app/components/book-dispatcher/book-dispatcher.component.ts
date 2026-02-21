import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Book } from '@app/models';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { RetryLoadBookPart } from '@store/books/books.actions';
import { RouterState } from '@store/router/router.state';
import { Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-book-dispatcher',
  templateUrl: './book-dispatcher.component.html',
  styleUrls: ['./book-dispatcher.component.scss']
})
export class BookDispatcherComponent {

  book$: Observable<Book> = inject(Store).select(BooksState.getCurrentNavigatedPart);
  loading$: Observable<boolean> = inject(Store).select(BooksState.getCurrentLoading);
  error$: Observable<string> = inject(Store).select(BooksState.getCurrentError);

  constructor(private store: Store) {
  }

  onRetry(): void {
    const index = this.store.selectSnapshot(RouterState.getBookPartIndex) || 'books';
    this.store.dispatch(new RetryLoadBookPart(index));
  }
}
