import { TestBed, async } from '@angular/core/testing';
import { NgxsModule, Store } from '@ngxs/store';
import { RouterState, RouterStateModel } from './router.state';
import { RouterAction } from './router.actions';

describe('Router store', () => {
  let store: Store;
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([RouterState])]
    }).compileComponents();
    store = TestBed.get(Store);
  }));

  it('should create an action and add an item', () => {
    const expected: RouterStateModel = {
      items: ['item-1']
    };
    store.dispatch(new RouterAction('item-1'));
    const actual = store.selectSnapshot(RouterState.getState);
    expect(actual).toEqual(expected);
  });

});
