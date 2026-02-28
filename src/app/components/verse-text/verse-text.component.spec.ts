import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NgxsModule, Store } from '@ngxs/store';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { MatTooltipModule } from '@angular/material/tooltip';

import { VerseTextComponent } from './verse-text.component';
import { Verse } from '@app/models';
import { AiContent } from '@app/models/ai-content';

describe('VerseTextComponent', () => {
  let component: VerseTextComponent;
  let fixture: ComponentFixture<VerseTextComponent>;

  const mockVerse: Verse = {
    index: 1,
    local_index: 1,
    path: '/books/al-kafi:1:1:1:1',
    text: ['بسم الله الرحمن الرحيم'],
    sajda_type: '',
    translations: { 'en.hubeali': ['In the name of Allah'] },
    part_type: 'Hadith',
    relations: {},
    narrator_chain: { parts: [], text: '' },
  };

  const mockAi: AiContent = {
    diacritized_text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ',
    diacritics_status: 'validated',
    content_type: 'creedal',
    tags: ['theology'],
    word_analysis: [
      {
        word: 'بِسْمِ',
        translation: {
          en: 'In the name of', ur: 'x', tr: 'x', fa: 'x',
          id: 'x', bn: 'x', es: 'x', fr: 'x',
          de: 'x', ru: 'x', zh: 'x',
        },
        pos: 'PREP',
      },
      {
        word: 'اللَّهِ',
        translation: {
          en: 'Allah', ur: 'x', tr: 'x', fa: 'x',
          id: 'x', bn: 'x', es: 'x', fr: 'x',
          de: 'x', ru: 'x', zh: 'x',
        },
        pos: 'N',
      },
    ],
    isnad_matn: {
      has_chain: true,
      isnad_ar: 'عدة من أصحابنا',
      matn_ar: 'قال الإمام',
      narrators: [],
    },
    chunks: [
      {
        chunk_type: 'isnad',
        arabic_text: 'عدة من أصحابنا',
        word_start: 0,
        word_end: 1,
        translations: { en: 'A number of our companions' },
      },
      {
        chunk_type: 'body',
        arabic_text: 'قال الإمام',
        word_start: 1,
        word_end: 2,
        translations: { en: 'The Imam said' },
      },
    ],
    summaries: {
      en: 'A summary of the hadith.',
    },
    key_terms: {
      en: { 'العِلْم': 'Knowledge' },
    },
    seo_questions: {
      en: 'What does this hadith teach?',
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VerseTextComponent],
      imports: [
        NgxsModule.forRoot([]),
        RouterTestingModule,
        FormsModule,
        MatTooltipModule,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(VerseTextComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.verse = mockVerse;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render without AI data (progressive enhancement)', () => {
    component.verse = mockVerse;
    fixture.detectChanges();
    expect(component.hasAiText).toBe(false);
    expect(component.hasWordAnalysis).toBe(false);
    expect(component.hasChunks).toBe(false);
    expect(component.hasIsnadMatn).toBe(false);
  });

  it('should detect AI features when present', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    fixture.detectChanges();
    expect(component.hasAiText).toBe(true);
    expect(component.hasWordAnalysis).toBe(true);
    expect(component.hasChunks).toBe(true);
    expect(component.hasIsnadMatn).toBe(true);
  });

  it('should toggle diacritics display', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    expect(component.showDiacritics).toBe(false);
    component.toggleDiacritics();
    expect(component.showDiacritics).toBe(true);
    component.toggleDiacritics();
    expect(component.showDiacritics).toBe(false);
  });

  it('should toggle word analysis display', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    expect(component.showWordAnalysis).toBe(false);
    component.toggleWordAnalysis();
    expect(component.showWordAnalysis).toBe(true);
  });

  it('should toggle chunked view', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    expect(component.showChunkedView).toBe(false);
    component.toggleChunkedView();
    expect(component.showChunkedView).toBe(true);
  });

  it('should return correct POS labels', () => {
    expect(component.getPosLabel('N')).toBe('Noun');
    expect(component.getPosLabel('V')).toBe('Verb');
    expect(component.getPosLabel('PREP')).toBe('Prep');
    expect(component.getPosLabel('UNKNOWN')).toBe('UNKNOWN');
  });

  it('should return correct POS colors', () => {
    expect(component.getPosColor('N')).toBe('#1565c0');
    expect(component.getPosColor('V')).toBe('#2e7d32');
    expect(component.getPosColor('ADJ')).toBe('#6a1b9a');
  });

  it('should return content type labels', () => {
    expect(component.getContentTypeLabel('creedal')).toBe('Creedal');
    expect(component.getContentTypeLabel('ethical_teaching')).toBe('Ethical Teaching');
  });

  it('should get AI translation for language', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    const entry = component.getAiTranslationForLang('en');
    expect(entry).toBeDefined();
    expect(entry!.summary).toContain('summary');
  });

  it('should return undefined AI translation for missing language', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    const entry = component.getAiTranslationForLang('ur');
    expect(entry).toBeUndefined();
  });

  it('should get chunk translation', () => {
    const chunk = mockAi.chunks![0];
    expect(component.getChunkTranslation(chunk, 'en')).toBe('A number of our companions');
    expect(component.getChunkTranslation(chunk, 'fr')).toBe('');
  });

  it('should handle word selection', () => {
    component.setActiveWord(0);
    expect(component.activeWordIndex).toBe(0);
    component.setActiveWord(0);
    expect(component.activeWordIndex).toBeNull();
    component.setActiveWord(1);
    expect(component.activeWordIndex).toBe(1);
  });

  it('should access isnad/matn data', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    expect(component.isnadMatn!.has_chain).toBe(true);
    expect(component.isnadMatn!.isnad_ar).toBe('عدة من أصحابنا');
  });

  it('should return word analysis array', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    expect(component.wordAnalysis.length).toBe(2);
    expect(component.wordAnalysis[0].word).toBe('بِسْمِ');
  });

  it('should return chunks array', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    expect(component.chunks.length).toBe(2);
    expect(component.chunks[0].chunk_type).toBe('isnad');
  });

  it('should reconstruct diacritized text from word_analysis when diacritized_text is absent', () => {
    const aiWithoutDiacText = { ...mockAi };
    delete aiWithoutDiacText.diacritized_text;
    component.verse = { ...mockVerse, ai: aiWithoutDiacText };
    expect(component.hasAiText).toBe(true);
    expect(component.diacritizedText).toBe('بِسْمِ اللَّهِ');
  });

  it('should use diacritized_text when present', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    expect(component.diacritizedText).toBe('بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ');
  });

  it('should reconstruct isnad/matn text from chunks when isnad_ar/matn_ar are absent', () => {
    const aiNoIsnadText = {
      ...mockAi,
      isnad_matn: { has_chain: true, narrators: [] },
    };
    component.verse = { ...mockVerse, ai: aiNoIsnadText };
    expect(component.isnadArabicText).toBe('بِسْمِ');
    expect(component.matnArabicText).toBe('اللَّهِ');
  });

  it('should use isnad_ar/matn_ar when present', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    expect(component.isnadArabicText).toBe('عدة من أصحابنا');
    expect(component.matnArabicText).toBe('قال الإمام');
  });

  it('should get AI translation from flat summaries/key_terms/seo_questions fields', () => {
    const aiFlat: AiContent = {
      summaries: { en: 'A flat summary' },
      key_terms: { en: { 'term': 'meaning' } },
      seo_questions: { en: 'A question?' },
    };
    component.verse = { ...mockVerse, ai: aiFlat };
    const entry = component.getAiTranslationForLang('en');
    expect(entry).toBeDefined();
    expect(entry!.summary).toBe('A flat summary');
    expect(entry!.key_terms['term']).toBe('meaning');
    expect(entry!.seo_question).toBe('A question?');
  });
});
