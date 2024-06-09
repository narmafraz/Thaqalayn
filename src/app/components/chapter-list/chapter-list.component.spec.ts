import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ChapterListComponent } from './chapter-list.component';

describe('ChapterListComponent', () => {
  let component: ChapterListComponent;
  let fixture: ComponentFixture<ChapterListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ChapterListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChapterListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
