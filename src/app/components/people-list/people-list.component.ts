import { KeyValue } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Select } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-people-list',
  templateUrl: './people-list.component.html',
  styleUrls: ['./people-list.component.scss']
})
export class PeopleListComponent {

  @Select(BooksState.getNarratorIndex) narrators$: Observable<Record<number, string>>;

  keyAscOrder = (a: KeyValue<number, string>, b: KeyValue<number, string>): number => {
    const an = +a.key;
    const bn = +b.key;
    return an > bn ? 1 : (bn > an ? -1 : 0);
  }

  nameOrder = (a: KeyValue<number, string>, b: KeyValue<number, string>): number => {
    return a.value.localeCompare(b.value);
  }
}
