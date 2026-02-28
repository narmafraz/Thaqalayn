import {
  AiContent,
  AiTranslationEntry,
  Chunk,
  ContentType,
  DiacriticsChange,
  DiacriticsStatus,
  IsnadMatn,
  IsnadNarrator,
  KeyPhrase,
  RelatedQuran,
  SimilarContentHint,
  WordAnalysisEntry,
} from './ai-content';

describe('AI Content interfaces', () => {
  describe('AiContent', () => {
    it('should accept an empty object (all fields optional)', () => {
      const ai: AiContent = {};
      expect(ai).toBeDefined();
      expect(ai.diacritized_text).toBeUndefined();
      expect(ai.word_analysis).toBeUndefined();
      expect(ai.translations).toBeUndefined();
    });

    it('should accept a fully populated AI content block', () => {
      const ai: AiContent = {
        diacritized_text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ',
        diacritics_status: 'validated',
        diacritics_changes: [],
        word_analysis: [
          {
            word: 'بِسْمِ',
            translation: {
              en: 'In the name of', ur: 'کے نام سے', tr: 'adıyla', fa: 'به نام',
              id: 'Dengan nama', bn: 'নামে', es: 'En el nombre de', fr: 'Au nom de',
              de: 'Im Namen', ru: 'Во имя', zh: '以...之名',
            },
            pos: 'PREP',
          },
        ],
        tags: ['theology', 'worship'],
        content_type: 'creedal',
        related_quran: [{ ref: '1:1', relationship: 'explicit' }],
        isnad_matn: {
          isnad_ar: '',
          matn_ar: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ',
          has_chain: false,
          narrators: [],
        },
        translations: {
          en: {
            text: 'In the name of Allah, the Beneficent, the Merciful',
            summary: 'The opening phrase of the Quran.',
            key_terms: { 'الرَّحْمَن': 'The Most Gracious' },
            seo_question: 'What does Bismillah mean?',
          },
        },
        chunks: [
          {
            chunk_type: 'body',
            arabic_text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ',
            word_start: 0,
            word_end: 4,
            translations: { en: 'In the name of Allah, the Beneficent, the Merciful' },
          },
        ],
        topics: ['tawhid', 'divine_attributes'],
        key_phrases: [
          {
            phrase_ar: 'بِسْمِ اللَّهِ',
            phrase_en: 'In the name of Allah',
            category: 'prophetic_formula',
          },
        ],
        similar_content_hints: [
          { description: 'Other verses beginning with Bismillah', theme: 'divine_invocation' },
        ],
      };
      expect(ai.diacritized_text).toContain('بِسْمِ');
      expect(ai.word_analysis.length).toBe(1);
      expect(ai.word_analysis[0].pos).toBe('PREP');
      expect(ai.translations.en.summary).toContain('opening');
      expect(ai.chunks.length).toBe(1);
      expect(ai.topics.length).toBe(2);
      expect(ai.key_phrases.length).toBe(1);
      expect(ai.similar_content_hints.length).toBe(1);
    });
  });

  describe('DiacriticsChange', () => {
    it('should support string entries in diacritics_changes', () => {
      const ai: AiContent = {
        diacritics_changes: ['Added tashkeel to honorific'],
      };
      expect(ai.diacritics_changes[0]).toBe('Added tashkeel to honorific');
    });

    it('should support object entries in diacritics_changes', () => {
      const change: DiacriticsChange = {
        original: 'عليه',
        corrected: 'عَلَيْهِ',
        position: 5,
        reason: 'Added full tashkeel',
      };
      const ai: AiContent = {
        diacritics_changes: [change],
      };
      expect((ai.diacritics_changes[0] as DiacriticsChange).corrected).toBe('عَلَيْهِ');
    });

    it('should support mixed string and object entries', () => {
      const ai: AiContent = {
        diacritics_changes: [
          'Simple description',
          { original: 'x', corrected: 'y', position: 1, reason: 'test' },
        ],
      };
      expect(ai.diacritics_changes.length).toBe(2);
    });
  });

  describe('ContentType values', () => {
    it('should accept all 12 content types', () => {
      const types: ContentType[] = [
        'legal_ruling', 'ethical_teaching', 'narrative', 'prophetic_tradition',
        'quranic_commentary', 'supplication', 'creedal', 'eschatological',
        'biographical', 'theological', 'exhortation', 'cosmological',
      ];
      expect(types.length).toBe(12);
    });
  });

  describe('DiacriticsStatus values', () => {
    it('should accept all 4 statuses', () => {
      const statuses: DiacriticsStatus[] = ['added', 'completed', 'validated', 'corrected'];
      expect(statuses.length).toBe(4);
    });
  });

  describe('IsnadMatn', () => {
    it('should represent a hadith with a narrator chain', () => {
      const isnad: IsnadMatn = {
        has_chain: true,
        isnad_ar: 'عِدَّةٌ مِنْ أَصْحَابِنَا',
        matn_ar: 'إِنَّ اللَّهَ تَبَارَكَ وَتَعَالَى',
        narrators: [
          {
            name_ar: 'مُحَمَّدُ بْنُ يَعْقُوبَ',
            name_en: 'Muhammad ibn Ya\'qub',
            role: 'author',
            position: 1,
            identity_confidence: 'definite',
            ambiguity_note: null,
            known_identity: 'Al-Kulayni (d. 329 AH)',
          },
          {
            name_ar: 'عِدَّةٌ مِنْ أَصْحَابِنَا',
            name_en: 'A number of our companions',
            role: 'narrator',
            position: 2,
            identity_confidence: 'ambiguous',
            ambiguity_note: 'Generic reference to multiple unnamed companions',
            known_identity: null,
          },
        ],
      };
      expect(isnad.has_chain).toBe(true);
      expect(isnad.narrators.length).toBe(2);
      expect(isnad.narrators[0].identity_confidence).toBe('definite');
      expect(isnad.narrators[1].identity_confidence).toBe('ambiguous');
    });

    it('should represent a hadith without a chain', () => {
      const isnad: IsnadMatn = {
        has_chain: false,
        isnad_ar: '',
        matn_ar: 'Some text',
        narrators: [],
      };
      expect(isnad.has_chain).toBe(false);
      expect(isnad.narrators.length).toBe(0);
    });

    it('should support narrator word_ranges for UI highlighting', () => {
      const narrator: IsnadNarrator = {
        name_ar: 'عَلِيٌّ',
        name_en: 'Ali',
        role: 'imam',
        position: 3,
        identity_confidence: 'definite',
        ambiguity_note: null,
        known_identity: 'Imam Ali ibn Abi Talib',
        word_ranges: [{ word_start: 10, word_end: 12 }],
      };
      expect(narrator.word_ranges.length).toBe(1);
      expect(narrator.word_ranges[0].word_start).toBe(10);
    });
  });

  describe('RelatedQuran', () => {
    it('should represent a Quran cross-reference', () => {
      const ref: RelatedQuran = {
        ref: '2:255',
        relationship: 'thematic',
      };
      expect(ref.ref).toBe('2:255');
      expect(ref.relationship).toBe('thematic');
    });

    it('should support optional word ranges', () => {
      const ref: RelatedQuran = {
        ref: '27:30',
        relationship: 'explicit',
        word_start: 5,
        word_end: 12,
      };
      expect(ref.word_start).toBe(5);
      expect(ref.word_end).toBe(12);
    });
  });

  describe('Chunk', () => {
    it('should represent a chunk with all fields', () => {
      const chunk: Chunk = {
        chunk_type: 'isnad',
        arabic_text: 'عِدَّةٌ مِنْ أَصْحَابِنَا',
        word_start: 0,
        word_end: 38,
        translations: {
          en: 'A number of our companions...',
          ur: 'ہمارے کئی ساتھیوں سے...',
        },
      };
      expect(chunk.chunk_type).toBe('isnad');
      expect(chunk.arabic_text).toContain('عِدَّةٌ');
      expect(chunk.word_start).toBe(0);
      expect(chunk.translations.en).toBeDefined();
    });
  });

  describe('WordAnalysisEntry', () => {
    it('should require all 11 language translations', () => {
      const entry: WordAnalysisEntry = {
        word: 'اللَّهِ',
        translation: {
          en: 'Allah', ur: 'اللہ', tr: 'Allah', fa: 'خدا',
          id: 'Allah', bn: 'আল্লাহ', es: 'Alá', fr: 'Allah',
          de: 'Allah', ru: 'Аллах', zh: '安拉',
        },
        pos: 'N',
      };
      expect(entry.word).toBe('اللَّهِ');
      expect(Object.keys(entry.translation).length).toBe(11);
    });
  });

  describe('KeyPhrase', () => {
    it('should represent a key phrase entry', () => {
      const phrase: KeyPhrase = {
        phrase_ar: 'بِسْمِ اللَّهِ',
        phrase_en: 'In the name of Allah',
        category: 'prophetic_formula',
      };
      expect(phrase.category).toBe('prophetic_formula');
    });
  });

  describe('SimilarContentHint', () => {
    it('should represent a similarity hint', () => {
      const hint: SimilarContentHint = {
        description: 'Other hadiths about intellect',
        theme: 'intellect_and_knowledge',
      };
      expect(hint.theme).toBe('intellect_and_knowledge');
    });
  });

  describe('AiTranslationEntry', () => {
    it('should contain text, summary, key_terms, and seo_question', () => {
      const entry: AiTranslationEntry = {
        text: 'A full translation of the hadith.',
        summary: 'This hadith discusses the importance of knowledge.',
        key_terms: { 'العِلْم': 'Knowledge', 'العَقْل': 'Intellect/Reason' },
        seo_question: 'What does Islam say about the importance of knowledge?',
      };
      expect(entry.text).toBeDefined();
      expect(Object.keys(entry.key_terms).length).toBe(2);
    });
  });
});
