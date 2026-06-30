import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import {
  NarratorAnalysisData,
  NarratorFreq,
  NarratorGraph,
  NarratorHadithRef,
} from '@app/models';
import { NarratorAnalysisService } from '@app/services/narrator-analysis.service';

interface GraphNodePos extends NarratorFreq {
  x: number;
  y: number;
  r: number;
}
interface GraphEdgePos {
  a: number;
  b: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
}

/** One bar: a narrator, its count, and the hadith it appears in. */
interface BarRow {
  id: number;
  count: number;
  hadith: number[];
}
/** A horizontal bar chart with a shared numeric axis. */
interface BarChart {
  rows: BarRow[];
  ticks: number[];   // axis tick values, 0..scaleMax
  scaleMax: number;  // bar widths and tick positions are pct of this
}

/**
 * Opt-in "Narrator insights" panel for a chapter list page.
 *
 * Collapsed by default; the sidecar (`{chapter}.narrators.json`) is fetched
 * only on first expand via `NarratorAnalysisService`, so a reader who never
 * opens it costs zero bandwidth. Renders the precomputed isnad analysis:
 * independent transmission paths, prolific narrators, the binding spine,
 * source/Imam distribution, chain-length stats, grading mix, corroboration,
 * ambiguity flags, and a lightweight isnad graph.
 */
@Component({
  selector: 'app-narrator-insights',
  templateUrl: './narrator-insights.component.html',
  styleUrls: ['./narrator-insights.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class NarratorInsightsComponent implements OnChanges {
  @Input() index!: string;

  expanded = false;
  loading = false;
  loaded = false;
  data: NarratorAnalysisData | null = null;

  // Precomputed SVG graph geometry (built once when data arrives)
  graphNodes: GraphNodePos[] = [];
  graphEdges: GraphEdgePos[] = [];
  readonly graphSize = 320;
  /** Node tapped/focused in the network graph — drives the caption + highlight. */
  selectedNodeId: number | null = null;
  /** Keys (e.g. `prolific:35`) whose hadith-link list is expanded. */
  private expandedHadith = new Set<string>();

  private svc = inject(NarratorAnalysisService);
  private cdr = inject(ChangeDetectorRef);

  ngOnChanges(): void {
    // Chapter changed (route nav reuses the component): reset, keep collapsed.
    this.expanded = false;
    this.loaded = false;
    this.loading = false;
    this.data = null;
    this.graphNodes = [];
    this.graphEdges = [];
    this.selectedNodeId = null;
    this.expandedHadith.clear();
  }

  toggle(): void {
    this.expanded = !this.expanded;
    if (this.expanded && !this.loaded && !this.loading) {
      this.load();
    }
  }

  private load(): void {
    this.loading = true;
    this.svc.get(this.index).subscribe(doc => {
      this.loading = false;
      this.loaded = true;
      this.data = doc?.data ?? null;
      if (this.data) this.buildGraph(this.data.graph);
      this.cdr.markForCheck();
    });
  }

  /**
   * Resolve a narrator id to a display name via the per-file lookup map.
   * Prefer English, fall back to Arabic, then a bare id.
   */
  label(id: number): string {
    const entry = this.data?.narrators?.[id];
    return (entry && (entry[0] || entry[1])) || `#${id}`;
  }

  narratorLink(id: number): string {
    return `/people/narrators/${id}`;
  }

  /** Largest cluster size as a % of analyzed hadith — the "dominance" stat. */
  get dominantPct(): number {
    if (!this.data || !this.data.analyzed_count || !this.data.clusters.length) return 0;
    return Math.round((this.data.clusters[0].size / this.data.analyzed_count) * 100);
  }

  // --- Hadith links ------------------------------------------------------ //
  /** Route + fragment to a hadith within this chapter (scrolls the list). */
  get chapterRoute(): string[] {
    return ['/books', this.index];
  }
  hadithFragment(localIndex: number): string {
    return 'h' + localIndex;
  }
  /** Expand/collapse the hadith-link list for a given row key (e.g. `prolific:35`). */
  toggleHadith(key: string): void {
    if (this.expandedHadith.has(key)) this.expandedHadith.delete(key);
    else this.expandedHadith.add(key);
  }
  isHadithExpanded(key: string): boolean {
    return this.expandedHadith.has(key);
  }

  // --- Horizontal bar charts (prolific, sources) ------------------------- //
  /**
   * "Nice" axis ticks from 0..>=max, ~4-6 evenly spaced steps using a 1/2/5
   * progression. The last tick is >= max so bar ends align with gridlines.
   */
  private niceTicks(max: number): number[] {
    if (max <= 1) return [0, 1];
    const raw = max / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
    const ticks: number[] = [];
    for (let t = 0; t <= max + step / 2; t += step) ticks.push(Math.round(t));
    if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
    return ticks;
  }

  private barChart(rows: NarratorHadithRef[] | undefined): BarChart {
    const list: BarRow[] = (rows || []).map(r => ({
      id: r.id,
      hadith: r.hadith || [],
      count: (r.hadith || []).length,
    }));
    const max = Math.max(1, ...list.map(r => r.count));
    const ticks = this.niceTicks(max);
    const scaleMax = ticks[ticks.length - 1] || 1;
    return { rows: list, ticks, scaleMax };
  }

  get prolificChart(): BarChart {
    return this.barChart(this.data?.prolific);
  }
  get sourcesChart(): BarChart {
    return this.barChart(this.data?.sources);
  }
  /** Bar/tick position as a percentage of the chart's scale. */
  pctOf(value: number, scaleMax: number): number {
    return scaleMax > 0 ? (value / scaleMax) * 100 : 0;
  }

  // --- Chain-length histogram (vertical) --------------------------------- //
  get lengthBars(): Array<{ len: string; count: number }> {
    const cl = this.data?.chain_lengths;
    if (!cl || !('histogram' in cl)) return [];
    const hist = cl.histogram;
    return Object.keys(hist)
      .sort((a, b) => Number(a) - Number(b))
      .map(len => ({ len, count: hist[len] }));
  }
  /** Y-axis ticks (counts) for the histogram, descending for top-down render. */
  get histTicks(): number[] {
    const max = Math.max(1, ...this.lengthBars.map(b => b.count));
    return this.niceTicks(max).slice().reverse();
  }
  get histScaleMax(): number {
    const max = Math.max(1, ...this.lengthBars.map(b => b.count));
    const ticks = this.niceTicks(max);
    return ticks[ticks.length - 1] || 1;
  }

  get gradingScholars(): string[] {
    return this.data ? Object.keys(this.data.gradings) : [];
  }

  gradingEntries(scholar: string): Array<{ grade: string; count: number; hadith: number[] }> {
    const g = this.data?.gradings[scholar] || {};
    return Object.keys(g).map(grade => ({ grade, count: g[grade].length, hadith: g[grade] }));
  }

  /**
   * Deterministic circular layout for the isnad graph — no physics library,
   * no random seeds (which are unavailable under SSR anyway). Nodes are placed
   * evenly on a circle, sized by how many chains they appear in; edge stroke
   * width scales with co-occurrence weight.
   */
  private buildGraph(graph: NarratorGraph): void {
    const nodes = (graph?.nodes || []).slice(0, 24);
    const n = nodes.length;
    if (n === 0) {
      this.graphNodes = [];
      this.graphEdges = [];
      return;
    }
    const cx = this.graphSize / 2;
    const cy = this.graphSize / 2;
    const radius = this.graphSize / 2 - 36;
    const maxCount = Math.max(1, ...nodes.map(nd => nd.count));
    const pos = new Map<number, GraphNodePos>();
    nodes.forEach((nd, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const node: GraphNodePos = {
        ...nd,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        r: 5 + 7 * (nd.count / maxCount),
      };
      pos.set(nd.id, node);
    });
    this.graphNodes = Array.from(pos.values());

    const maxW = Math.max(1, ...(graph.edges || []).map(e => e.weight));
    this.graphEdges = (graph.edges || [])
      .map(e => {
        const a = pos.get(e.a);
        const b = pos.get(e.b);
        if (!a || !b) return null;
        return { a: e.a, b: e.b, x1: a.x, y1: a.y, x2: b.x, y2: b.y, w: 0.5 + 2.5 * (e.weight / maxW) };
      })
      .filter((e): e is GraphEdgePos => e !== null);
  }

  // --- Graph interaction ------------------------------------------------- //
  /** Tap a node to reveal who it is; tapping the same node again clears it. */
  selectNode(id: number): void {
    this.selectedNodeId = this.selectedNodeId === id ? null : id;
  }
  get selectedNode(): GraphNodePos | null {
    return this.graphNodes.find(n => n.id === this.selectedNodeId) || null;
  }
  /** A node is dimmed when another node is selected and it isn't a neighbour. */
  isNodeMuted(id: number): boolean {
    if (this.selectedNodeId === null || id === this.selectedNodeId) return false;
    return !this.graphEdges.some(
      e => (e.a === this.selectedNodeId && e.b === id) || (e.b === this.selectedNodeId && e.a === id),
    );
  }
  isEdgeActive(e: GraphEdgePos): boolean {
    return this.selectedNodeId !== null && (e.a === this.selectedNodeId || e.b === this.selectedNodeId);
  }
  isEdgeMuted(e: GraphEdgePos): boolean {
    return this.selectedNodeId !== null && !this.isEdgeActive(e);
  }
}
