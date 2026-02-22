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

  it('should initialize translation2 as undefined', () => {
    const translation2 = store.selectSnapshot(RouterState.getTranslation2);
    expect(translation2).toBeUndefined();
  });

  it('should initialize fragment as undefined', () => {
    const fragment = store.selectSnapshot(RouterState.getUrlFragment);
    expect(fragment).toBeUndefined();
  });

  it('should have all expected selectors', () => {
    expect(RouterState.getBookPartIndex).toBeDefined();
    expect(RouterState.getUrlFragment).toBeDefined();
    expect(RouterState.getTranslation).toBeDefined();
    expect(RouterState.getTranslation2).toBeDefined();
    expect(RouterState.getLanguage).toBeDefined();
  });

  describe('getLanguage selector', () => {
    it('should return "en" when language is undefined', () => {
      store.reset({ myrouter: { language: undefined } as RouterStateModel });
      const language = store.selectSnapshot(RouterState.getLanguage);
      expect(language).toBe('en');
    });

    it('should return "en" when language is empty string', () => {
      store.reset({ myrouter: { language: '' } as RouterStateModel });
      const language = store.selectSnapshot(RouterState.getLanguage);
      expect(language).toBe('en');
    });

    it('should return the set language when specified', () => {
      store.reset({ myrouter: { language: 'ar' } as RouterStateModel });
      const language = store.selectSnapshot(RouterState.getLanguage);
      expect(language).toBe('ar');
    });
  });

  describe('state snapshot', () => {
    it('should return full state model', () => {
      const state: RouterStateModel = store.snapshot().myrouter;
      expect(state).toBeDefined();
      expect(state.language).toBe('en');
      expect(state.index).toBeUndefined();
      expect(state.translation).toBeUndefined();
      expect(state.translation2).toBeUndefined();
    });

    it('should reflect patched state', () => {
      store.reset({
        myrouter: {
          index: 'al-kafi:1:2:1',
          fragment: 'h3',
          sort: 'length',
          translation: 'en.qarai',
          translation2: 'fa.ansarian',
          language: 'fa',
        }
      });
      expect(store.selectSnapshot(RouterState.getBookPartIndex)).toBe('al-kafi:1:2:1');
      expect(store.selectSnapshot(RouterState.getUrlFragment)).toBe('h3');
      expect(store.selectSnapshot(RouterState.getTranslation)).toBe('en.qarai');
      expect(store.selectSnapshot(RouterState.getTranslation2)).toBe('fa.ansarian');
      expect(store.selectSnapshot(RouterState.getLanguage)).toBe('fa');
    });
  });
});
