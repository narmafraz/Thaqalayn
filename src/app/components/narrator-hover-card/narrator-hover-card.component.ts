import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NarratorMetadata } from '@app/models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-narrator-hover-card',
  templateUrl: './narrator-hover-card.component.html',
  styleUrls: ['./narrator-hover-card.component.scss'],
  standalone: false
})
export class NarratorHoverCardComponent {
  @Input() narrator: NarratorMetadata | null = null;
  @Input() narratorId: number;
  @Input() positionX = 0;
  @Input() positionY = 0;
}
