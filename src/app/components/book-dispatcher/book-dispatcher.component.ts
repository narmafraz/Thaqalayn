import { Component, OnInit } from '@angular/core';
import { Book } from '@app/models';
import { Select } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-book-dispatcher',
  templateUrl: './book-dispatcher.component.html',
  styleUrls: ['./book-dispatcher.component.scss']
})
export class BookDispatcherComponent implements OnInit {

  @Select(BooksState.getParts) books: Observable<{ [index: string]: Book }>;

  constructor() { }

  ngOnInit(): void {
  }

}
