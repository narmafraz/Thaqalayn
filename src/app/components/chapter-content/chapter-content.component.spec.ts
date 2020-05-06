import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ChapterContentComponent } from './chapter-content.component';

describe('ChapterContentComponent', () => {
  let component: ChapterContentComponent;
  let fixture: ComponentFixture<ChapterContentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChapterContentComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChapterContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
