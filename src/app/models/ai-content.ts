// Part-of-speech tags used by word_analysis
export type PosTag =
  | 'N' | 'V' | 'ADJ' | 'ADV' | 'PREP' | 'CONJ' | 'PRON'
  | 'DET' | 'PART' | 'INTJ' | 'REL' | 'DEM' | 'NEG' | 'COND' | 'INTERR';

// 11 supported AI translation languages
export type AiLanguage = 'en' | 'ur' | 'tr' | 'fa' | 'id' | 'bn' | 'es' | 'fr' | 'de' | 'ru' | 'zh';

export interface WordTranslations {
  en: string; ur: string; tr: string; fa: string;
  id: string; bn: string; es: string; fr: string;
  de: string; ru: string; zh: string;
}

export interface WordAnalysisEntry {
  word: string;
  translation: WordTranslations;
  pos: PosTag;
}

export type DiacriticsStatus = 'added' | 'completed' | 'validated' | 'corrected';

export interface DiacriticsChange {
  original: string;
  corrected: string;
  position: number;
  reason: string;
}

export type ContentType =
  | 'legal_ruling' | 'ethical_teaching' | 'narrative' | 'prophetic_tradition'
  | 'quranic_commentary' | 'supplication' | 'creedal' | 'eschatological'
  | 'biographical' | 'theological' | 'exhortation' | 'cosmological';

export type QuranRelationship = 'explicit' | 'thematic';

export interface RelatedQuran {
  ref: string;
  relationship: QuranRelationship;
  word_start?: number;
  word_end?: number;
}

export type NarratorRole = 'narrator' | 'companion' | 'imam' | 'author';

export type IdentityConfidence = 'definite' | 'likely' | 'ambiguous';

export interface NarratorWordRange {
  word_start: number;
  word_end: number;
}

export interface IsnadNarrator {
  name_ar: string;
  name_en: string;
  role: NarratorRole;
  position: number;
  identity_confidence: IdentityConfidence;
  ambiguity_note: string | null;
  known_identity: string | null;
  word_ranges?: NarratorWordRange[];
}

export interface IsnadMatn {
  isnad_ar: string;
  matn_ar: string;
  has_chain: boolean;
  narrators: IsnadNarrator[];
}

export interface AiTranslationEntry {
  text: string;
  summary: string;
  key_terms: Record<string, string>;
  seo_question: string;
}

export type ChunkType = 'isnad' | 'opening' | 'body' | 'quran_quote' | 'closing';

export interface Chunk {
  chunk_type: ChunkType;
  arabic_text: string;
  word_start: number;
  word_end: number;
  translations: Partial<WordTranslations>;
}

export type KeyPhraseCategory =
  | 'theological_concept' | 'well_known_saying' | 'jurisprudential_term'
  | 'quranic_echo' | 'prophetic_formula';

export interface KeyPhrase {
  phrase_ar: string;
  phrase_en: string;
  category: KeyPhraseCategory;
}

export interface SimilarContentHint {
  description: string;
  theme: string;
}

// The full AI content block attached to each verse
export interface AiContent {
  diacritized_text?: string;
  diacritics_status?: DiacriticsStatus;
  diacritics_changes?: (string | DiacriticsChange)[];
  word_analysis?: WordAnalysisEntry[];
  tags?: string[];
  content_type?: ContentType;
  related_quran?: RelatedQuran[];
  isnad_matn?: IsnadMatn;
  translations?: Partial<Record<AiLanguage, AiTranslationEntry>>;
  chunks?: Chunk[];
  topics?: string[];
  key_phrases?: KeyPhrase[];
  similar_content_hints?: SimilarContentHint[];
}
