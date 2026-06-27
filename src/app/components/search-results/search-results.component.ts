import { AfterViewChecked, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { SearchState } from '@store/search/search.state';
import { ClearFacets, InitSearchIndex, SearchQuery, SetFacet, SetSearchLanguage, SetSearchMode } from '@store/search/search.actions';
import { SearchMode, SearchResult } from '@app/services/search.service';
import { PagefindFilterCounts, PagefindService } from '@app/services/pagefind.service';
import { VerseLoaderService } from '@app/services/verse-loader.service';
import { combineLatest, Observable, Subscription } from 'rxjs';

// label = data-derived display text (book/type/topic/tag values); labelKey = an
// i18n key (group headers, and has_chain values) resolved via the translate pipe.
interface FacetValue { value: string; label: string; labelKey?: string; count: number; active: boolean; }
interface FacetGroup { filter: string; labelKey: string; values: FacetValue[]; }

// Display order for the facet groups (labels come from i18n: search.facet.*).
const FACET_ORDER = ['book', 'content_type', 'has_chain', 'topic', 'tag'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.scss'],
  standalone: false,
})
export class SearchResultsComponent implements OnInit, OnDestroy, AfterViewChecked {
  results$: Observable<SearchResult[]> = inject(Store).select(SearchState.getResults);
  loading$: Observable<boolean> = inject(Store).select(SearchState.isLoading);
  query$: Observable<string> = inject(Store).select(SearchState.getQuery);
  error$: Observable<string> = inject(Store).select(SearchState.getError);
  mode$: Observable<SearchMode> = inject(Store).select(SearchState.getMode);
  searchLang$: Observable<string> = inject(Store).select(SearchState.getSearchLang);
  fullTextLoading$: Observable<boolean> = inject(Store).select(SearchState.isFullTextLoading);

  private facets$: Observable<PagefindFilterCounts> = inject(Store).select(SearchState.getFacets);
  private activeFacets$: Observable<Record<string, string[]>> = inject(Store).select(SearchState.getActiveFacets);

  availableLangs: string[] = [];
  facetGroups: FacetGroup[] = [];
  hasActiveFacets = false;
  pathOnlyMode = false; // topic:/ref: results carry only paths -> lazy-load snippets
  displayedCount = 30;

  // Path-only lazy-load: each card fetches its verse_detail as it scrolls into view.
  resolvedSnippets = new Map<string, string>();
  private observer: IntersectionObserver | null = null;
  private observedElements = new Set<Element>();

  private results: SearchResult[] = [];
  private subscriptions: Subscription[] = [];
  private pagefind = inject(PagefindService);
  private verseLoader = inject(VerseLoaderService);
  private el = inject(ElementRef);

  constructor(private store: Store, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.store.dispatch(new InitSearchIndex());

    // Languages offered by the picker come from the meta-site manifest.
    this.subscriptions.push(
      this.pagefind.getManifest().subscribe((m) => {
        this.availableLangs = m?.languages.map((l) => l.code) ?? [];
        this.cdr.markForCheck();
      }),
    );

    this.subscriptions.push(
      this.route.queryParamMap.subscribe((params) => {
        const q = params.get('q');
        this.pathOnlyMode = !!q && /^(topic|ref):/i.test(q.trim());
        if (q) { this.store.dispatch(new SearchQuery(q)); }
      }),
    );

    this.subscriptions.push(
      this.results$.subscribe((results) => {
        this.results = results;
        this.displayedCount = 30;
        this.resolvedSnippets.clear();
        this.destroyObserver();
        this.cdr.markForCheck();
      }),
    );

    this.subscriptions.push(
      combineLatest([this.facets$, this.activeFacets$]).subscribe(([facets, active]) => {
        this.facetGroups = this.buildFacetGroups(facets, active);
        this.hasActiveFacets = Object.keys(active).length > 0;
        this.cdr.markForCheck();
      }),
    );
  }

  ngAfterViewChecked(): void {
    if (this.pathOnlyMode) {
      this.ensureObserver();
      this.observeCards();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.destroyObserver();
  }

  setMode(mode: SearchMode): void {
    this.store.dispatch(new SetSearchMode(mode));
  }

  setLanguage(lang: string): void {
    this.store.dispatch(new SetSearchLanguage(lang));
  }

  toggleFacet(filter: string, value: string, active: boolean): void {
    this.store.dispatch(new SetFacet(filter, value, !active));
  }

  clearFacets(): void {
    this.store.dispatch(new ClearFacets());
  }

  getBookPath(result: SearchResult): string {
    return result.path.startsWith('/books/') ? result.path.substring(7) : result.path;
  }

  /** Format a raw path like "/books/al-khisal:4:189" to "Al-Khisal 4:189". */
  formatPath(path: string): string {
    const match = path.match(/\/books\/([^:]+):?(.*)/);
    if (!match) { return path; }
    const name = match[1].split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
    return match[2] ? `${name} ${match[2]}` : name;
  }

  get displayedResults(): SearchResult[] {
    if (this.pathOnlyMode) { return this.results; } // observer lazy-loads per card
    return this.results.slice(0, this.displayedCount);
  }

  get hasMoreResults(): boolean {
    return !this.pathOnlyMode && this.displayedCount < this.results.length;
  }

  loadMore(): void {
    this.displayedCount += 30;
    this.cdr.markForCheck();
  }

  private buildFacetGroups(facets: PagefindFilterCounts, active: Record<string, string[]>): FacetGroup[] {
    const groups: FacetGroup[] = [];
    const keys = Object.keys(facets).sort(
      (a, b) => (FACET_ORDER.indexOf(a) + 1 || 99) - (FACET_ORDER.indexOf(b) + 1 || 99),
    );
    for (const filter of keys) {
      const activeSet = new Set(active[filter] || []);
      const values: FacetValue[] = Object.entries(facets[filter])
        .filter(([, count]) => count > 0 || activeSet.size)
        .map(([value, count]) => ({
          value,
          label: this.facetValueLabel(filter, value),
          labelKey: filter === 'has_chain' ? `search.chain.${value}` : undefined,
          count,
          active: activeSet.has(value),
        }))
        .sort((a, b) => b.count - a.count);
      if (values.length) {
        groups.push({ filter, labelKey: `search.facet.${filter}`, values });
      }
    }
    return groups;
  }

  private facetValueLabel(filter: string, value: string): string {
    if (filter === 'book') { return this.formatPath(`/books/${value}`); }
    return this.titleCase(value); // has_chain uses labelKey instead
  }

  private titleCase(value: string): string {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // --- path-only lazy-load (topic:/ref:) ---

  private ensureObserver(): void {
    if (this.observer) { return; }
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) { return; }
          const path = (entry.target as HTMLElement).getAttribute('data-topic-path');
          if (path && !this.resolvedSnippets.has(path)) {
            this.verseLoader.loadVerse(path).subscribe((verse) => {
              if (!verse) { return; }
              const first = Object.values(verse.translations || {})[0] as string[] | undefined;
              const en = (first || []).join(' ').replace(/<[^>]*>/g, '').trim();
              this.resolvedSnippets.set(path, en.length > 200 ? en.slice(0, 200) + '...' : en);
              this.cdr.markForCheck();
            });
          }
          this.observer?.unobserve(entry.target);
          this.observedElements.delete(entry.target);
        });
      },
      { rootMargin: '200px' },
    );
  }

  private observeCards(): void {
    if (!this.observer) { return; }
    const cards = this.el.nativeElement.querySelectorAll('.result-card[data-topic-path]');
    cards.forEach((card: Element) => {
      if (!this.observedElements.has(card)) {
        this.observer!.observe(card);
        this.observedElements.add(card);
      }
    });
  }

  private destroyObserver(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.observedElements.clear();
  }
}
