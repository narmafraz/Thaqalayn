import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MultiLingualText, Verse } from '@app/models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-book-titles',
  templateUrl: './book-titles.component.html',
  styleUrls: ['./book-titles.component.scss']
})
export class BookTitlesComponent {
  @Input() titles: MultiLingualText;
  @Input() descriptions: MultiLingualText;
  @Input() verse: Verse;
}
