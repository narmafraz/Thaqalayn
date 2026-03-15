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
  gradings?: string[];
  ai?: AiContent;
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
