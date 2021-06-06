import { ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Chapter, ChapterContent, Verse } from '@app/models';
import { Select } from '@ngxs/store';
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

  @Input() book$: Observable<ChapterContent>;

  constructor(private viewportScroller: ViewportScroller) {
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

  splitOnLastColon(path: string): string[] {
    const index = path.lastIndexOf(":");
    if (index < 0) {
      return [path, ""];
    }
    return [path.slice(0, index), path.slice(index+1)];
  }

  removeBookPrefix(path: string): string {
    return path.slice(7);
  }

}
