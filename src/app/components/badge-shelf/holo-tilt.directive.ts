import { AfterViewInit, Directive, ElementRef, HostListener, NgZone, OnDestroy, inject } from '@angular/core';

/**
 * Inspired by simeydotme/hover-tilt — a thin tilt-on-pointer-move primitive
 * for the holographic badge tiles. Updates four CSS custom properties on the
 * host element:
 *
 *  --pointer-x / --pointer-y    Cursor position within the element, in %
 *  --pointer-from-center        0..1 — distance from center (used to fade shimmer)
 *  --rotate-x / --rotate-y      Tilt amounts in degrees
 *
 * No animation library, no images, no service-side state. ~70 lines.
 */
@Directive({
  selector: '[appHoloTilt]',
  standalone: false,
})
export class HoloTiltDirective implements AfterViewInit, OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private zone = inject(NgZone);

  /** Max tilt in degrees on either axis. Larger looks gaudier; 8° is a good middle. */
  private static readonly MAX_TILT = 8;
  /** Reduced motion: respected. */
  private prefersReducedMotion = false;

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    // Initialize neutral state so the CSS variables exist before first hover.
    this.setVars(50, 50, 0, 0, 0);
  }

  ngOnDestroy(): void {
    // Nothing to clean up — HostListener bindings auto-detach with the directive.
  }

  @HostListener('pointermove', ['$event'])
  onMove(ev: PointerEvent): void {
    if (this.prefersReducedMotion) return;
    // Run outside Angular — these updates don't need change detection and
    // would otherwise hammer the digest loop during fast pointer moves.
    this.zone.runOutsideAngular(() => {
      const rect = this.el.nativeElement.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 100;
      const y = ((ev.clientY - rect.top) / rect.height) * 100;
      // Tilt: center 50/50 = no tilt; corners give max tilt.
      const rotateY = ((x - 50) / 50) * HoloTiltDirective.MAX_TILT;
      const rotateX = ((50 - y) / 50) * HoloTiltDirective.MAX_TILT;
      const fromCenter = Math.min(1, Math.hypot((x - 50) / 50, (y - 50) / 50));
      this.setVars(x, y, rotateX, rotateY, fromCenter);
    });
  }

  @HostListener('pointerleave')
  onLeave(): void {
    this.zone.runOutsideAngular(() => this.setVars(50, 50, 0, 0, 0));
  }

  private setVars(x: number, y: number, rotateX: number, rotateY: number, fromCenter: number): void {
    const s = this.el.nativeElement.style;
    s.setProperty('--pointer-x', `${x}%`);
    s.setProperty('--pointer-y', `${y}%`);
    s.setProperty('--rotate-x', `${rotateX}deg`);
    s.setProperty('--rotate-y', `${rotateY}deg`);
    s.setProperty('--pointer-from-center', String(fromCenter));
  }
}
