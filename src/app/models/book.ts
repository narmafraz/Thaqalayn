import { MultiLingualText } from './text';

export interface Translation {
  name: string;
  text: string;
  lang: string;
}

export interface Verse {
  index: number;
  path: string;
  text: string;
  sajda_type: string;
  translations: Translation[];
}

export interface Chapter {
  index: string;
  path: string;
  titles: {
    en: string,
    ar: string
  };
  descriptions: {
    en: string,
    ar: string
  };
  verse_count: number;
  verse_start_index: number;
  order: number;
  rukus: number;
  verse_type: string;
  sajda_type: string;
  verses: Verse[];
  chapters: Chapter[];
}

export interface ChapterList {
  kind: 'chapter_list';
  index: string;
  data: ChapterListData;
}

export interface ChapterListData {
  titles: MultiLingualText;
  descriptions: MultiLingualText;
  chapters: Chapter[];
}

export interface ChapterContent {
  kind: 'verse_list';
  index: string;
  data: Chapter;
}

export type Book = ChapterList;
