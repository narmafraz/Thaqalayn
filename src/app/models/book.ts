import { MultiLingualText } from './text';

export interface Translation {
  name: string;
  id: string;
  lang: string;
}

export interface Crumb {
  titles: MultiLingualText;
  indexed_titles: MultiLingualText;
  path: string;
}

export interface Navigation {
  prev: Crumb;
  next: Crumb;
  up: Crumb;
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
  crumbs: Crumb[];
  nav: Navigation;
  verse_translations: Translation[];
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

export type Book = ChapterList | ChapterContent | VerseContent;

export function getVerseTranslations(book: Book): Translation[] {
  return book.data && book.kind !== 'verse_content' && book.data.verse_translations;
}

export function getChapter(book: Book): Chapter {
  return book.data && book.kind !== 'verse_content' && book.data;
}

export function getDefaultVerseTranslationIds(book: Book): Record<string, string> {
  return book.data && book.kind !== 'verse_content' && book.data.default_verse_translation_ids;
}
