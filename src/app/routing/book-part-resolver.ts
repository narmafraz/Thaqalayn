import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Store } from '@ngxs/store';
import { LoadBookPart } from '@store/books/books.actions';

@Injectable()
export class BookPartResolver  {
  constructor(private store: Store, @Inject(PLATFORM_ID) private platformId: object) {}

  resolve(route: ActivatedRouteSnapshot) {
    const result = this.store.dispatch(new LoadBookPart(route.paramMap.get('index')));
    // Block during prerender/SSR so the static HTML carries content. On the
    // client return void so navigation proceeds immediately and the chapter
    // skeleton shows while the part loads (dispatch fires eagerly either way).
    return isPlatformServer(this.platformId) ? result : undefined;
  }
}
