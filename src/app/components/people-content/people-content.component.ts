import { KeyValue } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ChainVerses, Narrator } from '@app/models';
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
  @Select(BooksState.getNarratorIndex) narratorIndex$: Observable<Record<number, string>>;

  sortBy(lst) {
    return [...lst].sort((a, b) => a > b ? 1 : a === b ? 0 : -1);
  }

  sortByNumberOfNarrators = (a: KeyValue<string, ChainVerses>, b: KeyValue<string, ChainVerses>): number => {
    const an = a.value.narrator_ids ? a.value.narrator_ids.length : 0;
    const bn = b.value.narrator_ids ? b.value.narrator_ids.length : 0;
    return (an > bn) ? 1 : (bn > an ? -1 : 0);
  }

}
