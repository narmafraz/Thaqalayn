import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MultiLingualText, Verse } from '@app/models';
import { BookAuthor } from '@app/data/book-authors';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-book-titles',
    templateUrl: './book-titles.component.html',
    styleUrls: ['./book-titles.component.scss'],
    standalone: false
})
export class BookTitlesComponent {
  @Input() titles: MultiLingualText;
  @Input() descriptions: MultiLingualText;
  @Input() verse: Verse;
  @Input() headingLevel: 1 | 2 = 1;
  @Input() author: BookAuthor | undefined;
}
