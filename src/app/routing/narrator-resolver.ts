import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { NarratorWrapper } from '@app/models';
import { Store } from '@ngxs/store';
import { LoadNarrator } from '@store/people/people.actions';
import { Observable } from 'rxjs';

@Injectable()
export class NarratorResolver  {
  constructor(private store: Store) {}

  resolve(route: ActivatedRouteSnapshot) {
    this.store.dispatch(new LoadNarrator('index'));
    return this.store.dispatch(new LoadNarrator(route.paramMap.get('index')));
  }
}
