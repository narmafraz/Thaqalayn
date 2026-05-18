import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';

import { ConarratorSummary } from '../people-content/people-content.component';
import { IMAM_IDS } from '../people-list/people-list.component';

/** Pre-computed render data for a single node in the SVG. */
interface NetworkNode {
  id: number;
  name: string;
  count: number;
  x: number;
  y: number;
  /** Radius of the node circle, sized by hadith-count rank. */
  r: number;
  isImam: boolean;
  /** Edge stroke width to centre, ∝ count. */
  edgeWidth: number;
}

/**
 * PPL-19 — radial SVG visualisation of a narrator's top co-narrators.
 *
 * Pure presentation: takes the precomputed `topConarrators` from the parent
 * `people-content` component (already sorted, max 10 entries) and lays
 * them out around a circle. Edge thickness ∝ shared-hadith count. Imam
 * nodes get a distinct fill.
 *
 * Why no d3 / no force-simulation: a static radial layout is enough for
 * 8-10 nodes — adding a force lib for one visualisation is bundle weight
 * we don't need. The current narrator is fixed at the centre; siblings
 * are evenly spaced around the perimeter, biggest at the top.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-narrator-network',
  templateUrl: './narrator-network.component.html',
  styleUrls: ['./narrator-network.component.scss'],
  standalone: false,
})
export class NarratorNetworkComponent implements OnChanges {
  /** Centre node: the narrator whose profile we're on. */
  @Input() centerId: number | string = '';
  @Input() centerName = '';
  /** Top co-narrators, already sorted by count desc. We render up to 8. */
  @Input() topConarrators: ConarratorSummary[] = [];

  /** Visible viewport in SVG units. Coordinates are 0..VIEW_BOX. */
  static readonly VIEW_BOX = 480;
  static readonly CENTRE = NarratorNetworkComponent.VIEW_BOX / 2;
  static readonly ORBIT_RADIUS = 160;
  static readonly CENTRE_NODE_RADIUS = 36;

  readonly VIEW_BOX = NarratorNetworkComponent.VIEW_BOX;
  readonly CENTRE = NarratorNetworkComponent.CENTRE;
  readonly CENTRE_NODE_RADIUS = NarratorNetworkComponent.CENTRE_NODE_RADIUS;

  /** Final layout for the template. Recomputed when @Inputs change. */
  nodes: NetworkNode[] = [];
  centerIsImam = false;

  ngOnChanges(_changes: SimpleChanges): void {
    this.layout();
  }

  private layout(): void {
    const top = (this.topConarrators || []).slice(0, 8);
    if (top.length === 0) {
      this.nodes = [];
      return;
    }

    const maxCount = Math.max(...top.map(t => t.count), 1);
    // Spread N nodes around the orbit, with the biggest at -π/2 (top of SVG)
    // and remaining evenly spaced clockwise.
    const angleStep = (2 * Math.PI) / top.length;
    const startAngle = -Math.PI / 2;

    this.nodes = top.map((t, i) => {
      const ratio = t.count / maxCount;
      const angle = startAngle + i * angleStep;
      return {
        id: t.id,
        name: t.name,
        count: t.count,
        x: NarratorNetworkComponent.CENTRE + NarratorNetworkComponent.ORBIT_RADIUS * Math.cos(angle),
        y: NarratorNetworkComponent.CENTRE + NarratorNetworkComponent.ORBIT_RADIUS * Math.sin(angle),
        // Node radius scales 14 → 24 by count. Smallest co-narrator still gets a tappable circle.
        r: 14 + 10 * ratio,
        isImam: t.id in IMAM_IDS,
        // Edge width scales 1.5 → 7. Visible even at the low end.
        edgeWidth: 1.5 + 5.5 * ratio,
      };
    });

    this.centerIsImam = +String(this.centerId) in IMAM_IDS;
  }

  /** Stable trackBy for *ngFor. */
  trackById = (_i: number, n: NetworkNode): number => n.id;

  /** Pad-aware label position — push label outward from the centre so it
   *  doesn't overlap the node circle. */
  labelX(n: NetworkNode): number {
    const dx = n.x - NarratorNetworkComponent.CENTRE;
    const dy = n.y - NarratorNetworkComponent.CENTRE;
    const len = Math.hypot(dx, dy) || 1;
    return n.x + (dx / len) * (n.r + 8);
  }
  labelY(n: NetworkNode): number {
    const dx = n.x - NarratorNetworkComponent.CENTRE;
    const dy = n.y - NarratorNetworkComponent.CENTRE;
    const len = Math.hypot(dx, dy) || 1;
    return n.y + (dy / len) * (n.r + 8);
  }
  /** SVG text-anchor: nodes on the right of the centre anchor at start;
   *  left side at end; very top / bottom at middle. */
  labelAnchor(n: NetworkNode): 'start' | 'middle' | 'end' {
    const dx = n.x - NarratorNetworkComponent.CENTRE;
    if (Math.abs(dx) < 30) return 'middle';
    return dx > 0 ? 'start' : 'end';
  }
}
