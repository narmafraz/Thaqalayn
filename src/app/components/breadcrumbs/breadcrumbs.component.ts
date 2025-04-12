import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Book, Narrator } from '@app/models';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { PeopleState } from '@store/people/people.state';
import { Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-breadcrumbs',
  templateUrl: './breadcrumbs.component.html',
  styleUrls: ['./breadcrumbs.component.scss']
})
export class BreadcrumbsComponent {
  book$: Observable<Book> = inject(Store).select(BooksState.getCurrentNavigatedPart);
  narrator$: Observable<Narrator> = inject(Store).select(PeopleState.getCurrentNavigatedNarrator);

  constructor(private store: Store) {
  }
}
