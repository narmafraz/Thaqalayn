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
  index: number;
  path: string;
  names: {
    en: string,
    ar: string
  };
  verse_count: number;
  verse_start_index: number;
  order: number;
  rukus: number;
  verse_type: string;
  sajda_type: string;
}

export interface ChapterList {
  kind: 'title';
  index: string;
  data: ChapterListData;
}

export interface ChapterListData {
  titles: MultiLingualText;
  descriptions: MultiLingualText;
  chapters: Chapter[];
}

export type Book = ChapterList;
