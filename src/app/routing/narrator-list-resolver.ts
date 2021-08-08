import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { NarratorWrapper } from '@app/models';
import { Store } from '@ngxs/store';
import { LoadNarrator } from '@store/books/books.actions';
import { Observable } from 'rxjs';

@Injectable()
export class NarratorListResolver implements Resolve<Observable<NarratorWrapper>> {
  constructor(private store: Store) {}

  resolve(route: ActivatedRouteSnapshot) {
    return this.store.dispatch(new LoadNarrator('index'));
  }
}
