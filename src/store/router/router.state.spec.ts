import { TestBed, waitForAsync } from '@angular/core/testing';
import { NgxsModule, Store } from '@ngxs/store';
import { RouterState, RouterStateModel } from './router.state';

describe('RouterState', () => {
  let store: Store;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([RouterState])]
    }).compileComponents();
    store = TestBed.inject(Store);
  }));

  it('should initialize with correct defaults', () => {
    const index = store.selectSnapshot(RouterState.getBookPartIndex);
    expect(index).toBeUndefined();
  });

  it('should default language to en', () => {
    const language = store.selectSnapshot(RouterState.getLanguage);
    expect(language).toBe('en');
  });

  it('should initialize translation as undefined', () => {
    const translation = store.selectSnapshot(RouterState.getTranslation);
    expect(translation).toBeUndefined();
  });
});
