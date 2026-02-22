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

  describe('formatReadable', () => {
    it('should format Al-Kafi volume', () => {
      expect(component.formatReadable('/books/al-kafi:1')).toBe('Al-Kafi, Vol. 1');
    });

    it('should format Al-Kafi book', () => {
      expect(component.formatReadable('/books/al-kafi:1:2')).toBe('Al-Kafi 1:2');
    });

    it('should format Al-Kafi chapter', () => {
      expect(component.formatReadable('/books/al-kafi:1:2:3')).toBe('Al-Kafi 1:2:3');
    });

    it('should format Al-Kafi hadith with #', () => {
      expect(component.formatReadable('/books/al-kafi:1:2:3:4')).toBe('Al-Kafi 1:2:3, #4');
    });

    it('should format Quran surah', () => {
      expect(component.formatReadable('/books/quran:1')).toBe('Quran 1');
    });

    it('should format Quran verse', () => {
      expect(component.formatReadable('/books/quran:1:5')).toBe('Quran 1:5');
    });

    it('should handle book name only', () => {
      expect(component.formatReadable('/books/al-kafi')).toBe('Al-Kafi');
    });

    it('should title-case unknown books', () => {
      expect(component.formatReadable('/books/some-book:1:2')).toBe('Some Book 1:2');
    });
  });

  describe('path input', () => {
    it('should accept a path input', () => {
      component.path = '/books/al-kafi:1:2:3';
      expect(component.path).toBe('/books/al-kafi:1:2:3');
    });
  });
});
