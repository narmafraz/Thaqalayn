import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { LoadBookPart } from '@store/books/books.actions';

@Injectable()
export class BookTitlesResolver  {
  constructor(private store: Store) {}

  resolve() {
    return this.store.dispatch(new LoadBookPart('books'));
  }
}
