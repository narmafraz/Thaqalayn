import { Component } from '@angular/core';
import { Book } from '@app/models';
import { Select } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Thaqalayn';
  @Select(BooksState.getCurrentNavigatedPart) book$: Observable<Book>;
}
