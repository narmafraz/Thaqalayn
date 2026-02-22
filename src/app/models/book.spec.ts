import { Book, ChapterContent, ChapterList, VerseDetail, getChapter, getDefaultVerseTranslationIds, getVerseTranslations } from './book';

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
});
