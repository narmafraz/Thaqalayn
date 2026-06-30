import { AiContent } from './ai-content';
import { MultiLingualText } from './text';

export interface Translation {
  name: string;
  id: string;
  lang: string;
  source?: 'human' | 'ai';
  model?: string;
  disclaimer?: string;
}

export interface Crumb {
  titles: MultiLingualText;
  indexed_titles: MultiLingualText;
  path: string;
}

export interface Navigation {
  prev: string;
  next: string;
  up: string;
}

export interface SpecialText {
  kind: string;
  path: string;
  text: string;
}

export interface NarratorChain {
  parts: SpecialText[];
  text: string;
}

export interface Verse {
  index: number;
  local_index: number;
  path: string;
  text: string[];
  sajda_type: string;
  translations: Record<string, string[]>;
  part_type: string;
  relations: Record<string, string[]>;
  narrator_chain: NarratorChain;
  gradings?: Record<string, string> | string[];
  source_url?: string;
  ai?: AiContent;
}

export interface VerseRef {
  local_index: number;
  part_type: string;
  path?: string;       // present for Hadith/Verse
  inline?: Verse;      // present for Heading (inlined, ~43 total)
}

export interface Chapter {
  index: string;
  local_index: string;
  path: string;
  titles: MultiLingualText;
  descriptions: MultiLingualText;
  verse_count: number;
  verse_start_index: number;
  order: number;
  rukus: number;
  reveal_type: string;
  sajda_type: string;
  verses: Verse[];
  chapters: Chapter[];
  part_type: string;
  nav: Navigation;
  verse_translations: string[];
  default_verse_translation_ids: Record<string, string>;
  verse_refs?: VerseRef[];
}

export interface ChapterList {
  kind: 'chapter_list';
  index: string;
  data: Chapter;
}

export interface ChapterContent {
  kind: 'verse_list';
  index: string;
  data: Chapter;
}

export interface VerseContent {
  kind: 'verse_content';
  index: string;
  data: Verse;
}

export interface TextDiff {
  source_a: string;
  source_b: string;
  label_a: string;
  label_b: string;
  segments: DiffSegment[];
}

export interface DiffSegment {
  type: 'equal' | 'insert' | 'delete' | 'replace';
  text_a?: string;
  text_b?: string;
  text?: string;
}

export interface VerseDetailData {
  verse: Verse;
  chapter_path: string;
  chapter_title: MultiLingualText;
  nav: Navigation;
  verse_translations?: string[];
  gradings?: Record<string, string>;
  source_url?: string;
  cross_validation?: {
    status: string;
    confidence: number;
    sources: string[];
    diffs?: TextDiff[];
  };
  scholarly_notes?: string[];
}

export interface VerseDetail {
  kind: 'verse_detail';
  index: string;
  data: VerseDetailData;
}

// --- Narrator (isnad) analysis sidecar --------------------------------------
// Precomputed per chapter by the generator (`{chapter}.narrators.json`,
// kind === 'narrator_analysis'). Fetched on demand by the opt-in
// "Narrator insights" panel — nothing loads until the reader expands it.

// Narrators are referenced by id throughout; their display names live once in
// the `narrators` lookup map (id -> [en, ar]) to avoid repeating a name many
// times within a file. The component resolves ids against that map.

export interface NarratorCluster {
  size: number;
  local_indices: number[];
  shared_ids: number[];
}

/** Graph node: id + how many chains it appears in (drives node size). */
export interface NarratorFreq {
  id: number;
  count: number;
  pct?: number;
}

/** A narrator plus the local_indices of the hadith it pertains to (for links). */
export interface NarratorHadithRef {
  id: number;
  hadith: number[];
  pct?: number;
}

export interface ChainLengthStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  histogram: Record<string, number>;
}

export interface NarratorCorroboration {
  id: number;
  hadith: number[];
  independent_paths: number;
}

export interface NarratorGraphEdge {
  a: number;
  b: number;
  weight: number;
}

export interface NarratorGraph {
  nodes: NarratorFreq[];
  edges: NarratorGraphEdge[];
}

/** id (as string key) -> [name_en | null, name_ar | null] */
export type NarratorNameMap = Record<string, [string | null, string | null]>;

export interface NarratorAnalysisData {
  hadith_count: number;
  analyzed_count: number;
  no_chain_count: number;
  ai_coverage: number;
  cluster_basis: string;
  independent_paths: number;
  clusters: NarratorCluster[];
  prolific: NarratorHadithRef[];
  spine: NarratorHadithRef[];
  sources: NarratorHadithRef[];
  chain_lengths: ChainLengthStats | Record<string, never>;
  gradings: Record<string, Record<string, number[]>>;
  corroboration: NarratorCorroboration[];
  ambiguity: { chains_with_ambiguous: number; narrators: NarratorHadithRef[] };
  graph: NarratorGraph;
  narrators: NarratorNameMap;
}

export interface NarratorAnalysis {
  kind: 'narrator_analysis';
  index: string;
  data: NarratorAnalysisData;
}

export type Book = ChapterList | ChapterContent | VerseContent | VerseDetail;

export function getVerseTranslations(book: Book): string[] {
  if (!book || !book.data) return undefined;
  if (book.kind === 'chapter_list' || book.kind === 'verse_list') {
    return book.data.verse_translations;
  }
  if (book.kind === 'verse_detail') {
    if (book.data.verse_translations) {
      return book.data.verse_translations;
    }
    if (book.data.verse && book.data.verse.translations) {
      return Object.keys(book.data.verse.translations);
    }
  }
  return undefined;
}

export function getChapter(book: Book): Chapter {
  return book && book.data && (book.kind === 'chapter_list' || book.kind === 'verse_list') && book.data;
}

export function getDefaultVerseTranslationIds(book: Book): Record<string, string> {
  return book && book.data && (book.kind === 'chapter_list' || book.kind === 'verse_list') && book.data.default_verse_translation_ids;
}
