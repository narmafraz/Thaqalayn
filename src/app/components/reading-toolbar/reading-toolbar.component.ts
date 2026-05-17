import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AiPreferencesService } from '@app/services/ai-preferences.service';

/**
 * Sticky reading toolbar — the canonical surface for the 3 high-frequency
 * view toggles (chain diagram, diacritics/chunked text, word-by-word).
 * Per DR1, hides on scroll-down and reveals on scroll-up so the toolbar
 * costs no reading-area while the user is committed to reading forward.
 *
 * Mounts at app shell, route-scoped to /books/* by the parent template.
 * State syncs through AiPreferencesService so toolbar / sheet / per-verse
 * footer (until step 5 removes the latter) all reflect one source of truth.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-reading-toolbar',
  templateUrl: './reading-toolbar.component.html',
  styleUrls: ['./reading-toolbar.component.scss'],
  standalone: false,
})
export class ReadingToolbarComponent implements OnInit, OnDestroy {
  private aiPrefs = inject(AiPreferencesService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  showChainDiagram = this.aiPrefs.get('showChainDiagram');
  showDiacritics = this.aiPrefs.get('showDiacritizedByDefault');
  showWordAnalysis = this.aiPrefs.get('showWordByWord');

  /** Hide-on-scroll-down per DR1. The toolbar slides up out of view
   *  when the user scrolls down past a small dead-zone (so micro-scroll
   *  doesn't flicker), and slides back in on any upward scroll. Always
   *  visible within the first TOP_AREA_PX from the top of the page. */
  hidden = false;
  private lastScrollY = 0;
  private readonly DEAD_ZONE_PX = 10;
  private readonly TOP_AREA_PX = 60;

  ngOnInit(): void {
    this.aiPrefs.preferences$.pipe(takeUntil(this.destroy$)).subscribe(prefs => {
      this.showChainDiagram = prefs.showChainDiagram;
      this.showDiacritics = prefs.showDiacritizedByDefault;
      this.showWordAnalysis = prefs.showWordByWord;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const y = window.scrollY;
    // Always-visible top band: any scroll position inside it forces
    // the toolbar back to visible, and the next decisive scroll
    // baselines from here.
    if (y < this.TOP_AREA_PX) {
      this.lastScrollY = y;
      if (this.hidden) {
        this.hidden = false;
        this.cdr.markForCheck();
      }
      return;
    }
    const delta = y - this.lastScrollY;
    // Within dead zone: keep lastScrollY untouched so micro-tick
    // deltas (e.g. smooth-scroll wheel events firing every ~5px)
    // accumulate. Updating lastScrollY here was the bug that made
    // hide-on-scroll silently never trigger during normal browsing.
    if (Math.abs(delta) <= this.DEAD_ZONE_PX) return;
    const next = delta > 0;
    this.lastScrollY = y;
    if (next !== this.hidden) {
      this.hidden = next;
      this.cdr.markForCheck();
    }
  }

  toggleChainDiagram(): void {
    this.aiPrefs.set('showChainDiagram', !this.showChainDiagram);
  }

  toggleDiacritics(): void {
    this.aiPrefs.set('showDiacritizedByDefault', !this.showDiacritics);
  }

  toggleWordAnalysis(): void {
    this.aiPrefs.set('showWordByWord', !this.showWordAnalysis);
  }
}
