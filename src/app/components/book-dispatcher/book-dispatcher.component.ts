import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Book } from '@app/models';
import { BOOK_AUTHORS } from '@app/data/book-authors';
import { DailyVerse, DailyVerseService } from '@app/services/daily-verse.service';
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
  dailyVerse$: Observable<DailyVerse | null>;

  exploreCards: ExploreCard[] = [];
  private subscriptions: Subscription[] = [];

  constructor(private store: Store, dailyVerseService: DailyVerseService, private cdr: ChangeDetectorRef) {
    this.dailyVerse$ = dailyVerseService.getDailyVerse();
  }

  ngOnInit(): void {
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

    // Sort: featured first, then alphabetically by English title
    cards.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.titleEn.localeCompare(b.titleEn);
    });

    this.exploreCards = cards;
    this.cdr.markForCheck();
  }

  onRetry(): void {
    const index = this.store.selectSnapshot(RouterState.getBookPartIndex) || 'books';
    this.store.dispatch(new RetryLoadBookPart(index));
  }
}
