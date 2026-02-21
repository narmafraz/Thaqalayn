import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { Book, getChapter, Narrator } from '@app/models';
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
    private titleService: Title,
    private router: Router,
    private store: Store,
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects || event.url;
        const path = url.replace(/^#?\/?/, '/').split('?')[0];

        for (const [route, title] of Object.entries(AppComponent.STATIC_TITLES)) {
          if (path === route) {
            this.titleService.setTitle(`${title} - Thaqalayn`);
            return;
          }
        }

        if (path === '/books' || path === '/' || path === '') {
          this.titleService.setTitle('Thaqalayn');
          return;
        }

        if (path.startsWith('/people/narrators/index')) {
          this.titleService.setTitle('Narrators - Thaqalayn');
          return;
        }
      })
    );

    this.subscriptions.push(
      this.store.select(BooksState.getCurrentNavigatedPart).subscribe((book: Book) => {
        if (!book) return;
        const chapter = getChapter(book);
        if (chapter && chapter.titles && chapter.titles.en) {
          this.titleService.setTitle(`${chapter.titles.en} - Thaqalayn`);
        }
      })
    );

    this.subscriptions.push(
      this.store.select(PeopleState.getCurrentNavigatedNarrator).subscribe((narrator: Narrator) => {
        if (!narrator || !narrator.titles) return;
        const name = narrator.titles.en || narrator.titles.ar;
        if (name) {
          this.titleService.setTitle(`${name} - Thaqalayn`);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
