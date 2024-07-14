import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { Store } from '@ngxs/store';
import { LoadNarrator } from '@store/people/people.actions';
import { Observable, forkJoin } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NarratorResolver implements Resolve<any> {
  constructor(private store: Store) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    const index = route.paramMap.get('index');
    return forkJoin([
      this.store.dispatch(new LoadNarrator('index')),
      this.store.dispatch(new LoadNarrator(index))
    ]);
  }
}
