
export interface BookTitle {
  type: 'title';
  index: string;
  title: string;
}

type Book = BookTitle;
