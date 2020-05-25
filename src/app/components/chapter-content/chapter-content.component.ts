import { ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { ChapterContent } from '@app/models';
import { Select } from '@ngxs/store';
import { RouterState } from '@store/router/router.state';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-chapter-content',
  templateUrl: './chapter-content.component.html',
  styleUrls: ['./chapter-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
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

}
