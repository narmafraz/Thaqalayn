import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { NarratorWrapper } from '@app/models';
import { Store } from '@ngxs/store';
import { LoadNarrator } from '@store/people/people.actions';
import { Observable } from 'rxjs';

@Injectable()
export class NarratorListResolver  {
  constructor(private store: Store) {}

  resolve(route: ActivatedRouteSnapshot) {
    return this.store.dispatch(new LoadNarrator('index'));
  }
}
