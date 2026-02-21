import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NgxsModule } from '@ngxs/store';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BookDispatcherComponent } from './book-dispatcher.component';

describe('BookDispatcherComponent', () => {
  let component: BookDispatcherComponent;
  let fixture: ComponentFixture<BookDispatcherComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([])],
      declarations: [BookDispatcherComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
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
