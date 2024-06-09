import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BookDispatcherComponent } from './book-dispatcher.component';

describe('BookDispatcherComponent', () => {
  let component: BookDispatcherComponent;
  let fixture: ComponentFixture<BookDispatcherComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ BookDispatcherComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BookDispatcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
