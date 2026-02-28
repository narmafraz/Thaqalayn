import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { PhraseListComponent } from './phrase-list.component';
import { AiContentService, PhraseIndex } from '@app/services/ai-content.service';

describe('PhraseListComponent', () => {
  let component: PhraseListComponent;
  let fixture: ComponentFixture<PhraseListComponent>;

  const mockPhrases: PhraseIndex = {
    'بسم الله': {
      phrase_ar: 'بِسْمِ اللَّهِ',
      phrase_en: 'In the name of Allah',
      category: 'quranic_echo',
      paths: ['/books/al-kafi:1:1:1:1', '/books/al-kafi:1:1:1:2'],
    },
    'الصراط المستقيم': {
      phrase_ar: 'الصِّرَاطُ الْمُسْتَقِيمُ',
      phrase_en: 'The Straight Path',
      category: 'quranic_echo',
      paths: ['/books/al-kafi:1:1:1:1'],
    },
    'لا اله الا الله': {
      phrase_ar: 'لَا إِلٰهَ إِلَّا اللَّهُ',
      phrase_en: 'There is no god but Allah',
      category: 'theological_concept',
      paths: ['/books/al-kafi:1:1:1:3'],
    },
  };

  beforeEach(async () => {
    const aiContentSpy = jasmine.createSpyObj('AiContentService', ['getPhrases']);
    aiContentSpy.getPhrases.and.returnValue(of(mockPhrases));

    await TestBed.configureTestingModule({
      declarations: [PhraseListComponent],
      imports: [FormsModule, RouterTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: AiContentService, useValue: aiContentSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PhraseListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load phrases and set available=true', () => {
    expect(component.loading).toBe(false);
    expect(component.available).toBe(true);
    expect(component.totalPhrases).toBe(3);
  });

  it('should group phrases by category', () => {
    expect(component.categories.length).toBe(2);
    const theological = component.categories.find(c => c.name === 'theological_concept');
    expect(theological).toBeDefined();
    expect(theological!.phrases.length).toBe(1);
    const quranic = component.categories.find(c => c.name === 'quranic_echo');
    expect(quranic).toBeDefined();
    expect(quranic!.phrases.length).toBe(2);
  });

  it('should filter phrases by search query', () => {
    component.filterPhrases('straight');
    expect(component.filteredCategories.length).toBe(1);
    expect(component.filteredCategories[0].phrases.length).toBe(1);
  });

  it('should show all phrases when search is cleared', () => {
    component.filterPhrases('straight');
    component.filterPhrases('');
    expect(component.filteredCategories.length).toBe(2);
  });

  it('should format labels correctly', () => {
    expect(component.formatLabel('quranic_echo')).toBe('Quranic Echo');
    expect(component.formatLabel('theological_concept')).toBe('Theological Concept');
  });
});

describe('PhraseListComponent (no data)', () => {
  let component: PhraseListComponent;
  let fixture: ComponentFixture<PhraseListComponent>;

  beforeEach(async () => {
    const aiContentSpy = jasmine.createSpyObj('AiContentService', ['getPhrases']);
    aiContentSpy.getPhrases.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      declarations: [PhraseListComponent],
      imports: [FormsModule, RouterTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: AiContentService, useValue: aiContentSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PhraseListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show coming-soon when phrases unavailable', () => {
    expect(component.available).toBe(false);
    expect(component.loading).toBe(false);
  });
});
