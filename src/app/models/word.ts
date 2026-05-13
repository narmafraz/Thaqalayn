/**
 * Type definitions for the ThaqalaynWords data API
 * (https://thaqalaynwords.netlify.app/).
 *
 * Mirrors the JSON schema documented in
 * `ThaqalaynWords/README.md` and produced by
 * `ThaqalaynDataGenerator/app/words/builders.py`.
 *
 * Three top-level page kinds:
 *  - SurfacePage  (lightweight; what each clickable word in a hadith opens)
 *  - LemmaPage    (heavy; paradigm + cross-refs + classical content)
 *  - RootPage     (lemma family browser)
 *
 * Plus three index files at /index/{surfaces,lemmas,roots}.json.
 */

/** Morphological analysis from CAMeL Tools, attached to a surface form. */
export interface SurfaceMorphology {
  /** Canonical diacritized lemma — same slug as the lemma page. */
  lemma_slug: string;
  /** Arabic root in CAMeL dotted notation, e.g. "ق.#.ل". `#` = weak radical. */
  root: string | null;
  /** Compact POS code: V/N/ADJ/ADV/PREP/CONJ/PRON/DET/PART/INTJ/REL/DEM/NEG/COND/INTERR. */
  pos: string | null;
  /** Full CAMeL Tools POS, e.g. "verb", "noun_prop", "adj.act". */
  pos_camel: string | null;
  /**
   * Detected proclitic / enclitic markers. Keys are CAMeL slot names
   * (`prc0`..`prc3`, `enc0`, `enc1`); values are codes like `wa_conj`
   * or `3ms_dobj`. Empty `{}` when the surface is a bare stem.
   */
  clitics: Record<string, string>;
}

/** /surfaces/{slug}.json shape. */
export interface SurfacePage {
  /** Surface form as it appears in the corpus (NFC Arabic). */
  surface: string;
  /** URL/filename slug (same as `surface`). */
  slug: string;
  /** How many times this surface appears across the whole corpus. */
  occurrence_count: number;
  /** Hadith paths that contain this surface, e.g. "/books/al-kafi:1:1:1:1". */
  occurrence_paths: string[];
  /** Null when CAMeL couldn't analyze the surface (~6% of surfaces — proper nouns, Latin chars). */
  morphology: SurfaceMorphology | null;
  /** Path to the lemma page (`/words/lemmas/{lemma_slug}`). Null when morphology is null. */
  lemma_link: string | null;
}

/** A single form in a lemma's full paradigm. */
export interface ParadigmEntry {
  /** Structural role, e.g. "past_3ms", "present_3fp", "imperative_2ms", "verbal_noun". */
  role: string | null;
  /** NFC-normalized form. Same as the surface-page slug if attested in corpus. */
  form: string;
  /** True if this form (or a diacritization variant) appears in the corpus. */
  in_corpus: boolean;
  /** Corpus occurrence count when in_corpus; null otherwise. */
  count: number | null;
  /** Aspect: p past / i present / c imperative / na not-a-verb. */
  asp: string | null;
  per: string | null;  // person: 1/2/3/na
  gen: string | null;  // gender: m/f/c/na
  num: string | null;  // number: s/d/p/na
}

export interface QacCrossRef {
  found: boolean;
  lemma_key?: string;
  root?: string | null;
  pos?: string | null;
  occurrence_count?: number;
}

export interface WiktextractCrossRef {
  found: boolean;
  entry_count?: number;
  pos_tags?: string[];
  has_etymology?: boolean;
  sense_count?: number;
}

export interface LanesCrossRef {
  found: boolean;
  entry_ids?: string[];
  /** Generic WordPress-search URL on lanelexicon.com for the lemma. */
  search_url?: string;
}

export interface CrossReferences {
  qac: QacCrossRef;
  wiktextract: WiktextractCrossRef;
  lanes: LanesCrossRef;
}

/** Wiktextract-derived definition entry. */
export interface WiktSense {
  pos: string | null;
  gloss: string;
  tags?: string[];
  examples?: Array<{ text: string; english?: string }>;
}

export interface WiktDefinition {
  source: 'wiktextract';
  senses: WiktSense[];
}

export interface WiktEtymology {
  source: 'wiktextract';
  text: string;
}

/** A single Lane's entry body within a lemma's `lanes_definition`. */
export interface LaneEntry {
  entry_id: string;
  headword_ar: string | null;
  root: string | null;
  /**
   * Ordered, typed body segments.
   *  - italic_en: English definition (italicized in print)
   *  - arabic: embedded Arabic (Buckwalter + NFC pair)
   *  - text: connective prose (often contains parenthesized source citations)
   *  - quote: occasional `<quote>` block
   *  - page_break: marker for the printed-page number
   */
  body: Array<
    | { kind: 'italic_en'; text: string }
    | { kind: 'arabic'; text_bw?: string; text_ar: string; orth_type?: 'plain' | 'arrow' }
    | { kind: 'text'; text: string }
    | { kind: 'quote'; text: string }
    | { kind: 'page_break'; n: number }
  >;
  /** Abbreviation codes for sources Lane cited (S=Sihah, K=Kamoos, etc.). */
  source_refs: string[];
}

export interface LanesDefinition {
  source: 'lanes';
  entries: LaneEntry[];
}

/** A single classical-lexicon entry within `classical_definitions`. */
export interface ClassicalEntry {
  /** CSS-class-derived ID, e.g. "dictionary_31" = al-Mufradat. */
  lexicon_id: string;
  lexicon_en: string;
  lexicon_ar: string;
  /** Deep link back to the specific entry on hawramani. */
  permalink: string;
  /** Sanitized HTML body — safe to render with `[innerHTML]`. */
  body_html: string;
}

export interface ClassicalDefinitions {
  source: 'hawramani';
  /** Lemma's hawramani page URL (deep link). */
  url: string;
  /** The Arabic headword on the page that matched this lemma. */
  headword_ar: string;
  entries: ClassicalEntry[];
}

/** /lemmas/{slug}.json shape. */
export interface LemmaPage {
  lemma: string;
  slug: string;
  root: string | null;
  /** URL-safe form: `.` → `-`, `#` → `_`. E.g. `ق.#.ل` → `ق-_-ل`. */
  root_slug: string | null;
  /** Path to the root page (`/words/roots/{root_slug}`). */
  root_link: string | null;
  /** Compact POS, see SurfaceMorphology.pos. */
  pos: string | null;
  pos_camel: string | null;
  /** Full conjugation/declension table. */
  paradigm: ParadigmEntry[];
  /** Sum of in_corpus paradigm counts. */
  frequency_in_corpus: number;
  cross_references: CrossReferences;
  /** Multi-language translations — currently null (filled by future LLM phase). */
  translations: unknown | null;
  /** Wiktextract glosses. Null when no Wiktionary entry exists. */
  definition: WiktDefinition | null;
  /** Wiktextract etymology. Null when Wiktionary has none. */
  etymology: WiktEtymology | null;
  /** IPA pronunciation strings (deduplicated). Null when unavailable. */
  ipa: string[] | null;
  /** Lane's Arabic-English Lexicon body. Null when no Lane's entry. */
  lanes_definition: LanesDefinition | null;
  /** ~38 classical Arabic lexicons aggregated from hawramani. Null when no entry. */
  classical_definitions: ClassicalDefinitions | null;
}

/** /roots/{slug}.json shape. */
export interface RootPage {
  root: string;
  slug: string;
  lemmas: Array<{
    slug: string;
    pos: string | null;
    frequency: number;
  }>;
  lemma_count: number;
  total_frequency: number;
  /** Currently null — reserved for future LLM-filled "root family meaning". */
  translations: unknown | null;
  definition: unknown | null;
  etymology: unknown | null;
}

// ---------------------------------------------------------------------------
// Index files
// ---------------------------------------------------------------------------

export interface SurfaceIndexEntry {
  slug: string;
  count: number;
  lemma: string | null;
  pos: string | null;
}

export interface LemmaIndexEntry {
  slug: string;
  root: string | null;
  root_slug: string | null;
  pos: string | null;
  frequency: number;
  paradigm_size: number;
  in_corpus_forms: number;
  has_qac: boolean;
  has_wiktextract: boolean;
  has_lanes: boolean;
}

export interface RootIndexEntry {
  slug: string;
  root: string;
  lemma_count: number;
  total_frequency: number;
}

export interface SurfacesIndex {
  total: number;
  surfaces: SurfaceIndexEntry[];
}
export interface LemmasIndex {
  total: number;
  lemmas: LemmaIndexEntry[];
}
export interface RootsIndex {
  total: number;
  roots: RootIndexEntry[];
}
