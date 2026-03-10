import { BOOK_AUTHORS, getBookAuthor } from './book-authors';

describe('BOOK_AUTHORS', () => {
  const KNOWN_BOOK_SLUGS = [
    'quran',
    'al-kafi',
    'man-la-yahduruhu-al-faqih',
    'tahdhib-al-ahkam',
    'al-istibsar',
    'al-amali-saduq',
    'al-amali-mufid',
    'al-khisal',
    'al-tawhid',
    'kamal-al-din',
    'kamil-al-ziyarat',
    'kitab-al-duafa',
    'kitab-al-ghayba-numani',
    'kitab-al-ghayba-tusi',
    'kitab-al-mumin',
    'kitab-al-zuhd',
    'maani-al-akhbar',
    'mujam-al-ahadith-al-mutabara',
    'nahj-al-balagha',
    'risalat-al-huquq',
    'fadail-al-shia',
    'sifat-al-shia',
    'thawab-al-amal',
    'uyun-akhbar-al-rida',
  ];

  it('should have entries for all known books in the data index', () => {
    for (const slug of KNOWN_BOOK_SLUGS) {
      expect(BOOK_AUTHORS[slug]).toBeDefined(`Missing author entry for book: ${slug}`);
    }
  });

  it('should have both en and ar fields for every entry', () => {
    for (const [slug, author] of Object.entries(BOOK_AUTHORS)) {
      expect(typeof author.en).toBe('string', `${slug} missing en field`);
      expect(typeof author.ar).toBe('string', `${slug} missing ar field`);
    }
  });

  it('should have a non-empty English author for all books except Quran', () => {
    for (const [slug, author] of Object.entries(BOOK_AUTHORS)) {
      if (slug === 'quran') {
        expect(author.en).toBe('', 'Quran should have empty author');
      } else {
        expect(author.en.length).toBeGreaterThan(0, `${slug} should have non-empty English author`);
      }
    }
  });

  it('should have a non-empty Arabic author for all books except Quran', () => {
    for (const [slug, author] of Object.entries(BOOK_AUTHORS)) {
      if (slug === 'quran') {
        expect(author.ar).toBe('', 'Quran should have empty author');
      } else {
        expect(author.ar.length).toBeGreaterThan(0, `${slug} should have non-empty Arabic author`);
      }
    }
  });
});

describe('getBookAuthor', () => {
  it('should return author for a simple slug', () => {
    const author = getBookAuthor('al-kafi');
    expect(author).toBeDefined();
    expect(author!.en).toBe('Al-Kulayni');
  });

  it('should extract root slug from a colon-separated index', () => {
    const author = getBookAuthor('al-kafi:1:2:3');
    expect(author).toBeDefined();
    expect(author!.en).toBe('Al-Kulayni');
  });

  it('should return undefined for an unknown slug', () => {
    expect(getBookAuthor('unknown-book')).toBeUndefined();
  });

  it('should return empty strings for Quran author', () => {
    const author = getBookAuthor('quran');
    expect(author).toBeDefined();
    expect(author!.en).toBe('');
    expect(author!.ar).toBe('');
  });
});
