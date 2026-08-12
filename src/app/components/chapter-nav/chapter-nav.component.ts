import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Navigation } from '@app/models';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-chapter-nav',
    templateUrl: './chapter-nav.component.html',
    styleUrls: ['./chapter-nav.component.scss'],
    standalone: false
})
export class ChapterNavComponent {
  // 'compact' renders icon-only buttons for the sticky chapter toolbar;
  // 'pager' renders labeled prev/next buttons for the end of the chapter.
  @Input() variant: 'compact' | 'pager' = 'compact';

  nav$: Observable<Navigation> = inject(Store).select(BooksState.getBookNavigation);
}
