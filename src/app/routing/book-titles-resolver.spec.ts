import { TestBed } from '@angular/core/testing';
import { NgxsModule } from '@ngxs/store';
import { BookTitlesResolver } from './book-titles-resolver';

describe('BookTitlesResolver', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([])],
      providers: [BookTitlesResolver],
    });
  });

  it('should create an instance', () => {
    const resolver = TestBed.inject(BookTitlesResolver);
    expect(resolver).toBeTruthy();
  });
});
