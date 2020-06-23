import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { VerseContent } from '@app/models';
import { Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-verse-content',
  templateUrl: './verse-content.component.html',
  styleUrls: ['./verse-content.component.scss']
})
export class VerseContentComponent {
  @Input() book$: Observable<VerseContent>;

}
