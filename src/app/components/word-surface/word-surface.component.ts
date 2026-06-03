import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SurfacePage } from '@app/models/word';
import { WordsService } from '@app/services/words.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-word-surface',
  templateUrl: './word-surface.component.html',
  styleUrls: ['./word-surface.component.scss'],
  standalone: false,
})
export class WordSurfaceComponent implements OnInit, OnDestroy {
  slug = '';
  surface: SurfacePage | null = null;
  loading = true;
  notFound = false;

  /** Cap occurrence paths shown initially. UI has a "show more" toggle. */
  pathsVisible = 50;

  private subscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private words: WordsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.subscription = this.route.paramMap.pipe(
      switchMap(params => {
        this.slug = params.get('surface') || '';
        this.loading = true;
        this.notFound = false;
        this.surface = null;
        this.pathsVisible = 50;
        this.cdr.markForCheck();
        return this.words.getSurface(this.slug);
      }),
    ).subscribe(page => {
      this.loading = false;
      if (page) {
        this.surface = page;
      } else {
        this.notFound = true;
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /** Show 100 more occurrence paths. */
  showMorePaths(): void {
    this.pathsVisible += 100;
    this.cdr.markForCheck();
  }

  /** Get the visible slice of occurrence paths. */
  get visiblePaths(): string[] {
    if (!this.surface) return [];
    return this.surface.occurrence_paths.slice(0, this.pathsVisible);
  }

  /** Friendly POS code → long-name. */
  posName(pos: string | null | undefined): string {
    if (!pos) return '';
    const map: Record<string, string> = {
      V: 'verb', N: 'noun', ADJ: 'adjective', ADV: 'adverb',
      PREP: 'preposition', CONJ: 'conjunction', PRON: 'pronoun',
      DET: 'determiner', PART: 'particle', INTJ: 'interjection',
      REL: 'relative', DEM: 'demonstrative', NEG: 'negation',
      COND: 'conditional', INTERR: 'interrogative',
    };
    return map[pos] || pos;
  }

  /**
   * Clitic codes get a friendly hover-readable label. The keys are
   * CAMeL slot names (prc0..3, enc0..1) and the values are CAMeL
   * clitic codes like `wa_conj` or `3ms_dobj`.
   */
  cliticLabel(slot: string, code: string): string {
    const proclitics: Record<string, string> = {
      Al_det: 'الْ definite article',
      lA_neg: 'لَا negation',
      mA_neg: 'مَا negation',
      bi_prep: 'بِ "by/with/in"',
      ka_prep: 'كَ "like"',
      li_prep: 'لِ "to/for"',
      li_jus: 'لِ jussive',
      li_sub: 'لِ subordinator',
      sa_fut: 'سَ future',
      wa_conj: 'وَ "and"',
      fa_conj: 'فَ "then/so"',
      wa_sub: 'وَ subordinator',
      fa_sub: 'فَ subordinator',
      Aa_ques: 'أَ interrogative',
    };
    if (slot.startsWith('prc')) {
      return proclitics[code] || code;
    }
    // Enclitic codes: {person}{gender}{number}_{role}
    const m = code.match(/^([123])([mfcd])([sdp])_(dobj|poss|pron)$/);
    if (m) {
      const [, person, gen, num, role] = m;
      const genName = { m: 'masc', f: 'fem', c: 'common', d: 'dual' }[gen] || gen;
      const numName = { s: 'sg', d: 'dual', p: 'pl' }[num] || num;
      const roleName = {
        dobj: 'direct object', poss: 'possessor', pron: 'object of prep',
      }[role] || role;
      return `${person}${genName} ${numName} ${roleName} pronoun`;
    }
    return code;
  }

  /** Slot name → human label. */
  slotLabel(slot: string): string {
    return ({
      prc0: 'proclitic 0 (nearest stem)',
      prc1: 'proclitic 1',
      prc2: 'proclitic 2',
      prc3: 'proclitic 3 (outermost)',
      enc0: 'enclitic 0 (suffix)',
      enc1: 'enclitic 1',
    } as Record<string, string>)[slot] || slot;
  }

  clitic_entries(c: Record<string, string> | undefined): Array<{ slot: string; code: string }> {
    if (!c) return [];
    return Object.keys(c).sort().map(slot => ({ slot, code: c[slot] }));
  }

  /** Ordered list of the languages Path B emits, with display labels
   *  and direction flags. Used by the surface page to render
   *  translations in a stable order regardless of object-key order. */
  readonly translationLangs: Array<{ code: string; label: string; rtl?: boolean }> = [
    { code: 'en', label: 'English' },
    { code: 'ar', label: 'Arabic', rtl: true },
    { code: 'fa', label: 'Persian', rtl: true },
    { code: 'ur', label: 'Urdu', rtl: true },
    { code: 'tr', label: 'Turkish' },
    { code: 'id', label: 'Indonesian' },
    { code: 'bn', label: 'Bengali' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'ru', label: 'Russian' },
    { code: 'zh', label: 'Chinese' },
  ];
}
