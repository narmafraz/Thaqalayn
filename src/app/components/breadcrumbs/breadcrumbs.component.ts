import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Crumb, Narrator } from '@app/models';
import { I18nService } from '@app/services/i18n.service';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { PeopleState } from '@store/people/people.state';
import { Observable } from 'rxjs';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-breadcrumbs',
    templateUrl: './breadcrumbs.component.html',
    styleUrls: ['./breadcrumbs.component.scss'],
    standalone: false
})
export class BreadcrumbsComponent {
  crumbs$: Observable<Crumb[]> = inject(Store).select(BooksState.getCurrentNavigatedCrumbs);
  narrator$: Observable<Narrator> = inject(Store).select(PeopleState.getCurrentNavigatedNarrator);
  currentLang$: Observable<string>;

  constructor(private store: Store, private i18nService: I18nService) {
    this.currentLang$ = this.i18nService.currentLang$;
  }

  getCrumbTitle(crumb: Crumb, lang: string): string {
    return crumb.titles[lang] || crumb.titles['en'] || crumb.titles['ar'] || '';
  }
}
