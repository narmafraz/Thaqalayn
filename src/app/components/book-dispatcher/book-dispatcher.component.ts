import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Book } from '@app/models';
import { BOOK_AUTHORS } from '@app/data/book-authors';
import { BookmarkService, ReadingProgress } from '@app/services/bookmark.service';
import { RandomVerse, RandomVerseService } from '@app/services/random-verse.service';
import { ReadingStatsService, BookProgress, RevisitCandidate, StreakInfo } from '@app/services/reading-stats.service';
import { VerseCountsService } from '@app/services/verse-counts.service';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { RetryLoadBookPart } from '@store/books/books.actions';
import { IndexState } from '@store/index/index.state';
import { RouterState } from '@store/router/router.state';
import { Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

/** Static metadata for book explore cards (icon, description key) */
export interface BookCardMeta {
  icon: string;
  descKey: string;
  featured?: boolean;
}

export const BOOK_CARD_META: Record<string, BookCardMeta> = {
  'quran': { icon: 'menu_book', descKey: 'nav.quranDesc', featured: true },
  'al-kafi': { icon: 'auto_stories', descKey: 'nav.alKafiDesc', featured: true },
  'tahdhib-al-ahkam': { icon: 'auto_stories', descKey: 'nav.tahdhibDesc', featured: true },
  'al-istibsar': { icon: 'auto_stories', descKey: 'nav.istibsarDesc', featured: true },
  'man-la-yahduruhu-al-faqih': { icon: 'auto_stories', descKey: 'nav.faqihDesc', featured: true },
  'kitab-al-irshad': { icon: 'import_contacts', descKey: 'nav.irshadDesc' },
  'al-amali': { icon: 'import_contacts', descKey: 'nav.amaliDesc' },
  'kitab-sulaym-ibn-qays': { icon: 'import_contacts', descKey: 'nav.sulaimDesc' },
  'nahj-al-balagha': { icon: 'format_quote', descKey: 'nav.nahjDesc' },
  'al-sahifa-al-sajjadiyya': { icon: 'self_improvement', descKey: 'nav.sahifaDesc' },
  'wasael-ul-shia': { icon: 'library_books', descKey: 'nav.wasaelDesc' },
  'bihar-al-anwar': { icon: 'library_books', descKey: 'nav.biharDesc' },
};

/**
 * Approximate chronological order by composition/compilation date.
 * Lower number = older book. Used to sort explore cards oldest-first.
 *
 * Quran: ~610-632 CE
 * Risalat al-Huquq: Imam al-Sajjad (d. 713 CE)
 * Nahj al-Balagha: sermons of Imam Ali, compiled ~1010 CE but content ~7th c.
 * Kitab al-Zuhd / Kitab al-Mu'min: Al-Ahwazi (d. ~864 CE)
 * Kitab Sulaym ibn Qays: attributed to Sulaym (d. ~697 CE), compiled later
 * Al-Kafi: Al-Kulayni (d. 941 CE)
 * Kitab al-Ghayba (Nu'mani): Al-Nu'mani (d. ~965 CE)
 * Kamil al-Ziyarat: Ibn Qulawayh (d. 979 CE)
 * Al-Saduq's works: Al-Saduq (d. 991 CE)
 * Al-Mufid's works: Al-Mufid (d. 1022 CE)
 * Al-Sharif al-Radi compiled Nahj al-Balagha ~1010 CE
 * Al-Sahifa al-Sajjadiyya: Imam al-Sajjad, compiled ~11th c.
 * Al-Tusi's works: Al-Tusi (d. 1067 CE)
 * Kitab al-Du'afa': Ibn al-Ghada'iri (d. ~1050 CE)
 * Wasa'il al-Shi'a: Al-Hurr al-Amili (d. 1693 CE)
 * Bihar al-Anwar: Al-Majlisi (d. 1699 CE)
 * Mu'jam al-Ahadith: Muhammad Asif Muhsini (modern)
 */
export const BOOK_CHRONOLOGICAL_ORDER: Record<string, number> = {
  'quran':                          1,   // ~610-632 CE
  'risalat-al-huquq':              2,   // Imam al-Sajjad (d. 713)
  'kitab-al-zuhd':                 3,   // Al-Ahwazi (d. ~864)
  'kitab-al-mumin':                4,   // Al-Ahwazi (d. ~864)
  'al-kafi':                       5,   // Al-Kulayni (d. 941)
  'kitab-al-ghayba-numani':        6,   // Al-Nu'mani (d. ~965)
  'kamil-al-ziyarat':              7,   // Ibn Qulawayh (d. 979)
  'al-amali-saduq':                8,   // Al-Saduq (d. 991)
  'al-khisal':                     9,   // Al-Saduq (d. 991)
  'al-tawhid':                    10,   // Al-Saduq (d. 991)
  'kamal-al-din':                 11,   // Al-Saduq (d. 991)
  'maani-al-akhbar':              12,   // Al-Saduq (d. 991)
  'man-la-yahduruhu-al-faqih':    13,   // Al-Saduq (d. 991)
  'thawab-al-amal':               14,   // Al-Saduq (d. 991)
  'uyun-akhbar-al-rida':          15,   // Al-Saduq (d. 991)
  'fadail-al-shia':               16,   // Al-Saduq (d. 991)
  'sifat-al-shia':                17,   // Al-Saduq (d. 991)
  'nahj-al-balagha':              18,   // Al-Sharif al-Radi (compiled ~1010)
  'al-amali-mufid':               19,   // Al-Mufid (d. 1022)
  'kitab-al-irshad':              20,   // Al-Mufid (d. 1022)
  'al-sahifa-al-sajjadiyya':      21,   // Compiled/transmitted ~11th c.
  'kitab-al-duafa':               22,   // Ibn al-Ghada'iri (d. ~1050)
  'kitab-al-ghayba-tusi':         23,   // Al-Tusi (d. 1067)
  'tahdhib-al-ahkam':             24,   // Al-Tusi (d. 1067)
  'al-istibsar':                  25,   // Al-Tusi (d. 1067)
  'kitab-sulaym-ibn-qays':        26,   // Content ~7th c., compiled form ~11th c.
  'wasael-ul-shia':               27,   // Al-Hurr al-Amili (d. 1693)
  'bihar-al-anwar':               28,   // Al-Majlisi (d. 1699)
  'mujam-al-ahadith-al-mutabara': 29,   // Modern compilation
};

export interface ExploreCard {
  slug: string;
  routerLink: string;
  titleEn: string;
  titleAr: string;
  icon: string;
  descKey: string;
  author?: { en: string; ar: string };
  featured: boolean;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-book-dispatcher',
    templateUrl: './book-dispatcher.component.html',
    styleUrls: ['./book-dispatcher.component.scss'],
    standalone: false
})
export class BookDispatcherComponent implements OnInit, OnDestroy {

  book$: Observable<Book> = inject(Store).select(BooksState.getCurrentNavigatedPart);
  loading$: Observable<boolean> = inject(Store).select(BooksState.getCurrentLoading);
  error$: Observable<string> = inject(Store).select(BooksState.getCurrentError);
  randomQuran$: Observable<RandomVerse | null>;
  randomHadith$: Observable<RandomVerse | null>;

  exploreCards: ExploreCard[] = [];
  readingProgress: ReadingProgress[] = [];
  bookProgressMap: Map<string, BookProgress> = new Map();
  streak: StreakInfo = { current: 0, longest: 0, includesToday: false };
  goalTarget = 0;
  goalToday = 0;
  goalFraction = 0;
  /**
   * RE-18 — books the user has actually started, sorted by most-recently-read.
   * Each card shows per-book progress and deep-links to the last-visited
   * chapter (via readingProgress) when available, else to the book root.
   */
  startedBookCards: Array<{
    slug: string;
    titleEn: string;
    titleAr: string;
    icon: string;
    progress: BookProgress;
    continueRouterLink: string[];
    continueLabel: string;
  }> = [];
  /** RE-14 — older bookmarks to gently re-surface. */
  revisitCandidates: RevisitCandidate[] = [];
  private subscriptions: Subscription[] = [];

  private static readonly BOOK_NAMES: Record<string, string> = {
    'quran': 'Quran', 'al-kafi': 'Al-Kafi', 'tahdhib-al-ahkam': 'Tahdhib al-Ahkam',
    'al-istibsar': 'Al-Istibsar', 'man-la-yahduruhu-al-faqih': 'Man La Yahduruhu al-Faqih',
    'nahj-al-balagha': 'Nahj al-Balagha', 'al-sahifa-al-sajjadiyya': 'Al-Sahifa al-Sajjadiyya',
  };

  constructor(
    private store: Store,
    private randomVerseService: RandomVerseService,
    private bookmarkService: BookmarkService,
    private readingStats: ReadingStatsService,
    private verseCounts: VerseCountsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // RE-11: sticky "Verse of the Day" for Quran. Shuffle button below still
    // produces a fresh random verse on demand.
    this.randomQuran$ = this.randomVerseService.getTodayQuranVerse();
    this.randomHadith$ = this.randomVerseService.getRandomHadith();

    // Kick off the verse-counts manifest fetch so per-book progress bars can render.
    this.verseCounts.get().subscribe();

    this.subscriptions.push(
      this.bookmarkService.readingProgress$.subscribe(rp => {
        this.readingProgress = rp.slice(0, 3);
        // readingProgress drives the "continue" link in the started-books
        // panel, so rebuild that whenever the per-book last-position
        // changes.
        this.rebuildStartedBookCards();
        this.cdr.markForCheck();
      })
    );
    // RE-14 — refresh revisit suggestions whenever bookmarks change OR a
    // read-mark lands (which affects the "last seen" timestamp).
    this.subscriptions.push(
      this.bookmarkService.bookmarks$.subscribe(() => this.refreshRevisitCandidates())
    );
    this.subscriptions.push(
      this.bookmarkService.readVerses$.subscribe(() => this.refreshRevisitCandidates())
    );
    this.subscriptions.push(
      this.readingStats.bookProgressMap$.subscribe(map => {
        this.bookProgressMap = map;
        this.rebuildStartedBookCards();
        this.cdr.markForCheck();
      })
    );
    this.subscriptions.push(
      this.readingStats.streak$.subscribe(s => {
        this.streak = s;
        this.cdr.markForCheck();
      })
    );
    this.subscriptions.push(
      this.readingStats.goalProgress$.subscribe(g => {
        this.goalTarget = g.target;
        this.goalToday = g.today;
        this.goalFraction = g.fraction;
        this.cdr.markForCheck();
      })
    );
    this.subscriptions.push(
      this.store.select(IndexState.getBookForLanguage)
        .pipe(filter(fn => !!fn))
        .subscribe(getBookForLanguage => {
          const enIndex = getBookForLanguage('en');
          const arIndex = getBookForLanguage('ar');
          if (enIndex) {
            this.buildExploreCards(enIndex, arIndex);
          }
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  private buildExploreCards(enIndex: Record<string, any>, arIndex?: Record<string, any>): void {
    const cards: ExploreCard[] = [];

    // Extract level-0 books (paths like /books/xxx with no colons in the slug)
    for (const path of Object.keys(enIndex)) {
      const slug = path.replace('/books/', '');
      if (slug.includes(':')) continue; // Not a top-level book

      const enEntry = enIndex[path];
      const arEntry = arIndex?.[path];
      const meta = BOOK_CARD_META[slug];

      const author = BOOK_AUTHORS[slug];
      cards.push({
        slug,
        routerLink: '/books/' + slug,
        titleEn: enEntry?.title || slug,
        titleAr: arEntry?.title || '',
        icon: meta?.icon || 'book',
        descKey: meta?.descKey || '',
        author: author?.en ? author : undefined,
        featured: meta?.featured || false,
      });
    }

    // Sort chronologically (oldest first), with featured books promoted to top
    cards.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return (BOOK_CHRONOLOGICAL_ORDER[a.slug] ?? 999) - (BOOK_CHRONOLOGICAL_ORDER[b.slug] ?? 999);
    });

    this.exploreCards = cards;
    this.rebuildStartedBookCards();
    this.cdr.markForCheck();
  }

  onRetry(): void {
    const index = this.store.selectSnapshot(RouterState.getBookPartIndex) || 'books';
    this.store.dispatch(new RetryLoadBookPart(index));
  }

  getProgressRouterLink(rp: ReadingProgress): string[] {
    const clean = rp.lastPath.replace(/^\//, '');
    const slashIdx = clean.indexOf('/');
    if (slashIdx > 0) {
      return ['/' + clean.substring(0, slashIdx), clean.substring(slashIdx + 1)];
    }
    return [rp.lastPath];
  }

  formatBookName(bookId: string): string {
    return BookDispatcherComponent.BOOK_NAMES[bookId] || bookId;
  }

  clearProgress(bookId: string): void {
    this.bookmarkService.clearReadingProgress(bookId);
  }

  /** Per-book progress for the given slug, or `null` if unknown. Used by the homepage card template. */
  bookProgress(slug: string): BookProgress | null {
    return this.bookProgressMap.get(slug) ?? null;
  }

  private async refreshRevisitCandidates(): Promise<void> {
    this.revisitCandidates = await this.readingStats.revisitCandidates(5);
    this.cdr.markForCheck();
  }

  /** Path → routerLink segments. Mirrors getProgressRouterLink. */
  bookmarkRouterLink(path: string): string[] {
    const clean = path.replace(/^\//, '');
    const slashIdx = clean.indexOf('/');
    if (slashIdx > 0) {
      return ['/' + clean.substring(0, slashIdx), clean.substring(slashIdx + 1)];
    }
    return [path];
  }

  /**
   * Rebuild the "books you've started" homepage panel (RE-18). Books with
   * versesRead > 0 only, sorted by lastReadVerseAt desc. Continue-link
   * targets the BookmarkService lastPath for that book if set, else the
   * book root.
   */
  private rebuildStartedBookCards(): void {
    if (this.bookProgressMap.size === 0 || this.exploreCards.length === 0) {
      this.startedBookCards = [];
      return;
    }
    const exploreBySlug = new Map(this.exploreCards.map(c => [c.slug, c]));
    const progressByBook = new Map(
      this.readingProgress.map(rp => [rp.bookId, rp]),
    );

    const candidates: typeof this.startedBookCards = [];
    for (const bp of this.bookProgressMap.values()) {
      if (bp.versesRead === 0) continue;
      const explore = exploreBySlug.get(bp.bookId);
      if (!explore) continue;

      const rp = progressByBook.get(bp.bookId);
      const continueRouterLink = rp
        ? this.getProgressRouterLink(rp)
        : ['/books', bp.bookId];
      const continueLabel = rp?.lastTitle || explore.titleEn;

      candidates.push({
        slug: bp.bookId,
        titleEn: explore.titleEn,
        titleAr: explore.titleAr,
        icon: explore.icon,
        progress: bp,
        continueRouterLink,
        continueLabel,
      });
    }

    // Most recently read first; fall back to alpha by slug if no timestamp.
    candidates.sort((a, b) => {
      const at = a.progress.lastReadVerseAt?.getTime() ?? 0;
      const bt = b.progress.lastReadVerseAt?.getTime() ?? 0;
      if (bt !== at) return bt - at;
      return a.slug.localeCompare(b.slug);
    });
    this.startedBookCards = candidates;
  }

  shuffleQuran(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.randomQuran$ = this.randomVerseService.getRandomQuranVerse();
  }

  shuffleHadith(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.randomHadith$ = this.randomVerseService.getRandomHadith();
  }
}
