import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import type { Metric } from 'web-vitals';

// Reports Core Web Vitals (LCP, INP, CLS, FCP, TTFB) to console once each
// metric is finalized (typically when the page is hidden/backgrounded).
//
// 2026 thresholds tracked here:
//   LCP good < 2.0s,  needs-improvement < 4.0s
//   INP good < 200ms, needs-improvement < 500ms (tightened from 200/500 in
//                     practice — Google has been recommending <150ms)
//   CLS good < 0.1
//
// To wire to a real analytics endpoint (Plausible, GA4, custom):
//   1. Replace the console.log in `report()` with a fetch/sendBeacon call.
//   2. The Metric shape from web-vitals is:
//        { name, value, rating, delta, id, navigationType, ... }
//   3. Use sendBeacon for reliability under page-unload (the library
//      already retries on visibility change for INP/CLS).

@Injectable({ providedIn: 'root' })
export class WebVitalsService {
  private started = false;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  start(): void {
    if (this.started) return;
    if (!isPlatformBrowser(this.platformId)) return;
    this.started = true;

    // Dynamic import keeps web-vitals out of the SSR bundle and only loaded
    // after the initial page render so it doesn't compete for main-thread
    // time during LCP itself.
    import('web-vitals').then(({ onLCP, onINP, onCLS, onFCP, onTTFB }) => {
      onLCP(this.report);
      onINP(this.report);
      onCLS(this.report);
      onFCP(this.report);
      onTTFB(this.report);
    }).catch(() => {
      // Fail silently — telemetry is best-effort; never break the page.
    });
  }

  private report = (metric: Metric): void => {
    // Console-only for now. Wire to analytics by replacing this.
    // eslint-disable-next-line no-console
    console.log(`[web-vitals] ${metric.name}=${Math.round(metric.value * 1000) / 1000} (${metric.rating})`);
  };
}
