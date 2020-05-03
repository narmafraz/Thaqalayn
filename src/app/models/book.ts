import { MultiLingualText } from './text';

export interface Chapter {
  index: string;
  names: {
    en: string,
    ar: string
  };
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
