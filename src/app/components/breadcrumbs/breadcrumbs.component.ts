import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Book, Narrator } from '@app/models';
import { Select } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-breadcrumbs',
  templateUrl: './breadcrumbs.component.html',
  styleUrls: ['./breadcrumbs.component.scss']
})
export class BreadcrumbsComponent {
  @Select(BooksState.getCurrentNavigatedPart) book$: Observable<Book>;
  @Select(BooksState.getCurrentNavigatedNarrator) narrator$: Observable<Narrator>;
}
