import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Bookmark, BookmarkService, ReadingProgress } from '@app/services/bookmark.service';
import { Subscription } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-bookmarks',
  templateUrl: './bookmarks.component.html',
  styleUrls: ['./bookmarks.component.scss']
})
export class BookmarksComponent implements OnInit, OnDestroy {

  bookmarks: Bookmark[] = [];
  readingProgress: ReadingProgress[] = [];
  private subs: Subscription[] = [];

  constructor(
    private bookmarkService: BookmarkService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.bookmarkService.bookmarks$.subscribe(bm => {
        this.bookmarks = bm;
        this.cdr.markForCheck();
      })
    );
    this.subs.push(
      this.bookmarkService.readingProgress$.subscribe(rp => {
        this.readingProgress = rp;
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  removeBookmark(path: string): void {
    this.bookmarkService.removeBookmark(path);
  }

  clearProgress(bookId: string): void {
    this.bookmarkService.clearReadingProgress(bookId);
  }

  getRouterLink(path: string): string {
    // path is like "/books/al-kafi:1:2:3" -> "/books/al-kafi:1:2:3" for routerLink
    return path;
  }

  getRouterLinkSegments(path: string): string[] {
    // path like "/books/al-kafi:1:2:3:4" -> ['/books', 'al-kafi:1:2:3:4']
    const clean = path.replace(/^\//, '');
    const slashIdx = clean.indexOf('/');
    if (slashIdx > 0) {
      return ['/' + clean.substring(0, slashIdx), clean.substring(slashIdx + 1)];
    }
    return [path];
  }

  formatBookId(bookId: string): string {
    const names: Record<string, string> = {
      'quran': 'Quran',
      'al-kafi': 'Al-Kafi',
    };
    return names[bookId] || bookId;
  }

  async exportBookmarks(): Promise<void> {
    const json = await this.bookmarkService.exportBookmarks();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thaqalayn-bookmarks.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async importBookmarks(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const text = await file.text();
    try {
      const count = await this.bookmarkService.importBookmarks(text);
      alert(`Imported ${count} bookmark(s)`);
    } catch {
      alert('Invalid bookmark file');
    }
    input.value = '';
  }
}
