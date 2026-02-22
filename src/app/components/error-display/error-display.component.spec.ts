import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorDisplayComponent } from './error-display.component';
import { CUSTOM_ELEMENTS_SCHEMA, Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'translate', standalone: false })
class MockTranslatePipe implements PipeTransform {
  transform(value: string): string { return value; }
}

describe('ErrorDisplayComponent', () => {
  let component: ErrorDisplayComponent;
  let fixture: ComponentFixture<ErrorDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ErrorDisplayComponent, MockTranslatePipe],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorDisplayComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the error message', () => {
    component.message = 'Something went wrong';
    fixture.detectChanges();
    const el = fixture.nativeElement;
    expect(el.textContent).toContain('Something went wrong');
  });

  it('should emit retry event when onRetry is called', () => {
    spyOn(component.retry, 'emit');
    component.onRetry();
    expect(component.retry.emit).toHaveBeenCalled();
  });

  it('should have a retry output', () => {
    expect(component.retry).toBeDefined();
  });
});
