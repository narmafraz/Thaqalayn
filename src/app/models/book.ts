
export interface BookTitle {
  kind: 'title';
  index: string;
  data: BookTitleData;
}

export interface BookTitleData {
  chapters: {
    index: string,
    names: {
      en: string,
      ar: string
    }
  }[];
}

export type Book = BookTitle;
