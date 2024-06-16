import { TestBed, waitForAsync } from '@angular/core/testing';
import { NgxsModule, Store } from '@ngxs/store';
import { RouterParserState, RouterParserStateModel } from './router-parser.state';
import { RouterParserAction } from './router-parser.actions';

describe('RouterParser store', () => {
  let store: Store;
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([RouterParserState])]
    }).compileComponents();
    store = TestBed.get(Store);
  }));

  it('should create an action and add an item', () => {
    const expected: RouterParserStateModel = {
      items: ['item-1']
    };
    store.dispatch(new RouterParserAction('item-1'));
    const actual = store.selectSnapshot(RouterParserState.getState);
    expect(actual).toEqual(expected);
  });

});
