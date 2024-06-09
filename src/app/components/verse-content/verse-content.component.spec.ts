import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { VerseContentComponent } from './verse-content.component';

describe('VerseContentComponent', () => {
  let component: VerseContentComponent;
  let fixture: ComponentFixture<VerseContentComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ VerseContentComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VerseContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
