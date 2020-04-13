import { TestBed, async } from '@angular/core/testing';
import { NgxsModule, Store } from '@ngxs/store';
import { BooksState, BooksStateModel } from './books.state';
import { BooksAction } from './books.actions';

describe('Books store', () => {
  let store: Store;
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([BooksState])]
    }).compileComponents();
    store = TestBed.get(Store);
  }));

  it('should create an action and add an item', () => {
    const expected: BooksStateModel = {
      items: ['item-1']
    };
    store.dispatch(new BooksAction('item-1'));
    const actual = store.selectSnapshot(BooksState.getState);
    expect(actual).toEqual(expected);
  });

});
