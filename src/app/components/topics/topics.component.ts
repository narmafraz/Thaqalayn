import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngxs/store';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { IndexState, IndexedTitles } from '@store/index/index.state';

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

  private subscriptions: Subscription[] = [];

  constructor(private store: Store, private cdr: ChangeDetectorRef) {}

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
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  filterTopics(query: string): void {
    this.searchQuery = query;
    this.applyFilter();
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
