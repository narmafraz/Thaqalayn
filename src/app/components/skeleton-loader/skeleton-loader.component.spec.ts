import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SkeletonLoaderComponent } from './skeleton-loader.component';
import { CommonModule } from '@angular/common';

describe('SkeletonLoaderComponent', () => {
  let component: SkeletonLoaderComponent;
  let fixture: ComponentFixture<SkeletonLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SkeletonLoaderComponent],
      imports: [CommonModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonLoaderComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should default to chapter-list variant', () => {
    fixture.detectChanges();
    expect(component.variant).toBe('chapter-list');
  });

  it('should render chapter-list variant with expected elements', () => {
    component.variant = 'chapter-list';
    fixture.detectChanges();
    const lines = fixture.nativeElement.querySelectorAll('.skeleton-line');
    expect(lines.length).toBeGreaterThan(0);
    const rows = fixture.nativeElement.querySelectorAll('.skeleton-row');
    expect(rows.length).toBe(8);
  });

  it('should render verse-list variant with card placeholders', () => {
    component.variant = 'verse-list';
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.skeleton-card');
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  it('should render narrator variant with hero section', () => {
    component.variant = 'narrator';
    fixture.detectChanges();
    const hero = fixture.nativeElement.querySelector('.skeleton-hero');
    expect(hero).toBeTruthy();
    const stats = fixture.nativeElement.querySelectorAll('.skeleton-stat');
    expect(stats.length).toBe(3);
  });

  it('should render search variant with result placeholders', () => {
    component.variant = 'search';
    fixture.detectChanges();
    const results = fixture.nativeElement.querySelectorAll('.skeleton-search-result');
    expect(results.length).toBe(5);
  });

  it('should render people-list variant with table rows', () => {
    component.variant = 'people-list';
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.skeleton-row');
    expect(rows.length).toBe(10);
  });

  it('should have shimmer animation on skeleton lines', () => {
    component.variant = 'chapter-list';
    fixture.detectChanges();
    const line = fixture.nativeElement.querySelector('.skeleton-line');
    expect(line).toBeTruthy();
    expect(line.classList.contains('skeleton-line')).toBeTrue();
  });
});
