import { MultiLingualText } from './text';

export interface Chapter {
  index: string;
  names: {
    en: string,
    ar: string
  };
  verseCount: number;
  verseStartIndex: number;
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
