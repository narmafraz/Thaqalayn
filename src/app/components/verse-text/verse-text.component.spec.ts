import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NgxsModule, Store } from '@ngxs/store';
import { ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { VerseTextComponent } from './verse-text.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Verse } from '@app/models';
import { AiContent } from '@app/models/ai-content';
import { AiPreferencesService } from '@app/services/ai-preferences.service';

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
      declarations: [VerseTextComponent, TranslatePipe],
      imports: [
        NgxsModule.forRoot([]),
        RouterTestingModule,
        FormsModule,
        MatTooltipModule,
        HttpClientTestingModule,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .overrideComponent(VerseTextComponent, {
      set: { changeDetection: ChangeDetectionStrategy.Default }
    })
    .compileComponents();

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
  });

  it('should detect AI features when present', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    fixture.detectChanges();
    expect(component.hasAiText).toBe(true);
    expect(component.hasWordAnalysis).toBe(true);
    expect(component.hasChunks).toBe(true);
  });

  it('should toggle diacritics display', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    expect(component.showDiacritics).toBe(true); // default is now true
    component.toggleDiacritics();
    expect(component.showDiacritics).toBe(false);
    component.toggleDiacritics();
    expect(component.showDiacritics).toBe(true);
  });

  it('should toggle word analysis display', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    expect(component.showWordAnalysis).toBe(false);
    component.toggleWordAnalysis();
    expect(component.showWordAnalysis).toBe(true);
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

  it('should get chunk translation for AI translation IDs', () => {
    const chunk = mockAi.chunks![0];
    expect(component.getChunkTranslation(chunk, 'en.ai')).toBe('A number of our companions');
    expect(component.getChunkTranslation(chunk, 'fr.ai')).toBe('');
    // Non-AI translation IDs should return empty
    expect(component.getChunkTranslation(chunk, 'en.qarai')).toBe('');
  });

  it('should handle word selection', () => {
    component.setActiveWord(0);
    expect(component.activeWordIndex).toBe(0);
    component.setActiveWord(0);
    expect(component.activeWordIndex).toBeNull();
    component.setActiveWord(1);
    expect(component.activeWordIndex).toBe(1);
  });

  it('should get chunk arabic text', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    const chunk = mockAi.chunks![0];
    expect(component.getChunkArabicText(chunk)).toBe('عدة من أصحابنا');
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

  it('should identify first isnad chunk correctly', () => {
    component.verse = {
      ...mockVerse,
      narrator_chain: { parts: [{ kind: 'narrator', text: 'test', path: '/people/narrators/1' }], text: '' },
      ai: mockAi,
    };
    const isnadChunk = mockAi.chunks![0]; // chunk_type: 'isnad'
    const bodyChunk = mockAi.chunks![1]; // chunk_type: 'body'
    expect(component.isFirstIsnadChunk(isnadChunk)).toBe(true);
    expect(component.isFirstIsnadChunk(bodyChunk)).toBe(false);
  });

  it('should initialize toggle states from AiPreferencesService', () => {
    const prefs = TestBed.inject(AiPreferencesService);
    prefs.set('showDiacritizedByDefault', true);
    prefs.set('wordByWordDefaultLang', 'fr');

    // Re-create component to pick up new prefs
    const newFixture = TestBed.createComponent(VerseTextComponent);
    const newComponent = newFixture.componentInstance;
    newComponent.verse = mockVerse;

    expect(newComponent.showDiacritics).toBe(true);
    expect(newComponent.wordAnalysisLang).toBe('fr');

    // Reset prefs to defaults for other tests
    prefs.reset();
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

  it('should detect hasKeyPhrases when key_phrases present', () => {
    const aiWithPhrases: AiContent = {
      key_phrases: [
        { phrase_ar: 'بسم الله', phrase_en: 'In the name of Allah', category: 'quranic_echo' },
      ],
    };
    component.verse = { ...mockVerse, ai: aiWithPhrases };
    expect(component.hasKeyPhrases).toBe(true);
  });

  it('should detect no key phrases when absent', () => {
    component.verse = mockVerse;
    expect(component.hasKeyPhrases).toBe(false);
  });

  it('should highlight key phrases in Arabic text', () => {
    const aiWithPhrases: AiContent = {
      key_phrases: [
        { phrase_ar: 'الرحمن الرحيم', phrase_en: 'Most Gracious Most Merciful', category: 'quranic_echo' },
      ],
    };
    component.verse = { ...mockVerse, ai: aiWithPhrases };
    const result = component.highlightPhrases('بسم الله الرحمن الرحيم');
    // Should be SafeHtml — convert to string for testing
    const html = (result as any).changingThisBreaksApplicationSecurity || result.toString();
    expect(html).toContain('<mark class="key-phrase"');
    expect(html).toContain('الرحمن الرحيم');
  });

  it('should return plain text when no key phrases', () => {
    component.verse = mockVerse;
    const result = component.highlightPhrases('بسم الله');
    const html = (result as any).changingThisBreaksApplicationSecurity || result.toString();
    expect(html).not.toContain('<mark');
    expect(html).toContain('بسم الله');
  });

  it('should escape HTML entities in highlighted text (XSS defense)', () => {
    const aiWithXss: AiContent = {
      key_phrases: [
        { phrase_ar: '<img>', phrase_en: '<script>alert("xss")</script>', category: 'quranic_echo' },
      ],
    };
    component.verse = { ...mockVerse, ai: aiWithXss };
    const result = component.highlightPhrases('test <img> text');
    const html = (result as any).changingThisBreaksApplicationSecurity || result.toString();
    // HTML entities should be escaped, not rendered as raw tags
    expect(html).toContain('&lt;img&gt;');
    expect(html).not.toContain('<img>');
    expect(html).not.toContain('<script>');
  });

  it('should escape HTML in phrase_en data attribute (XSS defense)', () => {
    const aiWithXss: AiContent = {
      key_phrases: [
        { phrase_ar: 'الله', phrase_en: '"><script>alert(1)</script>', category: 'quranic_echo' },
      ],
    };
    component.verse = { ...mockVerse, ai: aiWithXss };
    const result = component.highlightPhrases('بسم الله الرحمن');
    const html = (result as any).changingThisBreaksApplicationSecurity || result.toString();
    // Raw <script> tags should be escaped in the data-en attribute
    expect(html).not.toContain('data-en=""><script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;');
  });

  // View mode tests
  it('should set showWordAnalysis for word-by-word mode', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    component.applyViewMode('word-by-word');
    expect(component.showWordAnalysis).toBe(true);
  });

  it('should clear showWordAnalysis for plain mode', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    component.applyViewMode('word-by-word');
    component.applyViewMode('plain');
    expect(component.showWordAnalysis).toBe(false);
  });

  it('should treat legacy combined/paragraph modes as plain', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    component.applyViewMode('combined');
    expect(component.showWordAnalysis).toBe(false);
    component.applyViewMode('paragraph');
    expect(component.showWordAnalysis).toBe(false);
  });

  it('should check isAiTranslationId correctly', () => {
    expect(component.isAiTranslationId('en.ai')).toBe(true);
    expect(component.isAiTranslationId('en.qarai')).toBe(false);
    expect(component.isAiTranslationId('')).toBe(false);
  });

  it('should check chunksHaveTranslation correctly', () => {
    component.verse = { ...mockVerse, ai: mockAi };
    expect(component.chunksHaveTranslation('en.ai')).toBe(true);
    expect(component.chunksHaveTranslation('en.qarai')).toBe(false);
    expect(component.chunksHaveTranslation('')).toBe(false);
    // No chunks
    component.verse = { ...mockVerse, ai: undefined } as any;
    expect(component.chunksHaveTranslation('en.ai')).toBe(false);
  });

  // FB-03: Word click popup tests
  describe('word click popup', () => {
    beforeEach(() => {
      component.verse = { ...mockVerse, ai: mockAi };
      fixture.detectChanges(); // triggers ngOnInit
      // Set showWordAnalysis AFTER ngOnInit (which may reset it via viewMode$)
      component.showWordAnalysis = true;
      fixture.detectChanges();
    });

    it('should open popup when clicking a word card with event', () => {
      // Create a mock event with a target element
      const mockTarget = document.createElement('div');
      mockTarget.classList.add('word-card');
      const mockGrid = document.createElement('div');
      mockGrid.classList.add('word-analysis-grid');
      mockGrid.appendChild(mockTarget);
      document.body.appendChild(mockGrid);

      const mockEvent = {
        currentTarget: mockTarget,
      } as unknown as MouseEvent;

      component.setActiveWord(0, mockEvent);
      expect(component.activeWordIndex).toBe(0);
      expect(component.wordPopup).toBeTruthy();
      expect(component.wordPopup!.entry.word).toBe('بِسْمِ');
      expect(component.wordPopup!.entry.pos).toBe('PREP');

      document.body.removeChild(mockGrid);
    });

    it('should close popup when clicking the same word again', () => {
      component.activeWordIndex = 0;
      component.wordPopup = { entry: mockAi.word_analysis![0], x: 0, y: 0 };

      component.setActiveWord(0);
      expect(component.activeWordIndex).toBeNull();
      expect(component.wordPopup).toBeNull();
    });

    it('should close popup on Escape key', () => {
      component.wordPopup = { entry: mockAi.word_analysis![0], x: 0, y: 0 };
      component.activeWordIndex = 0;

      component.onEscapeKey();
      expect(component.wordPopup).toBeNull();
      expect(component.activeWordIndex).toBeNull();
    });

    it('should not error on Escape when no popup is open', () => {
      component.wordPopup = null;
      expect(() => component.onEscapeKey()).not.toThrow();
    });

    it('should close popup via closeWordPopup()', () => {
      component.wordPopup = { entry: mockAi.word_analysis![0], x: 0, y: 0 };
      component.activeWordIndex = 0;

      component.closeWordPopup();
      expect(component.wordPopup).toBeNull();
      expect(component.activeWordIndex).toBeNull();
    });

    it('should show correct word data in popup', () => {
      component.wordPopup = { entry: mockAi.word_analysis![1], x: 100, y: 200 };
      component.activeWordIndex = 1;
      fixture.detectChanges();

      const popupEl = fixture.nativeElement.querySelector('.word-popup');
      expect(popupEl).toBeTruthy();

      const arabicEl = popupEl.querySelector('.word-popup-arabic');
      expect(arabicEl.textContent.trim()).toBe('اللَّهِ');

      const posEl = popupEl.querySelector('.word-popup-pos-badge');
      expect(posEl.textContent.trim()).toBe('Noun');
    });

    it('should show translation in selected language', () => {
      component.wordAnalysisLang = 'en';
      component.wordPopup = { entry: mockAi.word_analysis![1], x: 100, y: 200 };
      component.activeWordIndex = 1;
      fixture.detectChanges();

      const transEl = fixture.nativeElement.querySelector('.word-popup-trans-text');
      expect(transEl.textContent.trim()).toBe('Allah');
    });

    it('should render word cards with accessibility attributes', () => {
      fixture.detectChanges();
      const cards = fixture.nativeElement.querySelectorAll('.word-card');
      expect(cards.length).toBe(2);

      const firstCard = cards[0];
      expect(firstCard.getAttribute('role')).toBe('button');
      expect(firstCard.getAttribute('tabindex')).toBe('0');
      expect(firstCard.getAttribute('aria-expanded')).toBe('false');
      expect(firstCard.getAttribute('aria-label')).toContain('بِسْمِ');
      expect(firstCard.getAttribute('aria-label')).toContain('Prep');
    });

    it('should clamp popup position to viewport bounds (P13-10)', () => {
      // Create a mock grid at the right edge of the viewport
      const mockTarget = document.createElement('div');
      mockTarget.classList.add('word-card');
      const mockGrid = document.createElement('div');
      mockGrid.classList.add('word-analysis-grid');
      mockGrid.appendChild(mockTarget);
      document.body.appendChild(mockGrid);

      // Mock getBoundingClientRect to simulate a card near the right edge
      spyOn(mockTarget, 'getBoundingClientRect').and.returnValue({
        left: window.innerWidth - 50,
        right: window.innerWidth - 10,
        top: 100,
        bottom: 130,
        width: 40,
        height: 30,
        x: window.innerWidth - 50,
        y: 100,
        toJSON: () => {},
      } as DOMRect);

      spyOn(mockGrid, 'getBoundingClientRect').and.returnValue({
        left: 0,
        right: window.innerWidth,
        top: 50,
        bottom: 500,
        width: window.innerWidth,
        height: 450,
        x: 0,
        y: 50,
        toJSON: () => {},
      } as DOMRect);

      const mockEvent = { currentTarget: mockTarget } as unknown as MouseEvent;
      component.setActiveWord(0, mockEvent);

      expect(component.wordPopup).toBeTruthy();
      // The x position should be clamped so the popup doesn't overflow
      const maxX = window.innerWidth - 200 / 2 - 8;
      expect(component.wordPopup!.x).toBeLessThanOrEqual(maxX);

      document.body.removeChild(mockGrid);
    });

    it('should have close button in popup', () => {
      component.wordPopup = { entry: mockAi.word_analysis![0], x: 0, y: 0 };
      component.activeWordIndex = 0;
      fixture.detectChanges();

      const closeBtn = fixture.nativeElement.querySelector('.word-popup-close');
      expect(closeBtn).toBeTruthy();
      expect(closeBtn.getAttribute('aria-label')).toBe('Close');
    });
  });
});
