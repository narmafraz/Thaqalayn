import { TestBed } from '@angular/core/testing';
import { NgxsModule } from '@ngxs/store';
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
