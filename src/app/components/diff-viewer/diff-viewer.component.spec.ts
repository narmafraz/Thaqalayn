import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DiffViewerComponent } from './diff-viewer.component';
import { SharedModule } from '../../shared/shared.module';
import { TextDiff, DiffSegment } from '@app/models';

describe('DiffViewerComponent', () => {
  let component: DiffViewerComponent;
  let fixture: ComponentFixture<DiffViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DiffViewerComponent],
      imports: [SharedModule, HttpClientTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
    .overrideComponent(DiffViewerComponent, {
      set: { changeDetection: ChangeDetectionStrategy.Default }
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiffViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start collapsed', () => {
    expect(component.collapsed).toBeTrue();
  });

  it('should toggle collapsed state', () => {
    component.toggle();
    expect(component.collapsed).toBeFalse();
    component.toggle();
    expect(component.collapsed).toBeTrue();
  });

  it('should not render when diffs is empty', () => {
    component.diffs = [];
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.diff-viewer');
    expect(el).toBeNull();
  });

  it('should render toggle button when diffs are present', () => {
    component.diffs = [{
      source_a: 'Source A',
      source_b: 'Source B',
      label_a: 'Al-Kafi',
      label_b: 'Wasael',
      segments: [{ type: 'equal', text: 'test' }]
    }];
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.diff-toggle');
    expect(btn).toBeTruthy();
  });

  it('should show diff panels when expanded', () => {
    component.diffs = [{
      source_a: 'Source A',
      source_b: 'Source B',
      label_a: 'Al-Kafi',
      label_b: 'Wasael',
      segments: [{ type: 'equal', text: 'test' }]
    }];
    component.collapsed = false;
    fixture.detectChanges();
    const panels = fixture.nativeElement.querySelector('.diff-panels');
    expect(panels).toBeTruthy();
  });

  it('should hide diff panels when collapsed', () => {
    component.diffs = [{
      source_a: 'Source A',
      source_b: 'Source B',
      label_a: 'Al-Kafi',
      label_b: 'Wasael',
      segments: [{ type: 'equal', text: 'test' }]
    }];
    component.collapsed = true;
    fixture.detectChanges();
    const panels = fixture.nativeElement.querySelector('.diff-panels');
    expect(panels).toBeNull();
  });

  describe('computeDiff', () => {
    it('should return equal segment for identical texts', () => {
      const segments = DiffViewerComponent.computeDiff('hello', 'hello');
      expect(segments.length).toBe(1);
      expect(segments[0].type).toBe('equal');
      expect(segments[0].text).toBe('hello');
    });

    it('should detect insertions', () => {
      const segments = DiffViewerComponent.computeDiff('ac', 'abc');
      // 'a' equal, 'b' inserted, 'c' equal
      const types = segments.map(s => s.type);
      expect(types).toContain('equal');
      expect(types).toContain('insert');
    });

    it('should detect deletions', () => {
      const segments = DiffViewerComponent.computeDiff('abc', 'ac');
      const types = segments.map(s => s.type);
      expect(types).toContain('equal');
      expect(types).toContain('delete');
    });

    it('should detect replacements', () => {
      const segments = DiffViewerComponent.computeDiff('axc', 'ayc');
      // 'a' equal, 'x' replaced by 'y', 'c' equal
      const hasReplace = segments.some(s => s.type === 'replace');
      expect(hasReplace).toBeTrue();
    });

    it('should handle empty strings', () => {
      const segments = DiffViewerComponent.computeDiff('', 'abc');
      expect(segments.length).toBe(1);
      expect(segments[0].type).toBe('insert');
      expect(segments[0].text_b).toBe('abc');
    });

    it('should handle Arabic text', () => {
      const textA = 'بسم الله الرحمن الرحيم';
      const textB = 'بسم الله الرحمان الرحيم';
      const segments = DiffViewerComponent.computeDiff(textA, textB);
      expect(segments.length).toBeGreaterThan(1);
      // Should have equal parts and a difference
      const equalParts = segments.filter(s => s.type === 'equal');
      expect(equalParts.length).toBeGreaterThan(0);
    });

    it('should handle completely different strings', () => {
      const segments = DiffViewerComponent.computeDiff('abc', 'xyz');
      // All should be replace/delete/insert (no equal parts)
      const equalParts = segments.filter(s => s.type === 'equal');
      expect(equalParts.length).toBe(0);
    });
  });
});
