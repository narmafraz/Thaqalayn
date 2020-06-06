import { ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { Chapter, ChapterContent, Verse } from '@app/models';
import { Select } from '@ngxs/store';
import { RouterState } from '@store/router/router.state';
import { Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chapter-content',
  templateUrl: './chapter-content.component.html',
  styleUrls: ['./chapter-content.component.scss'],
})
export class ChapterContentComponent implements OnInit {
  @Select(RouterState.getUrlFragment) fragment$: Observable<string>;

  @Input() book$: Observable<ChapterContent>;


  constructor(private viewportScroller: ViewportScroller) {
    this.fragment$.subscribe(fragment => {
      setTimeout(() => {
          this.viewportScroller.scrollToAnchor(fragment);
      });
    });
  }

  ngOnInit(): void {
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
