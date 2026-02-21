import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { ChapterListComponent } from './chapter-list.component';

describe('ChapterListComponent', () => {
  let component: ChapterListComponent;
  let fixture: ComponentFixture<ChapterListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        MatSortModule,
        MatTableModule,
        NoopAnimationsModule,
        RouterTestingModule,
      ],
      declarations: [ChapterListComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChapterListComponent);
    component = fixture.componentInstance;
    // Provide a mock book$ observable to prevent ngOnInit errors
    component.book$ = of({ kind: 'chapter_list', index: 'test', data: { chapters: [], titles: { en: 'Test', ar: 'Test' } } } as any);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
