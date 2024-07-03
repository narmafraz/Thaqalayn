import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { KeyValue } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { ChainVerses, Narrator, NarratorMetadata } from '@app/models';
import { Store } from '@ngxs/store';
import { PeopleState } from '@store/people/people.state';
import { Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-people-content',
  templateUrl: './people-content.component.html',
  styleUrls: ['./people-content.component.scss']
})
export class PeopleContentComponent implements OnInit {
  narrator$: Observable<Narrator> = inject(Store).select(PeopleState.getCurrentNavigatedNarrator);
  narratorIndex$: Observable<Record<number, NarratorMetadata>> = inject(Store).select(PeopleState.getEnrichedNarratorIndex);

  versePathsDataSource: MatTableDataSource<any> = new MatTableDataSource();
  subchainsDataSource: MatTableDataSource<KeyValue<string, ChainVerses>> = new MatTableDataSource();
  displayedColumnsPaths = ['path'];
  displayedColumnsSubchains = ['subchain'];

  @ViewChild('versePathsViewport') versePathsViewport: CdkVirtualScrollViewport;
  @ViewChild('subchainsViewport') subchainsViewport: CdkVirtualScrollViewport;

  ngOnInit() {
    this.narrator$.subscribe(narrator => {
      if (narrator) {
        this.versePathsDataSource.data = this.sortBy(narrator.verse_paths).map(path => ({ path }));
        const subchainsData = Object.entries(narrator.subchains).map(([key, value]) => ({ key, value })).sort(this.sortByNumberOfNarrators);
        console.log('Subchains Data:', subchainsData); // Log the data
        this.subchainsDataSource.data = subchainsData;
      }
    });
  }
  applyFilter(event: Event, dataSource: MatTableDataSource<any>) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    dataSource.filter = filterValue;
  }

  sortBy(lst: any[]) {
    return [...lst].sort((a, b) => (a > b ? 1 : a === b ? 0 : -1));
  }

  sortByNumberOfNarrators = (a: KeyValue<string, ChainVerses>, b: KeyValue<string, ChainVerses>): number => {
    const an = a.value.narrator_ids ? a.value.narrator_ids.length : 0;
    const bn = b.value.narrator_ids ? b.value.narrator_ids.length : 0;
    return an > bn ? 1 : bn > an ? -1 : 0;
  };

  getni(subchain) {
    console.log('getni', subchain);
    return subchain.value.narrator_ids;
  }
  getit(e) {
    console.log('getit', e);
    return e;
  }
}
