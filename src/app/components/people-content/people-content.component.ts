import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { KeyValue } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { ChainVerses, Narrator, NarratorMetadata } from '@app/models';
import { Store } from '@ngxs/store';
import { PeopleState } from '@store/people/people.state';
import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-people-content',
  templateUrl: './people-content.component.html',
  styleUrls: ['./people-content.component.scss']
})
export class PeopleContentComponent implements OnInit, AfterViewInit {
  narrator$: Observable<Narrator> = inject(Store).select(PeopleState.getCurrentNavigatedNarrator);
  narratorIndex$: Observable<Record<number, NarratorMetadata>> = inject(Store).select(PeopleState.getEnrichedNarratorIndex);

  versePathsDataSource: MatTableDataSource<any> = new MatTableDataSource();
  subchainsDataSource: MatTableDataSource<KeyValue<string, ChainVerses>> = new MatTableDataSource();
  displayedColumnsPaths = ['path'];
  displayedColumnsSubchains = ['subchain'];

  private filterSubject = new Subject<string>();

  // Pagination settings
  pageSize = 10;
  currentPage = 0;
  paginatedSubchains: KeyValue<string, ChainVerses>[] = [];

  // Virtual scrolling settings
  batchSize = 20;
  displayedSubchains: KeyValue<string, ChainVerses>[] = [];

  @ViewChild('versePathsViewport') versePathsViewport: CdkVirtualScrollViewport;
  @ViewChild('subchainsViewport') subchainsViewport: CdkVirtualScrollViewport;

  ngAfterViewInit() {
    // Adjust buffer size for virtual scrolling
    this.subchainsViewport.setRenderedRange({ start: 0, end: 50 });
    this.subchainsViewport.checkViewportSize();
  }

  ngOnInit() {
    // Setup advanced filtering with Arabic support
    this.filterSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(filterValue => {
      this.subchainsDataSource.filterPredicate = (data: any, filter: string) => {
        if (!filter) return true;

        // Normalize Arabic text for better matching
        const normalizeArabic = (text: string) => {
          if (!text) return '';
          return text
            // Remove diacritics
            .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8]/g, '')
            // Normalize Alif variants
            .replace(/[إأآا]/g, 'ا')
            // Normalize Ta Marbuta
            .replace(/ة/g, 'ه')
            // Normalize Ya and Alif Maksura
            .replace(/[يى]/g, 'ي')
            .toLowerCase()
            .trim();
        };

        const normalizedFilter = normalizeArabic(filter);
        const normalizedKey = normalizeArabic(data.key);

        // Check if the filter matches the key
        if (normalizedKey.includes(normalizedFilter)) {
          return true;
        }

        // Check if the filter matches any narrator names in the chain
        return (data.value.narrator_ids || []).some(id => {
          const narratorIndex = (this.subchainsDataSource as any)._narratorIndex || {};
          const narrator = narratorIndex[id];
          return narrator ? normalizeArabic(narrator.titles.ar).includes(normalizedFilter) : false;
        });
      };

      this.subchainsDataSource.filter = filterValue;
    });

    // Handle narrator data loading and processing
    this.narrator$.pipe(
      filter(narrator => !!narrator),
      map(narrator => {
        // Pre-process and memoize subchains data
        return Object.entries(narrator.subchains)
          .map(([key, value]) => ({
            key,
            value,
            narratorCount: value.narrator_ids ? value.narrator_ids.length : 0
          }))
          .sort((a, b) => b.narratorCount - a.narratorCount);
      })
    ).subscribe(processedSubchains => {
      // Update both data sources
      this.subchainsDataSource.data = processedSubchains;
      this.updatePaginatedSubchains(processedSubchains);

      // Initialize displayed subchains for virtual scrolling
      this.displayedSubchains = processedSubchains.slice(0, this.batchSize);

      // Store narrator index for filtering
      (this.subchainsDataSource as any)._narratorIndex = {};
      this.narratorIndex$.subscribe(index => {
        (this.subchainsDataSource as any)._narratorIndex = index;
      });
    });

    // Handle verse paths
    this.narrator$.subscribe(narrator => {
      if (narrator) {
        this.versePathsDataSource.data = this.sortBy(narrator.verse_paths).map(path => ({ path }));
      }
    });
  }

  applyFilter(event: Event, dataSource: MatTableDataSource<any>) {
    const filterValue = (event.target as HTMLInputElement).value.trim();
    this.filterSubject.next(filterValue);
  }

  updatePaginatedSubchains(allSubchains: KeyValue<string, ChainVerses>[]) {
    this.paginatedSubchains = allSubchains.slice(
      this.currentPage * this.pageSize,
      (this.currentPage + 1) * this.pageSize
    );
  }

  loadNextPage() {
    this.currentPage++;
    this.updatePaginatedSubchains(this.subchainsDataSource.data);
  }

  onScroll() {
    const currentLength = this.displayedSubchains.length;
    const nextBatch = this.subchainsDataSource.data.slice(
      currentLength,
      currentLength + this.batchSize
    );
    this.displayedSubchains = [...this.displayedSubchains, ...nextBatch];
  }

  sortBy(lst: any[]) {
    return [...lst].sort((a, b) => (a > b ? 1 : a === b ? 0 : -1));
  }

  sortByNumberOfNarrators = (a: KeyValue<string, ChainVerses>, b: KeyValue<string, ChainVerses>): number => {
    const an = a.value.narrator_ids ? a.value.narrator_ids.length : 0;
    const bn = b.value.narrator_ids ? b.value.narrator_ids.length : 0;
    return bn - an; // Sort in descending order
  };

  sortVersePathsByLength() {
    this.versePathsDataSource.data = this.versePathsDataSource.data.sort((a, b) => a.path.length - b.path.length);
  }
}
