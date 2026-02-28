import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { AiContentService, PhraseIndex, PhraseIndexEntry } from '@app/services/ai-content.service';
import { Subscription } from 'rxjs';

export interface PhraseCategory {
  name: string;
  label: string;
  phrases: PhraseDisplay[];
}

export interface PhraseDisplay {
  key: string;
  phraseAr: string;
  phraseEn: string;
  category: string;
  count: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-phrase-list',
  templateUrl: './phrase-list.component.html',
  styleUrls: ['./phrase-list.component.scss'],
  standalone: false,
})
export class PhraseListComponent implements OnInit, OnDestroy {

  categories: PhraseCategory[] = [];
  filteredCategories: PhraseCategory[] = [];
  loading = true;
  available = false;
  searchQuery = '';
  totalPhrases = 0;

  private subscription: Subscription | null = null;

  constructor(
    private aiContentService: AiContentService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.subscription = this.aiContentService.getPhrases().subscribe(phrases => {
      this.loading = false;
      if (phrases) {
        this.available = true;
        this.categories = this.buildCategories(phrases);
        this.filteredCategories = this.categories;
        this.totalPhrases = Object.keys(phrases).length;
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  filterPhrases(query: string): void {
    this.searchQuery = query;
    this.applyFilter();
  }

  formatLabel(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private applyFilter(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredCategories = this.categories;
      return;
    }
    this.filteredCategories = this.categories
      .map(cat => ({
        ...cat,
        phrases: cat.phrases.filter(p =>
          p.phraseAr.includes(q) ||
          p.phraseEn.toLowerCase().includes(q) ||
          p.key.includes(q)
        )
      }))
      .filter(cat => cat.phrases.length > 0);
  }

  private buildCategories(phrases: PhraseIndex): PhraseCategory[] {
    const categoryMap = new Map<string, PhraseDisplay[]>();

    for (const [key, entry] of Object.entries(phrases)) {
      const category = entry.category || 'other';
      const list = categoryMap.get(category) || [];
      list.push({
        key,
        phraseAr: entry.phrase_ar || key,
        phraseEn: entry.phrase_en,
        category,
        count: entry.paths.length,
      });
      categoryMap.set(category, list);
    }

    const categoryOrder = [
      'theological_concept',
      'quranic_echo',
      'prophetic_formula',
      'well_known_saying',
      'jurisprudential_term',
    ];

    const categories: PhraseCategory[] = [];
    const seen = new Set<string>();

    // Add known categories in order
    for (const name of categoryOrder) {
      if (categoryMap.has(name)) {
        seen.add(name);
        const phraseList = categoryMap.get(name)!;
        phraseList.sort((a, b) => b.count - a.count);
        categories.push({
          name,
          label: this.formatLabel(name),
          phrases: phraseList,
        });
      }
    }

    // Add remaining categories
    for (const [name, phraseList] of categoryMap) {
      if (!seen.has(name)) {
        phraseList.sort((a, b) => b.count - a.count);
        categories.push({
          name,
          label: this.formatLabel(name),
          phrases: phraseList,
        });
      }
    }

    return categories;
  }
}
