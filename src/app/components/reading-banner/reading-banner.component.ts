import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';

import { ReadingBanner, ReadingBannerService } from '@app/services/reading-banner.service';

@Component({
  selector: 'app-reading-banner',
  templateUrl: './reading-banner.component.html',
  styleUrls: ['./reading-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ReadingBannerComponent implements OnInit, OnDestroy {
  private svc = inject(ReadingBannerService);
  private cdr = inject(ChangeDetectorRef);

  banner: ReadingBanner | null = null;
  private sub: Subscription | null = null;

  ngOnInit(): void {
    this.sub = this.svc.banner$.subscribe(b => {
      this.banner = b;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /** Pick an icon for each banner kind — matches the milestone-toaster idiom. */
  iconFor(kind: ReadingBanner['kind']): string {
    switch (kind) {
      case 'streak-at-risk':
        return '🔥';
      case 'goal-pending':
        return '🎯';
    }
  }

  /** i18n key prefix for the headline. */
  titleKey(kind: ReadingBanner['kind']): string {
    return `reading.banner.${kind === 'streak-at-risk' ? 'streakAtRisk' : 'goalPending'}.title`;
  }

  /** i18n key prefix for the subtitle. */
  subtitleKey(kind: ReadingBanner['kind']): string {
    return `reading.banner.${kind === 'streak-at-risk' ? 'streakAtRisk' : 'goalPending'}.subtitle`;
  }

  /** Where the CTA link navigates. Both kinds go to the bookmarks page so the
   * user sees their streak ring + goal chip immediately, then deep-links into
   * a chapter from there. */
  ctaLink(): string {
    // Could be smarter — pick the user's last-read book — but routing to
    // /bookmarks always works and is unambiguous.
    return '/bookmarks';
  }

  dismiss(event?: Event): void {
    event?.stopPropagation();
    if (!this.banner) return;
    this.svc.dismissForToday(this.banner.kind);
    this.banner = null;
    this.cdr.markForCheck();
  }
}
