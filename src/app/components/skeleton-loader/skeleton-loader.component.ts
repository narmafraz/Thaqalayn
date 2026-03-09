import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type SkeletonVariant = 'chapter-list' | 'verse-list' | 'narrator' | 'search' | 'people-list';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-skeleton-loader',
  templateUrl: './skeleton-loader.component.html',
  styleUrls: ['./skeleton-loader.component.scss'],
  standalone: false
})
export class SkeletonLoaderComponent {
  @Input() variant: SkeletonVariant = 'chapter-list';
}
