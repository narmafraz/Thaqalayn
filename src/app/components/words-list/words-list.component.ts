import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  LemmaIndexEntry, RootIndexEntry, SurfaceIndexEntry,
} from '@app/models/word';
import { WordsService } from '@app/services/words.service';
import { normalizeForMatch } from '@app/services/word-normalize';

type Tab = 'surfaces' | 'lemmas' | 'roots';

/**
 * Browse-all page for ThaqalaynWords. Three tabs:
 *   - Surfaces (102K) — sorted by descending frequency
 *   - Lemmas (13K)    — same
 *   - Roots (2.8K)    — same
 *
 * Uses Angular CDK virtual scroll because the surface list is too long
 * for naive rendering. Filter input strips diacritics on both query and
 * candidates so users can type undiacritized Arabic and find matches.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-words-list',
  templateUrl: './words-list.component.html',
  styleUrls: ['./words-list.component.scss'],
  standalone: false,
})
export class WordsListComponent implements OnInit, OnDestroy {
  activeTab: Tab = 'lemmas';
  filter = '';

  loadingSurfaces = true;
  loadingLemmas = true;
  loadingRoots = true;

  private allSurfaces: SurfaceIndexEntry[] = [];
  private allLemmas: LemmaIndexEntry[] = [];
  private allRoots: RootIndexEntry[] = [];

  filteredSurfaces: SurfaceIndexEntry[] = [];
  filteredLemmas: LemmaIndexEntry[] = [];
  filteredRoots: RootIndexEntry[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private words: WordsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.words.getSurfacesIndex(),
      this.words.getLemmasIndex(),
      this.words.getRootsIndex(),
    ]).pipe(takeUntil(this.destroy$))
      .subscribe(([surfaces, lemmas, roots]) => {
        this.allSurfaces = surfaces?.surfaces || [];
        this.allLemmas = lemmas?.lemmas || [];
        this.allRoots = roots?.roots || [];
        this.loadingSurfaces = false;
        this.loadingLemmas = false;
        this.loadingRoots = false;
        this.applyFilter();
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: Tab): void {
    this.activeTab = tab;
    this.applyFilter();
    this.cdr.markForCheck();
  }

  /** Re-filter on input change. Diacritic-insensitive substring match. */
  onFilterChange(): void {
    this.applyFilter();
    this.cdr.markForCheck();
  }

  private applyFilter(): void {
    const q = normalizeForMatch(this.filter).trim();
    if (!q) {
      this.filteredSurfaces = this.allSurfaces;
      this.filteredLemmas = this.allLemmas;
      this.filteredRoots = this.allRoots;
      return;
    }
    // The slug field is NFC Arabic. Normalize each candidate and substring-match.
    if (this.activeTab === 'surfaces') {
      this.filteredSurfaces = this.allSurfaces.filter(
        s => normalizeForMatch(s.slug).includes(q),
      );
    } else if (this.activeTab === 'lemmas') {
      this.filteredLemmas = this.allLemmas.filter(
        l => normalizeForMatch(l.slug).includes(q),
      );
    } else {
      this.filteredRoots = this.allRoots.filter(
        r => normalizeForMatch(r.slug || r.root).includes(q),
      );
    }
  }

  /** Track-by for *cdkVirtualFor to keep DOM nodes stable. */
  trackBySlug(_i: number, item: { slug: string }): string {
    return item.slug;
  }
}
