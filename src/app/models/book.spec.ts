import { AiContent } from './ai-content';
import { Book, ChapterContent, ChapterList, Translation, Verse, VerseDetail, getChapter, getDefaultVerseTranslationIds, getVerseTranslations } from './book';

describe('Book model functions', () => {
  const mockChapterList: ChapterList = {
    kind: 'chapter_list',
    index: 'al-kafi:1',
    data: {
      index: 'al-kafi:1',
      local_index: '1',
      path: '/books/al-kafi:1',
      titles: { en: 'Volume One', ar: 'الجزء الأول' },
      descriptions: {},
      verse_count: 100,
      verse_start_index: 0,
      order: 1,
      rukus: 0,
      reveal_type: '',
      sajda_type: '',
      verses: [],
      chapters: [],
      part_type: 'volume',
      nav: { prev: null, next: null, up: null },
      verse_translations: ['en.qarai', 'fa.ansarian'],
      default_verse_translation_ids: { en: 'en.qarai', fa: 'fa.ansarian' },
    }
  };

  const mockVerseList: ChapterContent = {
    kind: 'verse_list',
    index: 'al-kafi:1:2:1',
    data: {
      index: 'al-kafi:1:2:1',
      local_index: '1',
      path: '/books/al-kafi:1:2:1',
      titles: { en: 'Chapter 1', ar: 'باب ١' },
      descriptions: {},
      verse_count: 5,
      verse_start_index: 37,
      order: 1,
      rukus: 0,
      reveal_type: '',
      sajda_type: '',
      verses: [{
        index: 37,
        local_index: 1,
        path: '/books/al-kafi:1:2:1:1',
        text: ['Arabic text'],
        sajda_type: '',
        translations: { 'en.hubeali': ['English'] },
        part_type: 'hadith',
        relations: {},
        narrator_chain: { parts: [], text: '' },
      }],
      chapters: [],
      part_type: 'chapter',
      nav: { prev: null, next: null, up: null },
      verse_translations: ['en.hubeali'],
      default_verse_translation_ids: { en: 'en.hubeali' },
    }
  };

  const mockVerseDetail: VerseDetail = {
    kind: 'verse_detail',
    index: 'al-kafi:1:2:1:1',
    data: {
      verse: {
        index: 37,
        local_index: 1,
        path: '/books/al-kafi:1:2:1:1',
        text: ['Arabic text'],
        sajda_type: '',
        translations: {
          'en.hubeali': ['English translation'],
          'fr.test': ['French translation'],
        },
        part_type: 'hadith',
        relations: {},
        narrator_chain: { parts: [], text: '' },
      },
      chapter_path: '/books/al-kafi:1:2:1',
      chapter_title: { en: 'Chapter 1', ar: 'باب ١' },
      nav: { prev: null, next: null, up: '/books/al-kafi:1:2:1' },
      gradings: { majlisi: 'Sahih' },
    }
  };

  describe('getVerseTranslations', () => {
    it('should return verse_translations for chapter_list', () => {
      const result = getVerseTranslations(mockChapterList);
      expect(result).toEqual(['en.qarai', 'fa.ansarian']);
    });

    it('should return verse_translations for verse_list', () => {
      const result = getVerseTranslations(mockVerseList);
      expect(result).toEqual(['en.hubeali']);
    });

    it('should return translation keys for verse_detail', () => {
      const result = getVerseTranslations(mockVerseDetail);
      expect(result).toContain('en.hubeali');
      expect(result).toContain('fr.test');
      expect(result.length).toBe(2);
    });

    it('should return undefined for null book', () => {
      const result = getVerseTranslations(null);
      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined book', () => {
      const result = getVerseTranslations(undefined);
      expect(result).toBeUndefined();
    });

    it('should return undefined when data is null', () => {
      const result = getVerseTranslations({ kind: 'chapter_list', index: 'x', data: null } as any);
      expect(result).toBeUndefined();
    });
  });

  describe('getChapter', () => {
    it('should return data for chapter_list', () => {
      const result = getChapter(mockChapterList);
      expect(result).toBeDefined();
      expect(result.titles.en).toBe('Volume One');
    });

    it('should return data for verse_list', () => {
      const result = getChapter(mockVerseList);
      expect(result).toBeDefined();
      expect(result.titles.en).toBe('Chapter 1');
    });

    it('should return falsy for verse_detail', () => {
      const result = getChapter(mockVerseDetail);
      expect(result).toBeFalsy();
    });

    it('should return falsy for null book', () => {
      const result = getChapter(null);
      expect(result).toBeFalsy();
    });
  });

  describe('getDefaultVerseTranslationIds', () => {
    it('should return default IDs for chapter_list', () => {
      const result = getDefaultVerseTranslationIds(mockChapterList);
      expect(result).toEqual({ en: 'en.qarai', fa: 'fa.ansarian' });
    });

    it('should return default IDs for verse_list', () => {
      const result = getDefaultVerseTranslationIds(mockVerseList);
      expect(result).toEqual({ en: 'en.hubeali' });
    });

    it('should return falsy for verse_detail', () => {
      const result = getDefaultVerseTranslationIds(mockVerseDetail);
      expect(result).toBeFalsy();
    });

    it('should return falsy for null book', () => {
      const result = getDefaultVerseTranslationIds(null);
      expect(result).toBeFalsy();
    });
  });

  describe('Verse with ai field', () => {
    it('should work without ai field (progressive enhancement)', () => {
      const verse: Verse = {
        index: 1,
        local_index: 1,
        path: '/books/al-kafi:1:1:1:1',
        text: ['Arabic text'],
        sajda_type: '',
        translations: { 'en.hubeali': ['English'] },
        part_type: 'hadith',
        relations: {},
        narrator_chain: { parts: [], text: '' },
      };
      expect(verse.ai).toBeUndefined();
    });

    it('should accept a verse with AI content', () => {
      const ai: AiContent = {
        diacritized_text: 'بِسْمِ اللَّهِ',
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
        ],
      };
      const verse: Verse = {
        index: 1,
        local_index: 1,
        path: '/books/al-kafi:1:1:1:1',
        text: ['بسم الله'],
        sajda_type: '',
        translations: {},
        part_type: 'hadith',
        relations: {},
        narrator_chain: { parts: [], text: '' },
        ai,
      };
      expect(verse.ai).toBeDefined();
      expect(verse.ai.diacritized_text).toContain('بِسْمِ');
      expect(verse.ai.content_type).toBe('creedal');
      expect(verse.ai.word_analysis.length).toBe(1);
    });

    it('should work in existing model functions when ai is present', () => {
      const verseWithAi: ChapterContent = {
        kind: 'verse_list',
        index: 'al-kafi:1:1:1',
        data: {
          index: 'al-kafi:1:1:1',
          local_index: '1',
          path: '/books/al-kafi:1:1:1',
          titles: { en: 'Chapter 1', ar: 'باب ١' },
          descriptions: {},
          verse_count: 1,
          verse_start_index: 1,
          order: 1,
          rukus: 0,
          reveal_type: '',
          sajda_type: '',
          verses: [{
            index: 1,
            local_index: 1,
            path: '/books/al-kafi:1:1:1:1',
            text: ['Arabic'],
            sajda_type: '',
            translations: { 'en.hubeali': ['English'] },
            part_type: 'hadith',
            relations: {},
            narrator_chain: { parts: [], text: '' },
            ai: { content_type: 'theological', tags: ['theology'] },
          }],
          chapters: [],
          part_type: 'chapter',
          nav: { prev: null, next: null, up: null },
          verse_translations: ['en.hubeali'],
          default_verse_translation_ids: { en: 'en.hubeali' },
        },
      };
      expect(getVerseTranslations(verseWithAi)).toEqual(['en.hubeali']);
      expect(getChapter(verseWithAi).verses[0].ai.content_type).toBe('theological');
    });
  });

  describe('Translation with AI metadata', () => {
    it('should work without source/model/disclaimer (backward compatible)', () => {
      const t: Translation = { name: 'Qarai', id: 'en.qarai', lang: 'en' };
      expect(t.source).toBeUndefined();
      expect(t.model).toBeUndefined();
      expect(t.disclaimer).toBeUndefined();
    });

    it('should accept AI translation metadata', () => {
      const t: Translation = {
        name: 'AI Translation (Urdu)',
        id: 'ur.ai',
        lang: 'ur',
        source: 'ai',
        model: 'claude-opus-4-6-20260205',
        disclaimer: 'AI-generated translation. May contain errors.',
      };
      expect(t.source).toBe('ai');
      expect(t.model).toContain('claude');
      expect(t.disclaimer).toBeDefined();
    });

    it('should accept human translation source', () => {
      const t: Translation = {
        name: 'Qarai',
        id: 'en.qarai',
        lang: 'en',
        source: 'human',
      };
      expect(t.source).toBe('human');
    });
  });
});
