import { ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Book, ChapterContent, Crumb, Verse } from '@app/models';
import { AudioService } from '@app/services/audio.service';
import { BookmarkService } from '@app/services/bookmark.service';
import { BooksService } from '@app/services/books.service';
import { TafsirService, TafsirEdition } from '@app/services/tafsir.service';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { RouterState } from '@store/router/router.state';
import { Observable, Subscription } from 'rxjs';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-chapter-content',
    templateUrl: './chapter-content.component.html',
    styleUrls: ['./chapter-content.component.scss'],
    standalone: false
})
export class ChapterContentComponent implements OnInit, OnDestroy {
  fragment$: Observable<string> = inject(Store).select(RouterState.getUrlFragment);
  translation$: Observable<string> = inject(Store).select(BooksState.getTranslationIfInBookOrDefault);
  crumbs$: Observable<Crumb[]> = inject(Store).select(BooksState.getCurrentNavigatedCrumbs);

  @Input() book$: Observable<ChapterContent>;

  bookmarkedPaths = new Set<string>();
  annotatedPaths = new Map<string, string>();
  editingNotePath: string | null = null;
  editingNoteText = '';
  private sub: Subscription | null = null;

  audioState$ = this.audioService.state$;

  // Tafsir state
  tafsirEditions: TafsirEdition[] = [];
  selectedTafsirEdition = 'en-tafisr-ibn-kathir';
  expandedTafsir = new Map<number, string>();
  loadingTafsir = new Set<number>();

  // Touch swipe state
  private touchStartX = 0;
  private touchStartY = 0;
  private currentNav: { prev: string | null; next: string | null } = { prev: null, next: null };

  // Inline compare state
  expandedCompare = new Map<string, { verse: Verse | null; title: string; loading: boolean; error: string | null }>();

  constructor(
    private store: Store,
    private viewportScroller: ViewportScroller,
    private bookmarkService: BookmarkService,
    private cdr: ChangeDetectorRef,
    public audioService: AudioService,
    private tafsirService: TafsirService,
    private router: Router,
    private el: ElementRef,
    private booksService: BooksService,
  ) {
    this.tafsirEditions = this.tafsirService.editions;
    this.fragment$.subscribe(fragment => {
      setTimeout(() => {
          this.viewportScroller.scrollToAnchor(fragment);
      });
    });
  }

  ngOnInit(): void {
    this.sub = this.book$.subscribe(book => {
      if (!book) return;
      // Track reading progress
      const title = book.data.titles?.en || book.index;
      this.bookmarkService.updateReadingProgress('/books/' + book.index, title);
      // Cache nav for swipe
      this.currentNav = {
        prev: book.data.nav?.prev || null,
        next: book.data.nav?.next || null,
      };
      // Load bookmark and annotation states for all verses
      this.loadBookmarkStates(book);
      this.loadAnnotationStates(book);
    });

    // Touch swipe navigation
    const host = this.el.nativeElement;
    host.addEventListener('touchstart', this.onTouchStart, { passive: true });
    host.addEventListener('touchend', this.onTouchEnd, { passive: true });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    const host = this.el.nativeElement;
    host.removeEventListener('touchstart', this.onTouchStart);
    host.removeEventListener('touchend', this.onTouchEnd);
  }

  private onTouchStart = (e: TouchEvent): void => {
    this.touchStartX = e.changedTouches[0].screenX;
    this.touchStartY = e.changedTouches[0].screenY;
  };

  private onTouchEnd = (e: TouchEvent): void => {
    const dx = e.changedTouches[0].screenX - this.touchStartX;
    const dy = e.changedTouches[0].screenY - this.touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Only trigger on horizontal swipes (>80px) that are more horizontal than vertical
    if (absDx < 80 || absDy > absDx * 0.6) return;

    if (dx > 0 && this.currentNav.prev) {
      // Swipe right → previous chapter
      this.router.navigate(['/books', this.currentNav.prev.replace('/books/', '')], {
        queryParamsHandling: 'preserve',
      });
    } else if (dx < 0 && this.currentNav.next) {
      // Swipe left → next chapter
      this.router.navigate(['/books', this.currentNav.next.replace('/books/', '')], {
        queryParamsHandling: 'preserve',
      });
    }
  };

  getInBookReference(crumbs: Crumb[], verse: Verse): string {
    let result = '';

    crumbs.forEach(crumb => {
      result += crumb.indexed_titles.en + ' ';
    });

    result += verse.part_type + ' ' + verse.local_index;

    return result;
  }

  getBookName(crumbs: Crumb[]): string {
    if (crumbs.length > 0) {
      return crumbs[0].titles.en;
    }
    return '';
  }

  isVerseBookmarked(bookIndex: string, verse: Verse): boolean {
    const path = '/books/' + bookIndex + ':' + verse.local_index;
    return this.bookmarkedPaths.has(path);
  }

  async toggleVerseBookmark(bookIndex: string, verse: Verse, crumbs: Crumb[]): Promise<void> {
    const path = '/books/' + bookIndex + ':' + verse.local_index;
    const title = this.getBookName(crumbs) + ' ' + this.getInBookReference(crumbs, verse);
    const added = await this.bookmarkService.toggleBookmark(path, title);
    if (added) {
      this.bookmarkedPaths.add(path);
    } else {
      this.bookmarkedPaths.delete(path);
    }
    this.cdr.markForCheck();
  }

  isQuranBook(bookIndex: string): boolean {
    return bookIndex.startsWith('quran:');
  }

  getQuranSurah(bookIndex: string): number {
    // bookIndex like "quran:1" -> surah 1
    const parts = bookIndex.split(':');
    return parts.length >= 2 ? parseInt(parts[1], 10) : 0;
  }

  toggleAudio(bookIndex: string, ayah: number): void {
    const surah = this.getQuranSurah(bookIndex);
    if (surah > 0) {
      this.audioService.togglePlayPause(surah, ayah);
    }
  }

  toggleTafsir(bookIndex: string, ayah: number): void {
    if (this.expandedTafsir.has(ayah)) {
      this.expandedTafsir.delete(ayah);
      this.cdr.markForCheck();
      return;
    }
    const surah = this.getQuranSurah(bookIndex);
    if (surah <= 0) return;

    this.loadingTafsir.add(ayah);
    this.cdr.markForCheck();

    this.tafsirService.getAyahTafsir(surah, ayah, this.selectedTafsirEdition)
      .subscribe(text => {
        this.loadingTafsir.delete(ayah);
        this.expandedTafsir.set(ayah, text || 'No tafsir available for this verse.');
        this.cdr.markForCheck();
      });
  }

  onTafsirEditionChange(bookIndex: string): void {
    // Reload all currently expanded tafsirs with the new edition
    const surah = this.getQuranSurah(bookIndex);
    if (surah <= 0) return;
    const ayahs = Array.from(this.expandedTafsir.keys());
    ayahs.forEach(ayah => {
      this.loadingTafsir.add(ayah);
      this.tafsirService.getAyahTafsir(surah, ayah, this.selectedTafsirEdition)
        .subscribe(text => {
          this.loadingTafsir.delete(ayah);
          this.expandedTafsir.set(ayah, text || 'No tafsir available for this verse.');
          this.cdr.markForCheck();
        });
    });
    this.cdr.markForCheck();
  }

  getVersePath(bookIndex: string, verse: Verse): string {
    return '/books/' + bookIndex + ':' + verse.local_index;
  }

  hasNote(bookIndex: string, verse: Verse): boolean {
    return this.annotatedPaths.has(this.getVersePath(bookIndex, verse));
  }

  getNoteText(bookIndex: string, verse: Verse): string {
    return this.annotatedPaths.get(this.getVersePath(bookIndex, verse)) || '';
  }

  isEditingNote(bookIndex: string, verse: Verse): boolean {
    return this.editingNotePath === this.getVersePath(bookIndex, verse);
  }

  toggleNoteEditor(bookIndex: string, verse: Verse): void {
    const path = this.getVersePath(bookIndex, verse);
    if (this.editingNotePath === path) {
      this.editingNotePath = null;
    } else {
      this.editingNotePath = path;
      this.editingNoteText = this.annotatedPaths.get(path) || '';
    }
    this.cdr.markForCheck();
  }

  async saveNote(bookIndex: string, verse: Verse): Promise<void> {
    const path = this.getVersePath(bookIndex, verse);
    if (this.editingNoteText.trim()) {
      await this.bookmarkService.saveAnnotation(path, this.editingNoteText.trim());
      this.annotatedPaths.set(path, this.editingNoteText.trim());
    } else {
      await this.bookmarkService.deleteAnnotation(path);
      this.annotatedPaths.delete(path);
    }
    this.editingNotePath = null;
    this.cdr.markForCheck();
  }

  async deleteNote(bookIndex: string, verse: Verse): Promise<void> {
    const path = this.getVersePath(bookIndex, verse);
    await this.bookmarkService.deleteAnnotation(path);
    this.annotatedPaths.delete(path);
    this.editingNotePath = null;
    this.editingNoteText = '';
    this.cdr.markForCheck();
  }

  parseGrading(raw: string): { scholar: string; term: string; cssClass: string } {
    // Format: "Scholar Name: <span>Arabic term</span> - Source Reference"
    const match = raw.match(/^(.+?):\s*<span>\s*(.+?)\s*<\/span>/);
    if (!match) return { scholar: raw, term: '', cssClass: 'grading-unknown' };
    const scholar = match[1].trim();
    const term = match[2].trim();
    return { scholar, term, cssClass: this.getGradingClass(term) };
  }

  getGradingClass(term: string): string {
    const lower = term.toLowerCase();
    if (lower.includes('صحيح') || lower.includes('sahih')) return 'grading-sahih';
    if (lower.includes('حسن') || lower.includes('hasan')) return 'grading-hasan';
    if (lower.includes('ضعيف') || lower.includes("da'if") || lower.includes('daif')) return 'grading-daif';
    if (lower.includes('معتبر') || lower.includes("mu'tabar") || lower.includes('muatabar')) return 'grading-mutabar';
    if (lower.includes('مجهول') || lower.includes('majhul')) return 'grading-majhul';
    if (lower.includes('موثق') || lower.includes('muwathaq')) return 'grading-muwathaq';
    return 'grading-unknown';
  }

  private async loadAnnotationStates(book: ChapterContent): Promise<void> {
    const annotations = await this.bookmarkService.getAnnotations();
    this.annotatedPaths.clear();
    const prefix = '/books/' + book.index + ':';
    for (const ann of annotations) {
      if (ann.path.startsWith(prefix) || ann.path === '/books/' + book.index) {
        this.annotatedPaths.set(ann.path, ann.text);
      }
    }
    this.cdr.markForCheck();
  }

  private async loadBookmarkStates(book: ChapterContent): Promise<void> {
    const bookmarks = await this.bookmarkService.getBookmarks();
    this.bookmarkedPaths.clear();
    for (const bm of bookmarks) {
      this.bookmarkedPaths.add(bm.path);
    }
    this.cdr.markForCheck();
  }

  // Inline comparative view
  toggleCompareVerse(path: string): void {
    if (this.expandedCompare.has(path)) {
      this.expandedCompare.delete(path);
      this.cdr.markForCheck();
      return;
    }

    const entry = { verse: null as Verse | null, title: '', loading: true, error: null as string | null };
    this.expandedCompare.set(path, entry);
    this.cdr.markForCheck();

    const stripped = path.replace('/books/', '');
    const parts = stripped.split(':');
    const verseIdx = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : 0;
    const chapterIndex = parts.slice(0, -1).join(':');

    this.booksService.getPart(chapterIndex).subscribe({
      next: (book: Book) => {
        entry.loading = false;
        if (book.kind === 'verse_list' && book.data.verses) {
          const found = book.data.verses.find(v => v.local_index === verseIdx);
          entry.verse = found || null;
          entry.title = book.data.titles?.en || chapterIndex;
          if (!found) entry.error = 'Verse not found';
        } else {
          entry.error = 'Unexpected data format';
        }
        this.cdr.markForCheck();
      },
      error: () => {
        entry.loading = false;
        entry.error = 'Failed to load';
        this.cdr.markForCheck();
      }
    });
  }

  isCompareExpanded(path: string): boolean {
    return this.expandedCompare.has(path);
  }

  getCompareData(path: string) {
    return this.expandedCompare.get(path);
  }

  getFirstTranslation(verse: Verse): string[] | null {
    if (!verse.translations) return null;
    const keys = Object.keys(verse.translations);
    return keys.length > 0 ? verse.translations[keys[0]] : null;
  }
}
