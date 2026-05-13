import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { LemmaPage, ParadigmEntry, ClassicalEntry, LaneEntry } from '@app/models/word';
import { WordsService } from '@app/services/words.service';

/**
 * Word-lemma page. The heaviest of the three word page kinds.
 *
 * Renders paradigm + Wiktextract definition + Lane's classical bodies +
 * hawramani multi-lexicon entries (~40 of them). Heavy sections use
 * accordion expand/collapse to keep the page scannable on mobile.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-word-lemma',
  templateUrl: './word-lemma.component.html',
  styleUrls: ['./word-lemma.component.scss'],
  standalone: false,
})
export class WordLemmaComponent implements OnInit, OnDestroy {
  slug = '';
  lemma: LemmaPage | null = null;
  loading = true;
  notFound = false;

  /** Track which classical-lexicon accordion items are expanded. */
  expandedClassical = new Set<string>();
  /** Track which Lane's-entry accordion items are expanded. */
  expandedLanes = new Set<string>();

  /** Pre-trusted SafeHtml per classical entry — built once on data load. */
  private trustedClassicalHtml = new Map<string, SafeHtml>();

  private subscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private words: WordsService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.subscription = this.route.paramMap.pipe(
      switchMap(params => {
        this.slug = params.get('slug') || '';
        this.loading = true;
        this.notFound = false;
        this.lemma = null;
        this.expandedClassical.clear();
        this.expandedLanes.clear();
        this.trustedClassicalHtml.clear();
        this.cdr.markForCheck();
        return this.words.getLemma(this.slug);
      }),
    ).subscribe(page => {
      this.loading = false;
      if (page) {
        this.lemma = page;
        // Pre-build SafeHtml for classical bodies (server-side already
        // sanitized; this lets Angular render with [innerHTML]).
        for (const entry of page.classical_definitions?.entries || []) {
          this.trustedClassicalHtml.set(
            entry.permalink,
            this.sanitizer.bypassSecurityTrustHtml(entry.body_html),
          );
        }
      } else {
        this.notFound = true;
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  // ---- Paradigm helpers ---------------------------------------------------

  /** Group paradigm by aspect for verbs, leaving non-verb forms in "other". */
  groupedParadigm(): Array<{ label: string; entries: ParadigmEntry[] }> {
    if (!this.lemma) return [];
    const groups: Record<string, ParadigmEntry[]> = {
      Past: [], Present: [], Imperative: [], Other: [],
    };
    for (const p of this.lemma.paradigm) {
      const key = p.asp === 'p' ? 'Past' : p.asp === 'i' ? 'Present' : p.asp === 'c' ? 'Imperative' : 'Other';
      groups[key].push(p);
    }
    return Object.entries(groups)
      .filter(([, entries]) => entries.length > 0)
      .map(([label, entries]) => ({ label, entries }));
  }

  /** Human-readable paradigm role, e.g. "past_3ms" → "3rd masc sg". */
  roleLabel(p: ParadigmEntry): string {
    const per = p.per || '?';
    const genName = ({ m: 'masc', f: 'fem', c: 'common' } as Record<string, string>)[p.gen || ''] || p.gen || '';
    const numName = ({ s: 'sg', d: 'dual', p: 'pl' } as Record<string, string>)[p.num || ''] || p.num || '';
    if (p.asp && per !== '?') {
      return `${per}${genName ? ' ' + genName : ''}${numName ? ' ' + numName : ''}`.trim();
    }
    return p.role || '';
  }

  // ---- Classical lexicons -------------------------------------------------

  toggleClassical(permalink: string): void {
    if (this.expandedClassical.has(permalink)) {
      this.expandedClassical.delete(permalink);
    } else {
      this.expandedClassical.add(permalink);
    }
    this.cdr.markForCheck();
  }

  classicalIsOpen(permalink: string): boolean {
    return this.expandedClassical.has(permalink);
  }

  trustedClassicalBody(entry: ClassicalEntry): SafeHtml {
    return this.trustedClassicalHtml.get(entry.permalink) || '';
  }

  // ---- Lane's entries -----------------------------------------------------

  toggleLane(entry_id: string): void {
    if (this.expandedLanes.has(entry_id)) {
      this.expandedLanes.delete(entry_id);
    } else {
      this.expandedLanes.add(entry_id);
    }
    this.cdr.markForCheck();
  }

  laneIsOpen(entry_id: string): boolean {
    return this.expandedLanes.has(entry_id);
  }

  /** Build an Wiktionary external URL for the lemma. */
  wiktionaryUrl(): string {
    return this.lemma
      ? `https://en.wiktionary.org/wiki/${encodeURIComponent(this.lemma.slug)}`
      : '';
  }

  /** Build a QAC external URL using the QAC root if available. */
  qacUrl(): string {
    const root = this.lemma?.cross_references?.qac?.root;
    return root
      ? `https://corpus.quran.com/qurandictionary.jsp?q=${encodeURIComponent(root)}`
      : '';
  }

  /** A few example occurrence paths fetched lazily for the citation form. */
  examplePaths: string[] = [];
  exampleSourceForm: string | null = null;
  exampleLoading = false;
  /** Lazy load: when the user expands "Show examples", fetch the most-
   * frequent paradigm form's surface page and pull a few hadith paths. */
  loadExamples(): void {
    if (!this.lemma) return;
    if (this.exampleLoading || this.examplePaths.length) return;
    // Pick the highest-count in_corpus form, falling back to the lemma slug itself.
    const candidate = this.lemma.paradigm
      .filter(p => p.in_corpus && p.count)
      .sort((a, b) => (b.count || 0) - (a.count || 0))[0];
    const form = candidate?.form || this.lemma.slug;
    this.exampleSourceForm = form;
    this.exampleLoading = true;
    this.cdr.markForCheck();
    this.words.getSurface(form).subscribe(s => {
      this.exampleLoading = false;
      if (s) {
        this.examplePaths = s.occurrence_paths.slice(0, 5);
      }
      this.cdr.markForCheck();
    });
  }
}
