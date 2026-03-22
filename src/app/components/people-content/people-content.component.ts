import { KeyValue } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, OnDestroy } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { BOOK_DISPLAY_NAMES, ChainVerses, Narrator, NarratorMetadata } from '@app/models';
import { Store } from '@ngxs/store';
import { PeopleState } from '@store/people/people.state';
import { RetryLoadNarrator } from '@store/people/people.actions';
import { IndexState, IndexedTitles } from '@store/index/index.state';
import { RouterState } from '@store/router/router.state';
import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs/operators';
import { IMAM_IDS } from '../people-list/people-list.component';

export interface ConarratorSummary {
  id: number;
  name: string;
  count: number;
}

export interface DirectionalNarrator {
  id: number;
  nameAr: string;
  nameEn: string;
  hadithCount: number;
  percentage: number;
}

export interface BookDistribution {
  book: string;
  displayName: string;
  count: number;
  percentage: number;
}

export interface HadithPreviewInfo {
  path: string;
  bookId: string;
  bookName: string;
  chapterTitle: string;
  hadithNumber: string;
  volumeLabel: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-people-content',
    templateUrl: './people-content.component.html',
    styleUrls: ['./people-content.component.scss'],
    standalone: false
})
export class PeopleContentComponent implements OnInit, OnDestroy {
  narrator$: Observable<Narrator> = inject(Store).select(PeopleState.getCurrentNavigatedNarrator);
  narratorIndex$: Observable<Record<number, NarratorMetadata>> = inject(Store).select(PeopleState.getEnrichedNarratorIndex);
  loading$: Observable<boolean> = inject(Store).select(PeopleState.getCurrentLoading);
  error$: Observable<string> = inject(Store).select(PeopleState.getCurrentError);

  private store = inject(Store);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  // All paths data
  private allPaths: { path: string }[] = [];
  filteredPaths: { path: string }[] = [];
  paginatedPaths: { path: string }[] = [];
  paginatedPreviews: HadithPreviewInfo[] = [];
  pathsPageSize = 50;
  pathsPage = 0;

  // Index data for preview cards
  private enIndex: IndexedTitles | null = null;

  // All subchains data
  private allSubchains: KeyValue<string, ChainVerses>[] = [];
  filteredSubchains: KeyValue<string, ChainVerses>[] = [];
  paginatedSubchains: KeyValue<string, ChainVerses>[] = [];
  subchainsPageSize = 10;
  subchainsPage = 0;

  // Expansion tracking for subchain verse paths
  expandedSubchains = new Set<string>();

  // Top co-narrators (NAR-04)
  topConarrators: ConarratorSummary[] = [];
  uniqueConarratorCount = 0;
  showAllConarrators = false;

  // Stats summary (NAR-02)
  totalNarrations = 0;
  bookCount = 0;
  bookDistribution: BookDistribution[] = [];

  // Profile hero
  isImam = false;
  monogramLetter = '';
  narratedFromCount = 0;
  narratedToCount = 0;

  // Directional transmission analysis
  narratedFromList: DirectionalNarrator[] = [];
  narratedToList: DirectionalNarrator[] = [];
  showAllNarratedFrom = false;
  showAllNarratedTo = false;

  // Filter
  private pathsFilterSubject = new Subject<string>();
  private subchainsFilterSubject = new Subject<string>();
  private narratorIndex: Record<number, NarratorMetadata> = {};
  private currentNarratorIndex: string = '';

  ngOnInit() {
    // Load narrator index for filtering
    this.narratorIndex$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(index => {
      this.narratorIndex = index || {};
    });

    // Load book index for hadith preview cards
    this.store.select(IndexState.getBookForLanguage).pipe(
      takeUntil(this.destroy$)
    ).subscribe(getBookForLanguage => {
      this.enIndex = getBookForLanguage('en') || null;
      this.updatePaginatedPreviews();
      this.cdr.markForCheck();
    });

    // Setup paths filter
    this.pathsFilterSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(filterValue => {
      this.pathsPage = 0;
      if (!filterValue) {
        this.filteredPaths = this.allPaths;
      } else {
        const lower = filterValue.toLowerCase();
        this.filteredPaths = this.allPaths.filter(item =>
          item.path.toLowerCase().includes(lower)
        );
      }
      this.updatePaginatedPaths();
      this.cdr.markForCheck();
    });

    // Setup subchains filter with Arabic support
    this.subchainsFilterSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(filterValue => {
      this.subchainsPage = 0;
      if (!filterValue) {
        this.filteredSubchains = this.allSubchains;
      } else {
        const normalizedFilter = this.normalizeArabic(filterValue);
        this.filteredSubchains = this.allSubchains.filter(data => {
          const normalizedKey = this.normalizeArabic(data.key);
          if (normalizedKey.includes(normalizedFilter)) {
            return true;
          }
          return (data.value.narrator_ids || []).some(id => {
            const narrator = this.narratorIndex[id];
            return narrator ? this.normalizeArabic(narrator.titles.ar).includes(normalizedFilter) : false;
          });
        });
      }
      this.updatePaginatedSubchains();
      this.cdr.markForCheck();
    });

    // Handle narrator data loading
    this.narrator$.pipe(
      filter(narrator => !!narrator),
      takeUntil(this.destroy$)
    ).subscribe(narrator => {
      this.currentNarratorIndex = narrator.index;

      // Compute hero properties
      this.isImam = +narrator.index in IMAM_IDS;
      this.monogramLetter = this.getMonogramLetter(narrator.titles?.ar || '');
      const meta = this.narratorIndex[+narrator.index];
      this.narratedFromCount = meta?.narrated_from || 0;
      this.narratedToCount = meta?.narrated_to || 0;

      // Process verse paths
      if (narrator.verse_paths) {
        this.allPaths = this.sortBy(narrator.verse_paths).map(path => ({ path }));
      } else {
        this.allPaths = [];
      }
      this.filteredPaths = this.allPaths;
      this.pathsPage = 0;
      this.updatePaginatedPaths();

      // Compute stats summary (NAR-02)
      this.computeStats(narrator);

      // Process subchains
      if (narrator.subchains) {
        this.allSubchains = Object.entries(narrator.subchains)
          .map(([key, value]) => ({ key, value }))
          .sort((a, b) => {
            const an = a.value.narrator_ids ? a.value.narrator_ids.length : 0;
            const bn = b.value.narrator_ids ? b.value.narrator_ids.length : 0;
            return bn - an;
          });

        // Compute top co-narrators (NAR-04)
        this.computeTopConarrators(narrator);

        // Compute directional transmission analysis
        this.computeDirectionalNarrators(narrator);
      } else {
        this.allSubchains = [];
        this.topConarrators = [];
        this.uniqueConarratorCount = 0;
        this.narratedFromList = [];
        this.narratedToList = [];
      }
      this.filteredSubchains = this.allSubchains;
      this.subchainsPage = 0;
      this.showAllConarrators = false;
      this.showAllNarratedFrom = false;
      this.showAllNarratedTo = false;
      this.expandedSubchains.clear();
      this.updatePaginatedSubchains();

      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyPathsFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim();
    this.pathsFilterSubject.next(filterValue);
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim();
    this.subchainsFilterSubject.next(filterValue);
  }

  onPathsPageChange(event: PageEvent) {
    this.pathsPage = event.pageIndex;
    this.pathsPageSize = event.pageSize;
    this.updatePaginatedPaths();
  }

  onSubchainsPageChange(event: PageEvent) {
    this.subchainsPage = event.pageIndex;
    this.subchainsPageSize = event.pageSize;
    this.updatePaginatedSubchains();
  }

  getVisiblePaths(element: KeyValue<string, ChainVerses>): string[] {
    if (!element.value.verse_paths) return [];
    if (this.expandedSubchains.has(element.key)) {
      return element.value.verse_paths;
    }
    return element.value.verse_paths.slice(0, 3);
  }

  toggleExpandSubchain(key: string) {
    if (this.expandedSubchains.has(key)) {
      this.expandedSubchains.delete(key);
    } else {
      this.expandedSubchains.add(key);
    }
  }

  isExpanded(key: string): boolean {
    return this.expandedSubchains.has(key);
  }

  sortVersePathsByLength() {
    this.allPaths = [...this.allPaths].sort((a, b) => a.path.length - b.path.length);
    this.filteredPaths = this.allPaths;
    this.pathsPage = 0;
    this.updatePaginatedPaths();
  }

  onRetry(): void {
    const index = this.store.selectSnapshot(RouterState.getBookPartIndex) || 'people';
    this.store.dispatch(new RetryLoadNarrator(index));
  }

  private updatePaginatedPaths() {
    const start = this.pathsPage * this.pathsPageSize;
    this.paginatedPaths = this.filteredPaths.slice(start, start + this.pathsPageSize);
    this.updatePaginatedPreviews();
  }

  private updatePaginatedPreviews() {
    this.paginatedPreviews = this.paginatedPaths.map(item => this.buildPreviewInfo(item.path));
  }

  /** Build preview info for a single verse path using IndexState data */
  private buildPreviewInfo(path: string): HadithPreviewInfo {
    const raw = path.startsWith('/books/') ? path.slice(7) : path;
    const parts = raw.split(':');
    const bookId = parts[0];
    const bookName = BOOK_DISPLAY_NAMES[bookId] || this.titleCase(bookId);
    const hadithNumber = parts.length > 1 ? parts[parts.length - 1] : '';

    // Build parent chapter path by stripping the last segment (hadith number)
    const lastColon = path.lastIndexOf(':');
    const chapterPath = lastColon > 0 ? path.substring(0, lastColon) : path;

    // Look up chapter title from IndexState
    let chapterTitle = '';
    if (this.enIndex && this.enIndex[chapterPath]) {
      chapterTitle = this.enIndex[chapterPath].title || '';
    }

    // Build volume label from segments
    const volumeLabel = this.buildVolumeLabel(bookId, parts.slice(1, -1));

    return { path, bookId, bookName, chapterTitle, hadithNumber, volumeLabel };
  }

  private buildVolumeLabel(bookId: string, segments: string[]): string {
    if (!segments.length) return '';
    if (bookId === 'quran') {
      return segments.length >= 1 ? `Surah ${segments[0]}` : '';
    }
    if (bookId === 'al-kafi') {
      const labels = ['Vol.', 'Book', 'Ch.'];
      return segments.map((s, i) => `${labels[i] || ''} ${s}`).join(', ');
    }
    // Generic: just number the segments
    return segments.join(':');
  }

  /** Split path on last colon for routerLink + fragment navigation */
  splitOnLastColon(path: string): string[] {
    const index = path.lastIndexOf(':');
    if (index < 0) return [path, ''];
    return [path.slice(0, index), path.slice(index + 1)];
  }

  private titleCase(str: string): string {
    return str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private updatePaginatedSubchains() {
    const start = this.subchainsPage * this.subchainsPageSize;
    this.paginatedSubchains = this.filteredSubchains.slice(start, start + this.subchainsPageSize);
  }

  private sortBy(lst: string[]) {
    return [...lst].sort((a, b) => (a > b ? 1 : a === b ? 0 : -1));
  }

  private normalizeArabic(text: string): string {
    if (!text) return '';
    return text
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8]/g, '')
      .replace(/[إأآا]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[يى]/g, 'ي')
      .toLowerCase()
      .trim();
  }

  /** Compute top co-narrators from subchains (NAR-04) */
  private computeTopConarrators(narrator: Narrator): void {
    const currentId = parseInt(narrator.index, 10);
    const conarratorCounts = new Map<number, number>();

    if (narrator.subchains) {
      for (const chain of Object.values(narrator.subchains)) {
        if (!chain.narrator_ids) continue;
        const verseCount = chain.verse_paths ? chain.verse_paths.length : 0;
        for (const id of chain.narrator_ids) {
          if (id === currentId) continue;
          conarratorCounts.set(id, (conarratorCounts.get(id) || 0) + verseCount);
        }
      }
    }

    this.uniqueConarratorCount = conarratorCounts.size;

    const sorted = Array.from(conarratorCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    this.topConarrators = sorted.slice(0, 10).map(([id, count]) => ({
      id,
      name: this.narratorIndex[id]?.titles?.ar || String(id),
      count
    }));
  }

  /** Compute stats summary from verse_paths (NAR-02) */
  private computeStats(narrator: Narrator): void {
    const paths = narrator.verse_paths || [];
    this.totalNarrations = paths.length;

    const bookCounts = new Map<string, number>();
    for (const path of paths) {
      // path format: /books/al-kafi:1:2:3:4
      const match = path.match(/^\/books\/([^:]+)/);
      if (match) {
        const book = match[1];
        bookCounts.set(book, (bookCounts.get(book) || 0) + 1);
      }
    }

    this.bookCount = bookCounts.size;
    const maxCount = Math.max(...Array.from(bookCounts.values()), 1);

    this.bookDistribution = Array.from(bookCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([book, count]) => ({
        book,
        displayName: BOOK_DISPLAY_NAMES[book] || book,
        count,
        percentage: (count / maxCount) * 100
      }));
  }

  /** Compute directional narrated-from and narrated-to lists from 2-narrator subchains */
  private computeDirectionalNarrators(narrator: Narrator): void {
    const currentId = parseInt(narrator.index, 10);
    const fromCounts = new Map<number, number>(); // people this narrator received from
    const toCounts = new Map<number, number>();   // people this narrator transmitted to

    if (narrator.subchains) {
      for (const chain of Object.values(narrator.subchains)) {
        if (!chain.narrator_ids || chain.narrator_ids.length !== 2) continue;
        const verseCount = chain.verse_paths ? chain.verse_paths.length : 0;
        const [first, second] = chain.narrator_ids;

        if (second === currentId && first !== currentId) {
          // [source, currentNarrator] → narrator received FROM source
          fromCounts.set(first, (fromCounts.get(first) || 0) + verseCount);
        }
        if (first === currentId && second !== currentId) {
          // [currentNarrator, receiver] → narrator transmitted TO receiver
          toCounts.set(second, (toCounts.get(second) || 0) + verseCount);
        }
      }
    }

    this.narratedFromList = this.buildDirectionalList(fromCounts);
    this.narratedToList = this.buildDirectionalList(toCounts);
  }

  private buildDirectionalList(counts: Map<number, number>): DirectionalNarrator[] {
    const totalHadiths = Array.from(counts.values()).reduce((sum, c) => sum + c, 0);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, hadithCount]) => ({
        id,
        nameAr: this.narratorIndex[id]?.titles?.ar || String(id),
        nameEn: this.narratorIndex[id]?.titles?.en || '',
        hadithCount,
        percentage: totalHadiths > 0 ? Math.round((hadithCount / totalHadiths) * 100) : 0
      }));
  }

  /** Extract first Arabic letter for geometric monogram */
  private getMonogramLetter(arabicName: string): string {
    if (!arabicName) return '';
    // Strip diacritics to get base letter
    const stripped = arabicName.replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, '');
    // Find first actual Arabic letter (skip spaces, parentheses, etc.)
    const match = stripped.match(/[\u0621-\u064A]/);
    return match ? match[0] : stripped.charAt(0);
  }
}
