import { MultiLingualText } from './text';

export interface ChapterList {
  kind: 'title';
  index: string;
  data: ChapterListData;
}

export interface ChapterListData {
  titles: MultiLingualText;
  descriptions: MultiLingualText;
  chapters: {
    index: string,
    names: {
      en: string,
      ar: string
    }
  }[];
}

export type Book = ChapterList;
