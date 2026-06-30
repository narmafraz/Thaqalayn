import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { Store } from '@ngxs/store';
import { LoadNarrator } from '@store/people/people.actions';
import { Observable, forkJoin } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NarratorResolver implements Resolve<any> {
  constructor(private store: Store, @Inject(PLATFORM_ID) private platformId: object) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> | undefined {
    const index = route.paramMap.get('index');
    // Both dispatches fire eagerly here regardless of subscription.
    const result = forkJoin([
      this.store.dispatch(new LoadNarrator('index')),
      this.store.dispatch(new LoadNarrator(index))
    ]);
    // Block on the server (prerender); non-blocking on the client so the
    // narrator skeleton shows while loading.
    return isPlatformServer(this.platformId) ? result : undefined;
  }
}
