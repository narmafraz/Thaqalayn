import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Book, getChapter, Narrator } from '@app/models';
import { SeoService } from '@app/services';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { PeopleState } from '@store/people/people.state';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Thaqalayn';
  private subscriptions: Subscription[] = [];

  private static readonly STATIC_TITLES: Record<string, string> = {
    '/about': 'About',
    '/download': 'Download',
    '/support': 'Support',
  };

  constructor(
    private seo: SeoService,
    private router: Router,
    private store: Store,
  ) {}

  ngOnInit(): void {
    // Handle legacy hash-based URLs (redirect #/books/quran:1 to /books/quran:1)
    if (window.location.hash.startsWith('#/')) {
      const newPath = window.location.hash.substring(1);
      // Use replaceState to avoid adding to browser history
      window.history.replaceState(null, '', newPath);
      this.router.navigateByUrl(newPath);
    }

    this.subscriptions.push(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects || event.url;
        const path = url.replace(/^#?\/?/, '/').split('?')[0];

        for (const [route, title] of Object.entries(AppComponent.STATIC_TITLES)) {
          if (path === route) {
            this.seo.setStaticPage(route, title);
            return;
          }
        }

        if (path === '/books' || path === '/' || path === '') {
          this.seo.setHomePage();
          return;
        }

        if (path.startsWith('/people/narrators/index')) {
          this.seo.setNarratorListPage();
          return;
        }
      })
    );

    this.subscriptions.push(
      this.store.select(BooksState.getCurrentNavigatedPart).subscribe((book: Book) => {
        if (!book) return;
        const chapter = getChapter(book);
        if (chapter && chapter.titles && chapter.titles.en) {
          this.seo.setBookPage(
            book.index,
            chapter.titles.en,
            chapter.descriptions?.en
          );
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
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
