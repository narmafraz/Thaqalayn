import { MultiLingualText } from './text';

export interface Translation {
  name: string;
  text: string;
  lang: string;
}

export interface Crumb {
  titles: MultiLingualText;
  indexed_titles: MultiLingualText;
  path: string;
}

export interface Verse {
  index: number;
  local_index: number;
  path: string;
  text: string;
  sajda_type: string;
  translations: Translation[];
  part_type: string;
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
  verse_type: string;
  sajda_type: string;
  verses: Verse[];
  chapters: Chapter[];
  part_type: string;
  crumbs: Crumb[];
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

export type Book = ChapterList;
