import { KeyValue } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ChainVerses, Narrator, NarratorMetadata } from '@app/models';
import { Select } from '@ngxs/store';
import { PeopleState } from '@store/people/people.state';
import { Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-people-content',
  templateUrl: './people-content.component.html',
  styleUrls: ['./people-content.component.scss']
})
export class PeopleContentComponent {

  @Select(PeopleState.getCurrentNavigatedNarrator) narrator$: Observable<Narrator>;
  @Select(PeopleState.getEnrichedNarratorIndex) narratorIndex$: Observable<Record<number, NarratorMetadata>>;

  sortBy(lst) {
    return [...lst].sort((a, b) => a > b ? 1 : a === b ? 0 : -1);
  }

  sortByNumberOfNarrators = (a: KeyValue<string, ChainVerses>, b: KeyValue<string, ChainVerses>): number => {
    const an = a.value.narrator_ids ? a.value.narrator_ids.length : 0;
    const bn = b.value.narrator_ids ? b.value.narrator_ids.length : 0;
    return (an > bn) ? 1 : (bn > an ? -1 : 0);
  }

}
