import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';

import { MilestoneToast, MilestoneToastService } from '@app/services/milestone-toast.service';

@Component({
  selector: 'app-milestone-toaster',
  templateUrl: './milestone-toaster.component.html',
  styleUrls: ['./milestone-toaster.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MilestoneToasterComponent implements OnInit, OnDestroy {
  private svc = inject(MilestoneToastService);
  private cdr = inject(ChangeDetectorRef);

  toasts: MilestoneToast[] = [];
  private sub: Subscription | null = null;

  ngOnInit(): void {
    this.svc.start();
    this.sub = this.svc.toasts$.subscribe(t => {
      this.toasts = t;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  dismiss(id: number, event?: Event): void {
    event?.stopPropagation();
    this.svc.dismiss(id);
  }

  iconFor(kind: MilestoneToast['kind']): string {
    switch (kind) {
      case 'book-complete':
        return '📖';
      case 'chapter-complete':
        return '✅';
      case 'cumulative':
        return '🌟';
      case 'badge-earned':
        return '🏅';
      default:
        return '🎉';
    }
  }

  trackById(_i: number, t: MilestoneToast): number {
    return t.id;
  }
}
