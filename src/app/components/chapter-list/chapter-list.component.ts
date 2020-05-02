import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ChapterList } from '@app/models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chapter-list',
  templateUrl: './chapter-list.component.html',
  styleUrls: ['./chapter-list.component.scss']
})
export class ChapterListComponent {
  @Input() book: ChapterList;

  constructor() { }

}
