import { normalizeArabic } from './arabic-normalize';

// Code-point helper so the spec source stays pure ASCII.
const ch = (...c: number[]): string => String.fromCharCode(...c);

describe('normalizeArabic', () => {
  it('returns empty string for falsy input', () => {
    expect(normalizeArabic('')).toBe('');
  });

  it('strips tashkeel (diacritics)', () => {
    // bismi with kasra/sukun/kasra -> bare letters (0628 0633 0645)
    const input = ch(0x0628, 0x0650, 0x0633, 0x0652, 0x0645, 0x0650);
    expect(normalizeArabic(input)).toBe(ch(0x0628, 0x0633, 0x0645));
  });

  it('strips tatweel (kashida)', () => {
    expect(normalizeArabic(ch(0x0639, 0x0640, 0x0644, 0x0645))).toBe(ch(0x0639, 0x0644, 0x0645));
  });

  it('folds alif variants (madda/hamza/wasla) to bare alif', () => {
    for (const a of [0x0622, 0x0623, 0x0625, 0x0627, 0x0671]) {
      expect(normalizeArabic(ch(a))).toBe(ch(0x0627));
    }
  });

  it('folds waw-hamza / yeh-hamza / teh-marbuta', () => {
    expect(normalizeArabic(ch(0x0624))).toBe(ch(0x0648)); // waw-hamza -> waw
    expect(normalizeArabic(ch(0x0626))).toBe(ch(0x064a)); // yeh-hamza -> yeh
    expect(normalizeArabic(ch(0x0629))).toBe(ch(0x0647)); // teh marbuta -> heh
  });

  it('folds persian kaf and persian yeh / alif maksura', () => {
    expect(normalizeArabic(ch(0x06a9))).toBe(ch(0x0643)); // persian kaf -> arabic kaf
    expect(normalizeArabic(ch(0x06cc))).toBe(ch(0x064a)); // persian yeh -> arabic yeh
    expect(normalizeArabic(ch(0x0649))).toBe(ch(0x064a)); // alif maksura -> yeh
  });

  it('strips zero-width marks and collapses whitespace', () => {
    expect(normalizeArabic('a' + ch(0x200b) + 'b   c')).toBe('ab c');
  });

  it('normalizes Arabic punctuation to ASCII', () => {
    expect(normalizeArabic(ch(0x060c))).toBe(','); // arabic comma
    expect(normalizeArabic(ch(0x061b))).toBe(';'); // arabic semicolon
    expect(normalizeArabic(ch(0x061f))).toBe('?'); // arabic question mark
  });
});
