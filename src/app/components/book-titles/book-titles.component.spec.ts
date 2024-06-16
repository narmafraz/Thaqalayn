import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BookTitlesComponent } from './book-titles.component';

describe('BookTitlesComponent', () => {
  let component: BookTitlesComponent;
  let fixture: ComponentFixture<BookTitlesComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ BookTitlesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BookTitlesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
