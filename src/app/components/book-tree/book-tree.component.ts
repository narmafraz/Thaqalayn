import { FlatTreeControl } from '@angular/cdk/tree';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { IndexedTitles, IndexState } from '@store/index/index.state';
import { RouterState } from '@store/router/router.state';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface BookTreeNode {
  path: string;
  titleEn: string;
  titleAr: string;
  level: number;
  expandable: boolean;
  partType: string;
  localIndex: number | undefined;
}

interface IndexEntry {
  title: string;
  local_index?: number;
  part_type?: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-book-tree',
    templateUrl: './book-tree.component.html',
    styleUrls: ['./book-tree.component.scss'],
    standalone: false
})
export class BookTreeComponent implements OnInit, OnDestroy {
  searchQuery = '';

  treeControl: FlatTreeControl<BookTreeNode>;

  allNodes: BookTreeNode[] = [];
  visibleNodes: BookTreeNode[] = [];

  private expandedPaths = new Set<string>();
  private subscriptions: Subscription[] = [];

  constructor(
    private store: Store,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.treeControl = new FlatTreeControl<BookTreeNode>(
      (node) => node.level,
      (node) => node.expandable
    );
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.store
        .select(IndexState.getBookForLanguage)
        .pipe(filter((fn) => !!fn))
        .subscribe((getBookForLanguage) => {
          const enIndex = getBookForLanguage('en');
          const arIndex = getBookForLanguage('ar');
          if (enIndex || arIndex) {
            this.buildTree(enIndex, arIndex);
          }
        })
    );

    // Expand to current route on init
    this.subscriptions.push(
      this.store.select(RouterState.getBookPartIndex).subscribe((index) => {
        if (index) {
          this.expandToPath('/books/' + index);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  hasChild(_: number, node: BookTreeNode): boolean {
    return node.expandable;
  }

  isExpanded(node: BookTreeNode): boolean {
    return this.expandedPaths.has(node.path);
  }

  toggle(node: BookTreeNode): void {
    if (this.expandedPaths.has(node.path)) {
      this.collapseNode(node.path);
    } else {
      this.expandedPaths.add(node.path);
    }
    this.updateVisibleNodes();
  }

  navigate(node: BookTreeNode): void {
    const index = node.path.replace('/books/', '');
    this.router.navigate(['/books', index], {
      queryParamsHandling: 'preserve',
    });
  }

  onSearchChange(): void {
    if (this.searchQuery.trim()) {
      this.filterTree(this.searchQuery.trim());
    } else {
      this.updateVisibleNodes();
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.updateVisibleNodes();
  }

  private buildTree(
    enIndex: IndexedTitles | undefined,
    arIndex: IndexedTitles | undefined
  ): void {
    const mergedIndex = enIndex || arIndex;
    if (!mergedIndex) return;

    const paths = Object.keys(mergedIndex).sort((a, b) => {
      return this.comparePaths(a, b);
    });

    // Determine which paths have children
    const pathSet = new Set(paths);
    const hasChildren = new Set<string>();
    for (const p of paths) {
      const parent = p.substring(0, p.lastIndexOf(':'));
      if (parent && pathSet.has(parent)) {
        hasChildren.add(parent);
      }
      // Also handle top-level books like /books/al-kafi vs /books/al-kafi:1
      const slashParent = p.substring(0, p.lastIndexOf(':'));
      if (slashParent) {
        hasChildren.add(slashParent);
      }
    }

    this.allNodes = paths.map((path) => {
      const enEntry = enIndex ? (enIndex[path] as unknown as IndexEntry) : undefined;
      const arEntry = arIndex ? (arIndex[path] as unknown as IndexEntry) : undefined;
      const level = this.getPathLevel(path);

      return {
        path,
        titleEn: enEntry?.title || '',
        titleAr: arEntry?.title || '',
        level,
        expandable: hasChildren.has(path),
        partType: enEntry?.part_type || arEntry?.part_type || '',
        localIndex: enEntry?.local_index ?? arEntry?.local_index,
      };
    });

    this.updateVisibleNodes();
    this.cdr.markForCheck();
  }

  private getPathLevel(path: string): number {
    // /books/al-kafi = level 0
    // /books/al-kafi:1 = level 1
    // /books/al-kafi:1:1 = level 2
    // /books/quran = level 0
    // /books/quran:1 = level 1
    const withoutPrefix = path.replace('/books/', '');
    const colons = withoutPrefix.split(':').length - 1;
    return colons;
  }

  private comparePaths(a: string, b: string): number {
    const partsA = a.replace('/books/', '').split(':');
    const partsB = b.replace('/books/', '').split(':');

    for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
      if (partsA[i] !== partsB[i]) {
        const numA = parseInt(partsA[i], 10);
        const numB = parseInt(partsB[i], 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return partsA[i].localeCompare(partsB[i]);
      }
    }
    return partsA.length - partsB.length;
  }

  private updateVisibleNodes(): void {
    this.visibleNodes = this.allNodes.filter((node) => {
      if (node.level === 0) return true;
      // Check all ancestors are expanded
      return this.areAncestorsExpanded(node.path);
    });
    this.cdr.markForCheck();
  }

  private areAncestorsExpanded(path: string): boolean {
    let current = path;
    while (true) {
      const lastColon = current.lastIndexOf(':');
      if (lastColon === -1) {
        // Check if the parent is at the /books/xxx level
        // This means current is like /books/al-kafi which is a root node
        return true;
      }
      const parent = current.substring(0, lastColon);
      if (!this.expandedPaths.has(parent)) {
        return false;
      }
      current = parent;
      // If parent is a root (no colons in the part after /books/), stop
      if (!parent.replace('/books/', '').includes(':')) {
        return true;
      }
    }
  }

  private collapseNode(path: string): void {
    this.expandedPaths.delete(path);
    // Also collapse all descendants
    for (const expanded of Array.from(this.expandedPaths)) {
      if (expanded.startsWith(path + ':')) {
        this.expandedPaths.delete(expanded);
      }
    }
  }

  private expandToPath(path: string): void {
    let current = path;
    while (true) {
      const lastColon = current.lastIndexOf(':');
      if (lastColon === -1) break;
      const parent = current.substring(0, lastColon);
      this.expandedPaths.add(parent);
      current = parent;
    }
    this.updateVisibleNodes();
  }

  private filterTree(query: string): void {
    const normalizedQuery = this.normalizeForSearch(query.toLowerCase());

    const matchingPaths = new Set<string>();

    // Find all nodes that match the search
    for (const node of this.allNodes) {
      const normalizedEn = this.normalizeForSearch(
        this.stripHtml(node.titleEn).toLowerCase()
      );
      const normalizedAr = this.normalizeArabic(node.titleAr);

      if (
        normalizedEn.includes(normalizedQuery) ||
        normalizedAr.includes(normalizedQuery)
      ) {
        matchingPaths.add(node.path);
        // Also add all ancestors
        let current = node.path;
        while (true) {
          const lastColon = current.lastIndexOf(':');
          if (lastColon === -1) break;
          current = current.substring(0, lastColon);
          matchingPaths.add(current);
        }
      }
    }

    // Auto-expand parents of matches
    for (const path of matchingPaths) {
      const node = this.allNodes.find((n) => n.path === path);
      if (node?.expandable) {
        this.expandedPaths.add(path);
      }
    }

    this.visibleNodes = this.allNodes.filter((node) => {
      if (!matchingPaths.has(node.path)) return false;
      if (node.level === 0) return true;
      return this.areAncestorsExpanded(node.path);
    });

    this.cdr.markForCheck();
  }

  private normalizeForSearch(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  /** Strip HTML tags for search matching */
  private stripHtml(text: string): string {
    return text.replace(/<[^>]*>/g, '');
  }

  /** Normalize Arabic text for search: strip diacritics, normalize letter forms */
  private normalizeArabic(text: string): string {
    let normalized = this.stripHtml(text);
    // Strip tashkeel (diacritical marks)
    normalized = normalized.replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, '');
    // Remove tatweel (kashida)
    normalized = normalized.replace(/\u0640/g, '');
    // Normalize hamza variants to bare alef
    normalized = normalized.replace(/[\u0622\u0623\u0625\u0627]/g, '\u0627');
    // Normalize teh marbuta to heh
    normalized = normalized.replace(/\u0629/g, '\u0647');
    // Normalize alef maksura to yeh
    normalized = normalized.replace(/\u0649/g, '\u064A');
    return normalized.toLowerCase().trim();
  }
}
