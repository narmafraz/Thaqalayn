/**
 * Arabic word normalization — the canonical slug derivation function.
 *
 * This is the TypeScript twin of
 * `ThaqalaynDataGenerator/app/words/normalize.py`. The two implementations
 * must produce byte-identical output for the same input (a fixture replay
 * test enforces this).
 *
 * Slug-derivation contract:
 *   slug(surfaceForm) = surfaceForm.trim().normalize("NFC")
 *
 * That's the ONLY transformation. No transliteration, no diacritic
 * stripping, no alif/ya unification at the slug layer.
 *
 * Why minimal:
 * - The slug must round-trip from any chunk's surface form. If we strip
 *   diacritics here, `قَالَ` and `قَالُ` collapse to the same slug and we
 *   lose the per-inflection page distinction we want.
 * - Unicode NFC normalization is needed because the same character sequence
 *   can be represented multiple ways at the codepoint level (combining
 *   marks order, ligatures, etc.). Without NFC, byte-different but
 *   visually identical inputs would hash to different slugs.
 *
 * A SEPARATE function `normalizeForMatch()` does the diacritic-insensitive
 * normalization for fuzzy matching. NOT for slugs.
 */

/** Convert any Arabic surface form to its canonical slug. */
export function slug(surfaceForm: string | null | undefined): string {
  if (!surfaceForm) return '';
  return surfaceForm.trim().normalize('NFC');
}

// ---------------------------------------------------------------------------
// Auxiliary: diacritic-insensitive match normalization
// Use for fuzzy lookups (search-bar suggestions, narrator matching). Never
// use to derive a slug — it collapses inflectional distinctions.
// ---------------------------------------------------------------------------

// Same character sets as the Python twin. Keep in sync.
const DIACRITIC_MARKS = new Set([
  'ً', // tanwin fatha
  'ٌ', // tanwin damma
  'ٍ', // tanwin kasra
  'َ', // fatha
  'ُ', // damma
  'ِ', // kasra
  'ّ', // shadda
  'ْ', // sukun
  'ٰ', // alif khanjariyah (superscript alif)
  'ـ', // tatweel
]);

const ALIF_VARIANTS = new Set(['أ', 'إ', 'آ', 'ٱ', 'ا']);
// أ إ آ ٱ ا
const YA_VARIANTS = new Set(['ي', 'ى']);
// ي ى
const TA_MARBUTA = 'ة';
// ة

/** Diacritic-insensitive normalization for fuzzy lookups. */
export function normalizeForMatch(surfaceForm: string | null | undefined): string {
  if (!surfaceForm) return '';
  const nfc = surfaceForm.trim().normalize('NFC');
  let out = '';
  for (const ch of nfc) {
    if (DIACRITIC_MARKS.has(ch)) continue;
    if (ALIF_VARIANTS.has(ch)) {
      out += 'ا';
    } else if (YA_VARIANTS.has(ch)) {
      out += 'ي';
    } else if (ch === TA_MARBUTA) {
      out += 'ه';
    } else {
      out += ch;
    }
  }
  return out;
}
