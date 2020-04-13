
export interface BookTitle {
  kind: 'title';
  index: string;
  data: BookTitleData;
}

export interface BookTitleData {
  titles: {
    en: string,
    ar: string
  };
}

export type Book = BookTitle;
