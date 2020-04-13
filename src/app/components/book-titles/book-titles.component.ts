import { Component, OnInit } from '@angular/core';
import { BookTitle } from '@app/models/book';
import { Select } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-book-titles',
  templateUrl: './book-titles.component.html',
  styleUrls: ['./book-titles.component.scss']
})
export class BookTitlesComponent implements OnInit {

  @Select(BooksState.getTitles) books: Observable<BookTitle[]>;

  constructor() { }

  ngOnInit(): void {
  }

}
