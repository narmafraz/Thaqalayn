import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Book, getChapter, Narrator } from '@app/models';
import { I18nService, SeoService, ThemeService, KeyboardShortcutService } from '@app/services';
import { AiPreferencesService } from '@app/services/ai-preferences.service';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { PeopleState } from '@store/people/people.state';
import { Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, map, startWith } from 'rxjs/operators';
import { ThemeMode } from '@app/services/theme.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Thaqalayn';
  private subscriptions: Subscription[] = [];

  languages = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'العربية' },
    { code: 'fa', name: 'فارسی' },
    { code: 'fr', name: 'Français' },
    { code: 'ur', name: 'اردو' },
    { code: 'tr', name: 'Türkçe' },
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'bn', name: 'বাংলা' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ru', name: 'Русский' },
    { code: 'zh', name: '中文' },
  ];

  currentLang$: Observable<string>;
  theme$: Observable<ThemeMode>;
  fontSize$: Observable<number>;
  helpVisible$: Observable<boolean>;
  isEmbed$: Observable<boolean>;
  activeSection$: Observable<string>;
  showBackToTop = false;
  headerCompact = false;
  mobileMenuOpen = false;

  private static readonly STATIC_TITLES: Record<string, { i18nKey: string; fallback: string }> = {
    '/about': { i18nKey: 'pageTitle.about', fallback: 'About' },
    '/bookmarks': { i18nKey: 'pageTitle.bookmarks', fallback: 'Bookmarks' },
    '/download': { i18nKey: 'pageTitle.download', fallback: 'Download' },
    '/support': { i18nKey: 'pageTitle.support', fallback: 'Support' },
    '/topics': { i18nKey: 'pageTitle.topics', fallback: 'Topics' },
  };

  /** Tracks the current page context for re-applying titles on language change. */
  private currentPageContext: { type: string; data?: unknown } = { type: 'home' };

  private isBrowser: boolean;

  constructor(
    private seo: SeoService,
    private titleService: Title,
    private router: Router,
    private store: Store,
    private i18n: I18nService,
    private themeService: ThemeService,
    private keyboard: KeyboardShortcutService,
    private cdr: ChangeDetectorRef,
    public aiPrefs: AiPreferencesService,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.currentLang$ = this.i18n.currentLang$;
    this.theme$ = this.themeService.theme$;
    this.fontSize$ = this.themeService.fontSize$;
    this.helpVisible$ = this.keyboard.helpVisible$;
    const initialEmbed = this.isBrowser ? window.location.pathname.startsWith('/embed/') : false;
    this.isEmbed$ = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map((event: NavigationEnd) => (event.urlAfterRedirects || event.url).split('?')[0].startsWith('/embed/')),
      startWith(initialEmbed)
    );
    this.activeSection$ = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map((event: NavigationEnd) => {
        const path = (event.urlAfterRedirects || event.url).split('?')[0];
        if (path === '/' || path === '/books') return 'home';
        if (path.startsWith('/books/')) return 'books';
        if (path.startsWith('/people/')) return 'narrators';
        if (path.startsWith('/bookmarks')) return 'bookmarks';
        if (path.startsWith('/topics')) return 'topics';
        return 'home';
      }),
      startWith('home'),
      distinctUntilChanged()
    );
  }

  onLanguageChange(lang: string): void {
    this.i18n.setLanguage(lang);
    // Update ?lang= query param so URL is shareable with language preference
    this.router.navigate([], {
      queryParams: { lang },
      queryParamsHandling: 'merge',
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  increaseFontSize(): void {
    this.themeService.increaseFontSize();
  }

  decreaseFontSize(): void {
    this.themeService.decreaseFontSize();
  }

  resetFontSize(): void {
    this.themeService.resetFontSize();
  }

  toggleHelp(): void {
    this.keyboard.toggleHelp();
  }

  dismissHelp(): void {
    this.keyboard.dismissHelp();
  }

  scrollToTop(): void {
    if (!this.isBrowser) return;
    const siteEl = document.getElementById('site');
    if (siteEl) {
      siteEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private onSiteScroll = (): void => {
    const siteEl = document.getElementById('site');
    if (!siteEl) return;
    const scrollTop = siteEl.scrollTop;
    const shouldShow = scrollTop > window.innerHeight * 2;
    const shouldCompact = scrollTop > 50;
    let changed = false;
    if (shouldShow !== this.showBackToTop) {
      this.showBackToTop = shouldShow;
      changed = true;
    }
    if (shouldCompact !== this.headerCompact) {
      this.headerCompact = shouldCompact;
      changed = true;
    }
    if (changed) {
      this.cdr.markForCheck();
    }
  };

  ngOnInit(): void {
    if (this.isBrowser) {
      this.subscriptions.push(
        this.i18n.isRtl$.subscribe(isRtl => {
          document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        })
      );

      this.subscriptions.push(
        this.i18n.currentLang$.subscribe(lang => {
          document.documentElement.lang = lang;
        })
      );

      // Listen for scroll events on #site for back-to-top button
      const siteEl = document.getElementById('site');
      if (siteEl) {
        siteEl.addEventListener('scroll', this.onSiteScroll, { passive: true });
      }

      // Handle legacy hash-based URLs (redirect #/books/quran:1 to /books/quran:1)
      if (window.location.hash.startsWith('#/')) {
        const newPath = window.location.hash.substring(1);
        // Use replaceState to avoid adding to browser history
        window.history.replaceState(null, '', newPath);
        this.router.navigateByUrl(newPath);
      }
    }

    this.subscriptions.push(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects || event.url;
        const path = url.replace(/^#?\/?/, '/').split('?')[0];

        for (const [route, entry] of Object.entries(AppComponent.STATIC_TITLES)) {
          if (path === route) {
            this.seo.setStaticPage(route, entry.fallback);
            this.currentPageContext = { type: 'static', data: route };
            this.applyLocalizedTitle();
            return;
          }
        }

        if (path === '/books' || path === '/' || path === '') {
          this.seo.setHomePage();
          this.currentPageContext = { type: 'home' };
          this.applyLocalizedTitle();
          return;
        }

        if (path.startsWith('/people/narrators/index')) {
          this.seo.setNarratorListPage();
          this.currentPageContext = { type: 'narrator-list' };
          this.applyLocalizedTitle();
          return;
        }
      })
    );

    this.subscriptions.push(
      this.store.select(BooksState.getCurrentNavigatedPart).subscribe((book: Book) => {
        if (!book) return;
        if (book.kind === 'verse_detail') {
          const d = book.data;
          const translationText = d.verse.translations
            ? Object.values(d.verse.translations)[0]?.[0]
            : undefined;
          this.seo.setVerseDetailPage(
            book.index,
            d.verse.local_index,
            d.verse.part_type,
            d.chapter_title?.en || '',
            translationText
          );
          this.currentPageContext = { type: 'verse-detail', data: book };
          this.applyLocalizedTitle();
          return;
        }
        const chapter = getChapter(book);
        if (chapter && chapter.titles && chapter.titles.en) {
          this.seo.setBookPage(
            book.index,
            chapter.titles.en,
            chapter.descriptions?.en
          );
          this.currentPageContext = { type: 'book', data: book };
          this.applyLocalizedTitle();
        }
      })
    );

    this.subscriptions.push(
      this.store.select(PeopleState.getCurrentNavigatedNarrator).subscribe((narrator: Narrator) => {
        if (!narrator || !narrator.titles) return;
        const name = narrator.titles.en || narrator.titles.ar;
        if (name) {
          this.seo.setNarratorPage(
            narrator.index,
            name,
            narrator.titles.ar
          );
          this.currentPageContext = { type: 'narrator', data: narrator };
          this.applyLocalizedTitle();
        }
      })
    );

    // Re-apply localized document.title when language or i18n strings change
    this.subscriptions.push(
      this.i18n.stringsChanged$.subscribe(() => {
        this.applyLocalizedTitle();
      })
    );
  }

  /**
   * Sets document.title using the current language, without changing SEO meta tags.
   * SEO tags remain in English (set by SeoService).
   */
  private applyLocalizedTitle(): void {
    const SITE = 'Thaqalayn';
    const lang = this.i18n.currentLang;
    const ctx = this.currentPageContext;

    let pageTitle: string | undefined;

    switch (ctx.type) {
      case 'home':
        pageTitle = undefined; // Just site name
        break;

      case 'static': {
        const route = ctx.data as string;
        const entry = AppComponent.STATIC_TITLES[route];
        if (entry) {
          const translated = this.i18n.get(entry.i18nKey);
          pageTitle = translated !== entry.i18nKey ? translated : entry.fallback;
        }
        break;
      }

      case 'narrator-list': {
        const translated = this.i18n.get('pageTitle.narrators');
        pageTitle = translated !== 'pageTitle.narrators' ? translated : 'Narrators';
        break;
      }

      case 'book': {
        const book = ctx.data as Book;
        const chapter = getChapter(book);
        if (chapter && chapter.titles) {
          pageTitle = (chapter.titles as Record<string, string>)[lang]
            || chapter.titles.en;
        }
        break;
      }

      case 'verse-detail': {
        const book = ctx.data as Book;
        if (book.kind === 'verse_detail') {
          const d = book.data;
          const chapterTitle = d.chapter_title
            ? ((d.chapter_title as Record<string, string>)[lang] || d.chapter_title.en || '')
            : '';
          const segments = book.index.split(':');
          const bookSlug = segments[0];
          const bookName = bookSlug === 'quran' ? 'Holy Quran' : bookSlug === 'al-kafi' ? 'Al-Kafi' : bookSlug;
          pageTitle = `${d.verse.part_type} ${d.verse.local_index} - ${chapterTitle} - ${bookName}`;
        }
        break;
      }

      case 'narrator': {
        const narrator = ctx.data as Narrator;
        if (narrator && narrator.titles) {
          pageTitle = (narrator.titles as Record<string, string>)[lang]
            || narrator.titles.en
            || narrator.titles.ar;
        }
        break;
      }
    }

    const fullTitle = pageTitle ? `${pageTitle} - ${SITE}` : SITE;
    this.titleService.setTitle(fullTitle);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.isBrowser) {
      const siteEl = document.getElementById('site');
      if (siteEl) {
        siteEl.removeEventListener('scroll', this.onSiteScroll);
      }
    }
  }
}
