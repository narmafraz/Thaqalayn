import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PathLinkComponent } from './path-link.component';
import { RouterTestingModule } from '@angular/router/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('PathLinkComponent', () => {
  let component: PathLinkComponent;
  let fixture: ComponentFixture<PathLinkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PathLinkComponent],
      imports: [RouterTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PathLinkComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('splitOnLastColon', () => {
    it('should split on the last colon', () => {
      const result = component.splitOnLastColon('al-kafi:1:2:3');
      expect(result).toEqual(['al-kafi:1:2', '3']);
    });

    it('should handle single segment with colon', () => {
      const result = component.splitOnLastColon('quran:1');
      expect(result).toEqual(['quran', '1']);
    });

    it('should handle no colon', () => {
      const result = component.splitOnLastColon('al-kafi');
      expect(result).toEqual(['al-kafi', '']);
    });

    it('should handle deeply nested paths', () => {
      const result = component.splitOnLastColon('al-kafi:1:2:3:4:5');
      expect(result).toEqual(['al-kafi:1:2:3:4', '5']);
    });

    it('should handle empty string', () => {
      const result = component.splitOnLastColon('');
      expect(result).toEqual(['', '']);
    });
  });

  describe('removeBookPrefix', () => {
    it('should remove /books/ prefix', () => {
      const result = component.removeBookPrefix('/books/al-kafi:1:2:3');
      expect(result).toBe('al-kafi:1:2:3');
    });

    it('should handle quran paths', () => {
      const result = component.removeBookPrefix('/books/quran:1');
      expect(result).toBe('quran:1');
    });
  });

  describe('path input', () => {
    it('should accept a path input', () => {
      component.path = '/books/al-kafi:1:2:3';
      expect(component.path).toBe('/books/al-kafi:1:2:3');
    });
  });
});
