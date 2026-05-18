import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';

import { Badge, BadgeCategory, BADGE_CATALOGUE } from '@app/data/badges';
import { BadgeService } from '@app/services/badge.service';

interface ShelfRow extends Badge {
  earnedAt: Date | null;
}

@Component({
  selector: 'app-badge-shelf',
  templateUrl: './badge-shelf.component.html',
  styleUrls: ['./badge-shelf.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class BadgeShelfComponent implements OnInit, OnDestroy {
  private svc = inject(BadgeService);
  private cdr = inject(ChangeDetectorRef);

  /** Per-category grouped badges. */
  groups: Array<{ category: BadgeCategory; rows: ShelfRow[] }> = [];
  earnedCount = 0;
  totalCount = this.svc.totalCount();

  private sub: Subscription | null = null;

  ngOnInit(): void {
    this.svc.start();
    this.sub = this.svc.earned$.subscribe(earned => {
      const earnedById = new Map(earned.map(e => [e.badgeId, e.earnedAt]));
      this.earnedCount = earned.length;

      const grouped = new Map<BadgeCategory, ShelfRow[]>();
      for (const b of BADGE_CATALOGUE) {
        const row: ShelfRow = { ...b, earnedAt: earnedById.get(b.id) ?? null };
        const list = grouped.get(b.category) ?? [];
        list.push(row);
        grouped.set(b.category, list);
      }

      const categoryOrder: BadgeCategory[] = ['milestone', 'streak', 'book', 'breadth', 'habit'];
      this.groups = categoryOrder
        .filter(cat => grouped.has(cat))
        .map(category => ({ category, rows: grouped.get(category)! }));

      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  trackById(_i: number, b: ShelfRow): string {
    return b.id;
  }
}
