import { ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { Chapter, ChapterContent, Crumb, Verse } from '@app/models';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { RouterState } from '@store/router/router.state';
import { Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chapter-content',
  templateUrl: './chapter-content.component.html',
  styleUrls: ['./chapter-content.component.scss'],
})
export class ChapterContentComponent {
  fragment$: Observable<string> = inject(Store).select(RouterState.getUrlFragment);
  translation$: Observable<string> = inject(Store).select(BooksState.getTranslationIfInBookOrDefault);
  crumbs$: Observable<Crumb[]> = inject(Store).select(BooksState.getCurrentNavigatedCrumbs);
  
  @Input() book$: Observable<ChapterContent>;

  constructor(private store: Store, private viewportScroller: ViewportScroller) {
    this.fragment$.subscribe(fragment => {
      setTimeout(() => {
          this.viewportScroller.scrollToAnchor(fragment);
      });
    });
  }

  getInBookReference(chapter: Chapter, verse: Verse): string {
    let result = '';

    chapter.crumbs.forEach(crumb => {
      result += crumb.indexed_titles.en + ' ';
    });

    result += verse.part_type + ' ' + verse.local_index;

    return result;
  }

}
