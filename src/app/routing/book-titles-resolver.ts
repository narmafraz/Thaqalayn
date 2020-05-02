import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { BookTitle } from '@app/models';
import { Store } from '@ngxs/store';
import { LoadBookPart } from '@store/books/books.actions';
import { Observable } from 'rxjs';

@Injectable()
export class BookTitlesResolver implements Resolve<Observable<BookTitle[]>> {
  constructor(private store: Store) {}

  resolve() {
    return this.store.dispatch(new LoadBookPart('books'));
  }
}
