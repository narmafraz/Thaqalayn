import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Narrator } from '@app/models';
import { Select } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-people-content',
  templateUrl: './people-content.component.html',
  styleUrls: ['./people-content.component.scss']
})
export class PeopleContentComponent {

  @Select(BooksState.getCurrentNavigatedNarrator) narrator$: Observable<Narrator>;

  sortBy(lst) {
    return [...lst].sort((a, b) => a > b ? 1 : a === b ? 0 : -1);
  }

}
