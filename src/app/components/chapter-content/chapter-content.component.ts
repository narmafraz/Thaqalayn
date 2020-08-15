import { ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Chapter, ChapterContent, Verse } from '@app/models';
import { Navigate } from '@ngxs/router-plugin';
import { Select, Store } from '@ngxs/store';
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
  @Select(RouterState.getUrlFragment) fragment$: Observable<string>;
  @Select(BooksState.getTranslationIfInBookOrDefault) translation$: Observable<string>;
  @Select(BooksState.getTranslationClass) translationClass$: Observable<string>;

  @Input() book$: Observable<ChapterContent>;

  constructor(private viewportScroller: ViewportScroller, private store: Store) {
    this.fragment$.subscribe(fragment => {
      setTimeout(() => {
          this.viewportScroller.scrollToAnchor(fragment);
      });
    });
  }

  selectedTranslation(value: string) {
    this.store.dispatch(new Navigate([], {translation: value}, {queryParamsHandling: 'merge'}));
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
