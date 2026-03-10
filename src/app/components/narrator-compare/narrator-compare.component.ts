import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BOOK_DISPLAY_NAMES, Narrator, NarratorMetadata } from '@app/models';
import { Store } from '@ngxs/store';
import { PeopleState } from '@store/people/people.state';
import { LoadNarrator } from '@store/people/people.actions';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface BookDistribution {
  book: string;
  displayName: string;
  count: number;
  percentage: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-narrator-compare',
  templateUrl: './narrator-compare.component.html',
  styleUrls: ['./narrator-compare.component.scss'],
  standalone: false
})
export class NarratorCompareComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  searchA = '';
  searchB = '';
  filteredNarratorsA: NarratorMetadata[] = [];
  filteredNarratorsB: NarratorMetadata[] = [];

  narratorA: Narrator | undefined;
  narratorB: Narrator | undefined;

  indexA: string | undefined;
  indexB: string | undefined;

  bookDistributionA: BookDistribution[] = [];
  bookDistributionB: BookDistribution[] = [];

  sharedNarrations: string[] = [];
  showAllShared = false;

  private allNarrators: NarratorMetadata[] = [];

  ngOnInit() {
    // Subscribe to the narrator index to populate autocomplete
    this.store.select(PeopleState.getEnrichedNarratorsList).pipe(
      takeUntil(this.destroy$)
    ).subscribe(narrators => {
      this.allNarrators = narrators || [];
      this.cdr.markForCheck();
    });

    // Load narrator index if not loaded
    this.store.dispatch(new LoadNarrator('people'));

    // Subscribe to getNarratorByIndex to reactively get narrator data
    this.store.select(PeopleState.getNarratorByIndex).pipe(
      takeUntil(this.destroy$)
    ).subscribe(getNarrator => {
      if (!getNarrator) return;

      let changed = false;

      if (this.indexA) {
        const wrapperA = getNarrator(this.indexA);
        const newA = wrapperA && wrapperA.kind === 'person_content' ? wrapperA.data as Narrator : undefined;
        if (newA !== this.narratorA) {
          this.narratorA = newA;
          if (newA) {
            this.bookDistributionA = this.computeBookDistribution(newA);
          }
          changed = true;
        }
      }

      if (this.indexB) {
        const wrapperB = getNarrator(this.indexB);
        const newB = wrapperB && wrapperB.kind === 'person_content' ? wrapperB.data as Narrator : undefined;
        if (newB !== this.narratorB) {
          this.narratorB = newB;
          if (newB) {
            this.bookDistributionB = this.computeBookDistribution(newB);
          }
          changed = true;
        }
      }

      if (changed) {
        this.computeSharedNarrations();
        this.cdr.markForCheck();
      }
    });

    // Read query params and load narrators
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      if (params['a'] && params['a'] !== this.indexA) {
        this.indexA = params['a'];
        this.store.dispatch(new LoadNarrator(this.indexA));
      }
      if (params['b'] && params['b'] !== this.indexB) {
        this.indexB = params['b'];
        this.store.dispatch(new LoadNarrator(this.indexB));
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  filterNarrators(query: string, side: 'a' | 'b') {
    if (!query || query.length < 1) {
      if (side === 'a') this.filteredNarratorsA = [];
      else this.filteredNarratorsB = [];
      return;
    }
    const normalizedQuery = this.normalizeArabic(query.toLowerCase());
    const filtered = this.allNarrators.filter(n => {
      const ar = this.normalizeArabic(n.titles?.ar || '');
      const en = (n.titles?.en || '').toLowerCase();
      return ar.includes(normalizedQuery) || en.includes(normalizedQuery) || String(n.index) === query;
    }).slice(0, 20);

    if (side === 'a') this.filteredNarratorsA = filtered;
    else this.filteredNarratorsB = filtered;
  }

  selectNarrator(event: any, side: 'a' | 'b') {
    const index = event.option.value;
    const params: any = { ...this.route.snapshot.queryParams };

    if (side === 'a') {
      params.a = index;
      this.indexA = index;
      this.searchA = this.getNarratorDisplayName(index);
      this.store.dispatch(new LoadNarrator(index));
    } else {
      params.b = index;
      this.indexB = index;
      this.searchB = this.getNarratorDisplayName(index);
      this.store.dispatch(new LoadNarrator(index));
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge'
    });
  }

  displayNarrator(index: string): string {
    if (!index) return '';
    return this.getNarratorDisplayName(index);
  }

  private getNarratorDisplayName(index: string): string {
    const narrator = this.allNarrators.find(n => String(n.index) === String(index));
    if (!narrator) return index;
    const ar = narrator.titles?.ar || '';
    const en = narrator.titles?.en || '';
    return en ? `${ar} (${en})` : ar;
  }

  private computeBookDistribution(narrator: Narrator): BookDistribution[] {
    const paths = narrator.verse_paths || [];
    const bookCounts = new Map<string, number>();
    for (const path of paths) {
      const match = path.match(/^\/books\/([^:]+)/);
      if (match) {
        bookCounts.set(match[1], (bookCounts.get(match[1]) || 0) + 1);
      }
    }
    const maxCount = Math.max(...Array.from(bookCounts.values()), 1);
    return Array.from(bookCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([book, count]) => ({
        book,
        displayName: BOOK_DISPLAY_NAMES[book] || book,
        count,
        percentage: (count / maxCount) * 100
      }));
  }

  private computeSharedNarrations() {
    if (!this.narratorA?.verse_paths || !this.narratorB?.verse_paths) {
      this.sharedNarrations = [];
      return;
    }
    const setB = new Set(this.narratorB.verse_paths);
    this.sharedNarrations = this.narratorA.verse_paths.filter(p => setB.has(p));
    this.showAllShared = false;
  }

  getVisibleShared(): string[] {
    if (this.showAllShared) return this.sharedNarrations;
    return this.sharedNarrations.slice(0, 20);
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
}
