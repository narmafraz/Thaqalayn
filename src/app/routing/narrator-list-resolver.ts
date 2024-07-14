import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Store } from '@ngxs/store';
import { LoadNarrator } from '@store/people/people.actions';

@Injectable({
  providedIn: 'root'
})
export class NarratorListResolver  {
  constructor(private store: Store) {}

  resolve(route: ActivatedRouteSnapshot) {
    return this.store.dispatch(new LoadNarrator('index'));
  }
}
