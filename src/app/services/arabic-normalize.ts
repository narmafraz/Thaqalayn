// Canonical Arabic normalizer for search.
//
// MUST stay identical to the index-time normalizers, or queries won't match
// indexed text:
//   - ThaqalaynDataGenerator/app/arabic_normalization.py  (Python, legacy data build)
//   - ThaqalaynSearch/lib/normalize-arabic.mjs            (Node, Pagefind build)
//
// Steps: strip tashkeel (diacritics) + tatweel, strip zero-width/bidi marks,
// fold alif/waw/yeh/teh-marbuta variants, fold Persian kaf/yeh + alif maksura,
// normalize Arabic punctuation, collapse whitespace.
//
// Regexes are built from numeric code points so the source stays pure ASCII
// (literal Arabic / bidi characters are fragile in source files).

const ch = (c: number): string => String.fromCharCode(c);
const cls = (ranges: (number | [number, number])[]): RegExp =>
  new RegExp(
    '[' + ranges.map((r) => (Array.isArray(r) ? ch(r[0]) + '-' + ch(r[1]) : ch(r))).join('') + ']',
    'g',
  );

const RE_STRIP = cls([ // tashkeel (combining marks) + tatweel
  [0x0610, 0x061a], [0x064b, 0x065f], 0x0670,
  [0x06d6, 0x06dc], [0x06df, 0x06e4], [0x06e7, 0x06e8], 0x0640,
]);
const RE_ZW = cls([[0x200b, 0x200f], [0x2028, 0x202f], 0xfeff]); // zero-width + bidi
const RE_ALIF = cls([0x0622, 0x0623, 0x0625, 0x0627, 0x0671]); // madda/hamza/alif/wasla
const RE_WAWH = cls([0x0624]); // waw-hamza
const RE_YEHH = cls([0x0626]); // yeh-hamza
const RE_TEH = cls([0x0629]); // teh marbuta
const RE_PKAF = cls([0x06a9]); // persian kaf
const RE_PYEH = cls([0x06cc, 0x0649]); // persian yeh / alif maksura
const RE_COMMA = cls([0x060c]);
const RE_SEMI = cls([0x061b]);
const RE_QMARK = cls([0x061f]);

const ALIF = ch(0x0627), WAW = ch(0x0648), YEH = ch(0x064a), HEH = ch(0x0647), KAF = ch(0x0643);

export function normalizeArabic(text: string): string {
  if (!text) {
    return '';
  }
  return text
    .replace(RE_STRIP, '')
    .replace(RE_ZW, '')
    .replace(RE_ALIF, ALIF)
    .replace(RE_WAWH, WAW)
    .replace(RE_YEHH, YEH)
    .replace(RE_TEH, HEH)
    .replace(RE_PKAF, KAF)
    .replace(RE_PYEH, YEH)
    .replace(RE_COMMA, ',')
    .replace(RE_SEMI, ';')
    .replace(RE_QMARK, '?')
    .replace(/\s+/g, ' ')
    .trim();
}
