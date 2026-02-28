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
  summary: string;
  key_terms: Record<string, string>;
  seo_question: string;
}

export type ChunkType = 'isnad' | 'opening' | 'body' | 'quran_quote' | 'closing';

export interface Chunk {
  chunk_type: ChunkType;
  arabic_text?: string;
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
  ai_attribution?: {
    model: string;
    generated_date: string;
    pipeline_version: string;
  };
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
  summaries?: Partial<Record<AiLanguage, string>>;
  key_terms?: Partial<Record<AiLanguage, Record<string, string>>>;
  seo_questions?: Partial<Record<AiLanguage, string>>;
}

/** Reconstruct full AI translation text for a language by concatenating chunk translations. */
export function getAiTranslationText(ai: AiContent, lang: AiLanguage): string[] | undefined {
  if (!ai?.chunks) return undefined;
  const parts = ai.chunks
    .map(c => c.translations?.[lang])
    .filter((t): t is string => !!t);
  return parts.length > 0 ? [parts.join(' ')] : undefined;
}

/** Check if a translation ID is an AI translation (e.g., "en.ai"). */
export function isAiTranslation(translationId: string): boolean {
  return translationId?.endsWith('.ai') ?? false;
}

/** Extract language code from AI translation ID (e.g., "en.ai" → "en"). */
export function getAiLang(translationId: string): AiLanguage | undefined {
  if (!isAiTranslation(translationId)) return undefined;
  return translationId.replace('.ai', '') as AiLanguage;
}
