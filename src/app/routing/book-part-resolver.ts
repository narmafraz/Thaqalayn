import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Book } from '@app/models';
import { Store } from '@ngxs/store';
import { LoadBookPart } from '@store/books/books.actions';
import { Observable } from 'rxjs';

@Injectable()
export class BookPartResolver  {
  constructor(private store: Store) {}

  resolve(route: ActivatedRouteSnapshot) {
    return this.store.dispatch(new LoadBookPart(route.paramMap.get('index')));
  }
}
