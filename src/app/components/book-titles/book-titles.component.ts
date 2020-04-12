import { Component, OnInit } from '@angular/core';
import { BookTitle } from '@app/models/book';

@Component({
  selector: 'app-book-titles',
  templateUrl: './book-titles.component.html',
  styleUrls: ['./book-titles.component.scss']
})
export class BookTitlesComponent implements OnInit {

  public books: BookTitle[];

  constructor() { }

  ngOnInit(): void {
  }

}
