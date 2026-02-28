import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { PhraseDetailComponent } from './phrase-detail.component';
import { AiContentService, PhraseIndex } from '@app/services/ai-content.service';

describe('PhraseDetailComponent', () => {
  let component: PhraseDetailComponent;
  let fixture: ComponentFixture<PhraseDetailComponent>;

  const mockPhrases: PhraseIndex = {
    'بسم الله': {
      phrase_ar: 'بِسْمِ اللَّهِ',
      phrase_en: 'In the name of Allah',
      category: 'quranic_echo',
      paths: ['/books/al-kafi:1:1:1:1', '/books/al-kafi:1:1:1:2'],
    },
  };

  beforeEach(async () => {
    const aiContentSpy = jasmine.createSpyObj('AiContentService', ['getPhrases']);
    aiContentSpy.getPhrases.and.returnValue(of(mockPhrases));

    await TestBed.configureTestingModule({
      declarations: [PhraseDetailComponent],
      imports: [RouterTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: AiContentService, useValue: aiContentSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ phraseAr: 'بسم الله' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PhraseDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load phrase details', () => {
    expect(component.loading).toBe(false);
    expect(component.notFound).toBe(false);
    expect(component.phrase).toBeDefined();
    expect(component.phrase!.phrase_en).toBe('In the name of Allah');
    expect(component.phrase!.paths.length).toBe(2);
  });

  it('should format labels', () => {
    expect(component.formatLabel('quranic_echo')).toBe('Quranic Echo');
  });

  it('should format path display', () => {
    expect(component.getPathDisplay('/books/al-kafi:1:1:1:1')).toBe('al-kafi › 1 › 1 › 1 › 1');
  });

  it('should format router link', () => {
    expect(component.getRouterLink('/books/al-kafi:1:1:1:1')).toBe('al-kafi:1:1:1:1');
  });
});

describe('PhraseDetailComponent (XSS safety)', () => {
  let component: PhraseDetailComponent;
  let fixture: ComponentFixture<PhraseDetailComponent>;

  beforeEach(async () => {
    const aiContentSpy = jasmine.createSpyObj('AiContentService', ['getPhrases']);
    aiContentSpy.getPhrases.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      declarations: [PhraseDetailComponent],
      imports: [RouterTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: AiContentService, useValue: aiContentSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ phraseAr: '<script>alert("xss")</script>' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PhraseDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should safely handle HTML-like phrase keys without executing them', () => {
    // The phraseKey should contain the raw string (Angular {{ }} auto-escapes)
    expect(component.phraseKey).toBe('<script>alert("xss")</script>');
    // The component uses {{ phraseKey }} binding, not innerHTML, so it's safe
    // Verify no innerHTML usage — template uses {{ }} binding only
    const nativeEl: HTMLElement = fixture.nativeElement;
    expect(nativeEl.querySelector('script')).toBeNull();
  });
});

describe('PhraseDetailComponent (not found)', () => {
  let component: PhraseDetailComponent;
  let fixture: ComponentFixture<PhraseDetailComponent>;

  beforeEach(async () => {
    const aiContentSpy = jasmine.createSpyObj('AiContentService', ['getPhrases']);
    aiContentSpy.getPhrases.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      declarations: [PhraseDetailComponent],
      imports: [RouterTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: AiContentService, useValue: aiContentSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ phraseAr: 'nonexistent' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PhraseDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show not found for missing phrase', () => {
    expect(component.notFound).toBe(true);
    expect(component.phrase).toBeNull();
  });
});
