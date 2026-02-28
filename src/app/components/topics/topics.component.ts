import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngxs/store';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { IndexState, IndexedTitles } from '@store/index/index.state';
import { AiContentService, TopicTaxonomy } from '@app/services/ai-content.service';

export interface Topic {
  path: string;
  title: string;
  arabicTitle: string;
  bookPath: string;
  chapterCount: number;
  category: string;
}

export interface TopicCategory {
  name: string;
  icon: string;
  topics: Topic[];
}

export interface AiTopicCategory {
  key: string;
  label: string;
  totalCount: number;
  subtopics: { key: string; label: string; count: number; paths: string[] }[];
  expanded: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-topics',
  templateUrl: './topics.component.html',
  styleUrls: ['./topics.component.scss'],
  standalone: false,
})
export class TopicsComponent implements OnInit, OnDestroy {

  categories: TopicCategory[] = [];
  filteredCategories: TopicCategory[] = [];
  searchQuery = '';

  // AI Topics tab
  aiTopicCategories: AiTopicCategory[] = [];
  filteredAiCategories: AiTopicCategory[] = [];
  aiTopicsAvailable = false;
  aiTopicsLoading = true;
  aiSearchQuery = '';

  activeTab: 'books' | 'ai-topics' | 'phrases' = 'books';

  private subscriptions: Subscription[] = [];

  constructor(
    private store: Store,
    private cdr: ChangeDetectorRef,
    private aiContentService: AiContentService,
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.store
        .select(state => state.index?.books)
        .pipe(filter(books => books && Object.keys(books).length > 0))
        .subscribe((books: Record<string, IndexedTitles>) => {
          const enIndex = books['en'];
          const arIndex = books['ar'];
          if (enIndex) {
            this.categories = this.buildCategories(enIndex, arIndex);
            this.applyFilter();
            this.cdr.markForCheck();
          }
        })
    );

    // Load AI topics
    this.subscriptions.push(
      this.aiContentService.getTopics().subscribe(topics => {
        this.aiTopicsLoading = false;
        if (topics) {
          this.aiTopicsAvailable = true;
          this.aiTopicCategories = this.buildAiTopicCategories(topics);
          this.filteredAiCategories = this.aiTopicCategories;
        }
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  setActiveTab(tab: 'books' | 'ai-topics' | 'phrases'): void {
    this.activeTab = tab;
  }

  filterTopics(query: string): void {
    this.searchQuery = query;
    this.applyFilter();
  }

  filterAiTopics(query: string): void {
    this.aiSearchQuery = query;
    this.applyAiFilter();
  }

  toggleAiCategory(category: AiTopicCategory): void {
    category.expanded = !category.expanded;
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
        topics: cat.topics.filter(t =>
          t.title.toLowerCase().includes(q) ||
          t.arabicTitle.includes(q) ||
          t.category.toLowerCase().includes(q)
        )
      }))
      .filter(cat => cat.topics.length > 0);
  }

  private applyAiFilter(): void {
    const q = this.aiSearchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredAiCategories = this.aiTopicCategories;
      return;
    }
    this.filteredAiCategories = this.aiTopicCategories
      .map(cat => ({
        ...cat,
        subtopics: cat.subtopics.filter(st =>
          st.label.toLowerCase().includes(q) ||
          st.key.toLowerCase().includes(q) ||
          cat.label.toLowerCase().includes(q)
        ),
        expanded: true,
      }))
      .filter(cat => cat.subtopics.length > 0);
  }

  private buildAiTopicCategories(taxonomy: TopicTaxonomy): AiTopicCategory[] {
    const categories: AiTopicCategory[] = [];

    for (const [l1Key, l2s] of Object.entries(taxonomy)) {
      const subtopics = Object.entries(l2s).map(([l2Key, entry]) => ({
        key: l2Key,
        label: this.formatLabel(l2Key),
        count: entry.count,
        paths: entry.paths,
      }));

      const totalCount = subtopics.reduce((sum, st) => sum + st.count, 0);

      categories.push({
        key: l1Key,
        label: this.formatLabel(l1Key),
        totalCount,
        subtopics: subtopics.sort((a, b) => b.count - a.count),
        expanded: false,
      });
    }

    return categories.sort((a, b) => b.totalCount - a.totalCount);
  }

  private buildCategories(enIndex: IndexedTitles, arIndex: IndexedTitles | undefined): TopicCategory[] {
    const bookEntries: Topic[] = [];

    for (const [path, entry] of Object.entries(enIndex)) {
      if (entry.part_type === 'Book' && path.startsWith('/books/al-kafi')) {
        const arTitle = arIndex?.[path]?.title || '';
        const chapterCount = this.countChildren(enIndex, path, 'Chapter');
        bookEntries.push({
          path,
          title: this.cleanTitle(entry.title),
          arabicTitle: arTitle,
          bookPath: path,
          chapterCount,
          category: this.categorize(entry.title),
        });
      }
    }

    const categoryMap = new Map<string, Topic[]>();
    for (const topic of bookEntries) {
      const list = categoryMap.get(topic.category) || [];
      list.push(topic);
      categoryMap.set(topic.category, list);
    }

    const categoryIcons: Record<string, string> = {
      'Theology': 'auto_awesome',
      'Knowledge & Ethics': 'school',
      'Jurisprudence': 'gavel',
      'Daily Life': 'home',
      'Family & Life Events': 'family_restroom',
      'History & Biography': 'history_edu',
      'Worship': 'mosque',
      'Other': 'category',
    };

    const categoryOrder = ['Theology', 'Knowledge & Ethics', 'Worship', 'Jurisprudence', 'Daily Life', 'Family & Life Events', 'History & Biography', 'Other'];

    return categoryOrder
      .filter(name => categoryMap.has(name))
      .map(name => ({
        name,
        icon: categoryIcons[name] || 'category',
        topics: categoryMap.get(name)!.sort((a, b) => a.title.localeCompare(b.title)),
      }));
  }

  private countChildren(index: IndexedTitles, parentPath: string, partType: string): number {
    let count = 0;
    const prefix = parentPath + ':';
    for (const [path, entry] of Object.entries(index)) {
      if (path.startsWith(prefix) && entry.part_type === partType) {
        const remainder = path.substring(prefix.length);
        if (!remainder.includes(':')) {
          count++;
        }
      }
    }
    return count;
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/<a[^>]*><\/a>/g, '')
      .replace(/<sup>[^<]*<\/sup>/g, '')
      .replace(/^THE BOOK OF /i, '')
      .replace(/^The Book of /i, '')
      .replace(/^The Book - /i, '')
      .trim();
  }

  private categorize(title: string): string {
    const t = title.toLowerCase().replace(/<[^>]*>/g, '');

    if (t.includes('tawheed') || t.includes('oneness') || t.includes('divine authority') ||
        t.includes('hujja') || t.includes('proof')) {
      return 'Theology';
    }
    if (t.includes('knowledge') || t.includes('intellect') || t.includes('ignorance') ||
        t.includes('merits of the knowledge') || t.includes('belief') || t.includes('disbelief') ||
        t.includes('faith') || t.includes('emān')) {
      return 'Knowledge & Ethics';
    }
    if (t.includes('salat') || t.includes('salāt') || t.includes('prayer') ||
        t.includes('zakāt') || t.includes('zakat') || t.includes('zakaat') ||
        t.includes('fasting') || t.includes('fasts') || t.includes('ṣiyām') || t.includes('صيام') ||
        t.includes('hajj') || t.includes('supplication') || t.includes('jihad') ||
        t.includes('quran') || t.includes('dua')) {
      return 'Worship';
    }
    if (t.includes('cleanliness') || t.includes('menstruation') || t.includes('funerals') ||
        t.includes('marriage') || t.includes('nikāh') || t.includes('divorce') ||
        t.includes('trade') || t.includes('subsistence') || t.includes('inheritance') || t.includes('مواريث') ||
        t.includes('judicial') || t.includes('judgement') || t.includes('rulings') || t.includes('قضاء') ||
        t.includes('hudood') || t.includes('ḥudūd') || t.includes('penalties') || t.includes('حدود') ||
        t.includes('testimony') || t.includes('testimonies') || t.includes('شهادات') ||
        t.includes('oaths') || t.includes('vows') ||
        t.includes('slaughter') || t.includes('hunting') ||
        t.includes('foodstuffs') || t.includes('أطعمة') || t.includes('drinks') || t.includes('أشربة') ||
        t.includes('wergild') || t.includes('compensat') || t.includes('ديات') ||
        t.includes('bequests') || t.includes('وصايا') ||
        t.includes('emancipation') || t.includes('عتق')) {
      return 'Jurisprudence';
    }
    if (t.includes('social') || t.includes('living') || t.includes('manners') || t.includes('etiquette') ||
        t.includes('companions') || t.includes('relationships') || t.includes('outfits') || t.includes('beautif') ||
        t.includes('domestic animals') || t.includes('دواجن') || t.includes('garden')) {
      return 'Daily Life';
    }
    if (t.includes('birth') || t.includes('history') || t.includes('biography') ||
        t.includes('aqeeqa') || t.includes('عقيقة')) {
      return 'Family & Life Events';
    }
    return 'Other';
  }
}
