import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { NarratorInsightsComponent } from './narrator-insights.component';
import { NarratorAnalysisService } from '@app/services/narrator-analysis.service';
import { NarratorAnalysis, NarratorAnalysisData } from '@app/models';

function sampleData(): NarratorAnalysisData {
  return {
    hadith_count: 5,
    analyzed_count: 5,
    no_chain_count: 0,
    ai_coverage: 5,
    cluster_basis: 'exclude_imams_placeholders',
    independent_paths: 2,
    clusters: [
      { size: 3, local_indices: [1, 2, 3], shared_ids: [10] },
      { size: 2, local_indices: [4, 5], shared_ids: [] },
    ],
    prolific: [{ id: 10, hadith: [1, 2, 3], pct: 0.6 }],
    spine: [{ id: 10, hadith: [1, 2, 3], pct: 1 }],
    sources: [{ id: 99, hadith: [1, 2, 3, 4] }],
    chain_lengths: { min: 2, max: 5, mean: 3.4, median: 3, histogram: { '2': 1, '3': 2, '5': 2 } },
    gradings: { majlisi: { sahih: [1, 2, 3], hasan: [4, 5] } },
    corroboration: [{ id: 99, hadith: [1, 2, 3, 4], independent_paths: 2 }],
    ambiguity: { chains_with_ambiguous: 1, narrators: [{ id: 6, hadith: [3] }] },
    graph: {
      nodes: [{ id: 10, count: 3 }, { id: 11, count: 1 }],
      edges: [{ a: 10, b: 11, weight: 2 }],
    },
    narrators: {
      '10': ['A', 'ا'],
      '11': ['B', 'ب'],
      '99': ['Imam', 'إمام'],
      '6': ['companions', 'أصحاب'],
    },
  };
}

describe('NarratorInsightsComponent', () => {
  let fixture: ComponentFixture<NarratorInsightsComponent>;
  let component: NarratorInsightsComponent;
  let svc: jasmine.SpyObj<NarratorAnalysisService>;

  beforeEach(async () => {
    svc = jasmine.createSpyObj('NarratorAnalysisService', ['get']);
    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [NarratorInsightsComponent],
      providers: [{ provide: NarratorAnalysisService, useValue: svc }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(NarratorInsightsComponent);
    component = fixture.componentInstance;
    component.index = 'al-kafi:1:1:1';
  });

  it('starts collapsed and does not fetch until expanded', () => {
    fixture.detectChanges();
    expect(component.expanded).toBeFalse();
    expect(svc.get).not.toHaveBeenCalled();
  });

  it('fetches the sidecar on first expand only', () => {
    const doc: NarratorAnalysis = { kind: 'narrator_analysis', index: component.index, data: sampleData() };
    svc.get.and.returnValue(of(doc));
    fixture.detectChanges();

    component.toggle();
    expect(svc.get).toHaveBeenCalledOnceWith('al-kafi:1:1:1');
    expect(component.data?.independent_paths).toBe(2);

    component.toggle(); // collapse
    component.toggle(); // re-expand — should not refetch
    expect(svc.get).toHaveBeenCalledTimes(1);
  });

  it('builds deterministic graph geometry from nodes and edges', () => {
    const doc: NarratorAnalysis = { kind: 'narrator_analysis', index: component.index, data: sampleData() };
    svc.get.and.returnValue(of(doc));
    fixture.detectChanges();
    component.toggle();

    expect(component.graphNodes.length).toBe(2);
    expect(component.graphEdges.length).toBe(1);
    // node radius scales with count; node A (count 3) larger than B (count 1)
    const a = component.graphNodes.find(n => n.id === 10)!;
    const b = component.graphNodes.find(n => n.id === 11)!;
    expect(a.r).toBeGreaterThan(b.r);
  });

  it('computes dominantPct from the largest cluster', () => {
    const doc: NarratorAnalysis = { kind: 'narrator_analysis', index: component.index, data: sampleData() };
    svc.get.and.returnValue(of(doc));
    fixture.detectChanges();
    component.toggle();
    expect(component.dominantPct).toBe(60); // 3 of 5
  });

  it('derives chain-length histogram bars sorted ascending', () => {
    const doc: NarratorAnalysis = { kind: 'narrator_analysis', index: component.index, data: sampleData() };
    svc.get.and.returnValue(of(doc));
    fixture.detectChanges();
    component.toggle();
    expect(component.lengthBars.map(b => b.len)).toEqual(['2', '3', '5']);
  });

  it('builds aligned bar charts with a numeric axis covering the max', () => {
    const doc: NarratorAnalysis = { kind: 'narrator_analysis', index: component.index, data: sampleData() };
    svc.get.and.returnValue(of(doc));
    fixture.detectChanges();
    component.toggle();
    const chart = component.prolificChart;
    expect(chart.rows.length).toBe(1);
    expect(chart.ticks[0]).toBe(0);
    expect(chart.scaleMax).toBeGreaterThanOrEqual(3); // covers max count (3)
    // bar width never exceeds the track
    expect(component.pctOf(chart.rows[0].count, chart.scaleMax)).toBeLessThanOrEqual(100);
  });

  it('histogram scale max is >= the tallest bar', () => {
    const doc: NarratorAnalysis = { kind: 'narrator_analysis', index: component.index, data: sampleData() };
    svc.get.and.returnValue(of(doc));
    fixture.detectChanges();
    component.toggle();
    const maxCount = Math.max(...component.lengthBars.map(b => b.count));
    expect(component.histScaleMax).toBeGreaterThanOrEqual(maxCount);
    expect(component.histTicks).toContain(0);
  });

  it('builds hadith fragment links within the chapter', () => {
    expect(component.chapterRoute).toEqual(['/books', 'al-kafi:1:1:1']);
    expect(component.hadithFragment(4)).toBe('h4');
  });

  it('toggles per-row hadith link expansion independently', () => {
    expect(component.isHadithExpanded('prl:10')).toBeFalse();
    component.toggleHadith('prl:10');
    expect(component.isHadithExpanded('prl:10')).toBeTrue();
    expect(component.isHadithExpanded('src:99')).toBeFalse(); // independent key
    component.toggleHadith('prl:10');
    expect(component.isHadithExpanded('prl:10')).toBeFalse();
  });

  it('derives bar counts from the hadith index arrays', () => {
    const doc: NarratorAnalysis = { kind: 'narrator_analysis', index: component.index, data: sampleData() };
    svc.get.and.returnValue(of(doc));
    fixture.detectChanges();
    component.toggle();
    expect(component.prolificChart.rows[0].count).toBe(3);   // [1,2,3]
    expect(component.prolificChart.rows[0].hadith).toEqual([1, 2, 3]);
    expect(component.sourcesChart.rows[0].count).toBe(4);
  });

  it('exposes grading entries with counts and hadith indices', () => {
    const doc: NarratorAnalysis = { kind: 'narrator_analysis', index: component.index, data: sampleData() };
    svc.get.and.returnValue(of(doc));
    fixture.detectChanges();
    component.toggle();
    const entries = component.gradingEntries('majlisi');
    const sahih = entries.find(e => e.grade === 'sahih')!;
    expect(sahih.count).toBe(3);
    expect(sahih.hadith).toEqual([1, 2, 3]);
  });

  it('selects/deselects a graph node and reports its label', () => {
    const doc: NarratorAnalysis = { kind: 'narrator_analysis', index: component.index, data: sampleData() };
    svc.get.and.returnValue(of(doc));
    fixture.detectChanges();
    component.toggle();

    component.selectNode(10);
    expect(component.selectedNode?.id).toBe(10);
    expect(component.label(component.selectedNode!.id)).toBe('A');
    // node 11 is a neighbour of 10 (edge 10-11) -> not muted
    expect(component.isNodeMuted(11)).toBeFalse();
    // tapping again clears selection
    component.selectNode(10);
    expect(component.selectedNode).toBeNull();
  });

  it('mutes non-neighbour nodes when one is selected', () => {
    const data = sampleData();
    data.graph.nodes.push({ id: 12, count: 1 });
    const doc: NarratorAnalysis = { kind: 'narrator_analysis', index: component.index, data };
    svc.get.and.returnValue(of(doc));
    fixture.detectChanges();
    component.toggle();
    component.selectNode(10);
    expect(component.isNodeMuted(12)).toBeTrue(); // 12 has no edge to 10
  });

  it('handles a missing sidecar (null) gracefully', () => {
    svc.get.and.returnValue(of(null));
    fixture.detectChanges();
    component.toggle();
    expect(component.loaded).toBeTrue();
    expect(component.data).toBeNull();
  });

  it('resets state when the chapter index changes', () => {
    const doc: NarratorAnalysis = { kind: 'narrator_analysis', index: component.index, data: sampleData() };
    svc.get.and.returnValue(of(doc));
    fixture.detectChanges();
    component.toggle();
    expect(component.data).not.toBeNull();

    component.index = 'al-kafi:1:1:2';
    component.ngOnChanges();
    expect(component.expanded).toBeFalse();
    expect(component.data).toBeNull();
    expect(component.graphNodes.length).toBe(0);
  });

  it('resolves names from the lookup map, falling back to Arabic then id', () => {
    const doc: NarratorAnalysis = { kind: 'narrator_analysis', index: component.index, data: sampleData() };
    svc.get.and.returnValue(of(doc));
    fixture.detectChanges();
    component.toggle();
    expect(component.label(10)).toBe('A');           // English preferred
    expect(component.label(99)).toBe('Imam');
    expect(component.label(404)).toBe('#404');        // unknown id -> bare id
  });

  it('falls back to Arabic when English is null', () => {
    const data = sampleData();
    data.narrators['50'] = [null, 'العربية'];
    const doc: NarratorAnalysis = { kind: 'narrator_analysis', index: component.index, data };
    svc.get.and.returnValue(of(doc));
    fixture.detectChanges();
    component.toggle();
    expect(component.label(50)).toBe('العربية');
  });
});
