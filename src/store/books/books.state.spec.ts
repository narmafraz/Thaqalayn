import { TestBed, waitForAsync } from '@angular/core/testing';
import { NgxsModule, Store } from '@ngxs/store';
import { BooksState, BooksStateModel } from './books.state';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('BooksState', () => {
  let store: Store;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NgxsModule.forRoot([BooksState]),
        HttpClientTestingModule,
      ]
    }).compileComponents();
    store = TestBed.inject(Store);
  }));

  it('should initialize with empty titles and parts', () => {
    const state: BooksStateModel = store.selectSnapshot(BooksState.getState);
    expect(state.titles).toEqual([]);
    expect(state.parts).toEqual({});
  });

  it('should return undefined for a non-existent part index', () => {
    const getPartByIndex = store.selectSnapshot(BooksState.getPartByIndex);
    expect(getPartByIndex('nonexistent')).toBeUndefined();
  });
});
