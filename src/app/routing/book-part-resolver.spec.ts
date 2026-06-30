import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NgxsModule, Store } from '@ngxs/store';
import { of } from 'rxjs';
import { BookPartResolver } from './book-part-resolver';

describe('BookPartResolver', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([])],
      providers: [BookPartResolver],
    });
  });

  it('should create an instance', () => {
    const resolver = TestBed.inject(BookPartResolver);
    expect(resolver).toBeTruthy();
  });
});

describe('BookPartResolver platform branching', () => {
  const route = { paramMap: { get: () => 'al-kafi:1:1:1' } } as any;

  function setup(platform: 'server' | 'browser') {
    TestBed.resetTestingModule();
    const dispatch = jasmine.createSpy('dispatch').and.returnValue(of(undefined));
    TestBed.configureTestingModule({
      providers: [
        BookPartResolver,
        { provide: Store, useValue: { dispatch } },
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    return { resolver: TestBed.inject(BookPartResolver), dispatch };
  }

  it('blocks on the server: returns the dispatch observable so prerender/SSR waits for content', () => {
    const { resolver, dispatch } = setup('server');
    const result = resolver.resolve(route);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(result).toBeTruthy(); // an observable → router waits → HTML has content
  });

  it('is non-blocking in the browser: still dispatches the load, but returns void so the skeleton shows', () => {
    const { resolver, dispatch } = setup('browser');
    const result = resolver.resolve(route);
    expect(dispatch).toHaveBeenCalledTimes(1); // load fires eagerly
    expect(result).toBeUndefined();            // router does not wait
  });
});
