import { Injectable } from '@angular/core';

import { ChapterList } from '@app/models';
import { Store } from '@ngxs/store';
import { LoadBookPart } from '@store/books/books.actions';
import { Observable } from 'rxjs';

@Injectable()
export class BookTitlesResolver  {
  constructor(private store: Store) {}

  resolve() {
    return this.store.dispatch(new LoadBookPart('books'));
  }
}
