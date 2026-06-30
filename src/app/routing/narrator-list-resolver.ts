import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Store } from '@ngxs/store';
import { LoadNarrator } from '@store/people/people.actions';

@Injectable({
  providedIn: 'root'
})
export class NarratorListResolver  {
  constructor(private store: Store, @Inject(PLATFORM_ID) private platformId: object) {}

  resolve(_route: ActivatedRouteSnapshot) {
    const result = this.store.dispatch(new LoadNarrator('index'));
    // Block on the server (prerender); non-blocking on the client so the
    // people-list skeleton shows while loading.
    return isPlatformServer(this.platformId) ? result : undefined;
  }
}
