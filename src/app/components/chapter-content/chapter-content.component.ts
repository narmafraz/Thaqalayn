import { ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, inject, Input, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ContentType, isAiTranslation, getAiLang, getAiTranslationText } from '@app/models/ai-content';
import { Book, BOOK_DISPLAY_NAMES, ChapterContent, Crumb, Verse, VerseRef } from '@app/models';
import { BookAuthor, getBookAuthor } from '@app/data/book-authors';
import { I18nService } from '@app/services/i18n.service';
import { AudioService } from '@app/services/audio.service';
import { BookmarkService } from '@app/services/bookmark.service';
import { BooksService } from '@app/services/books.service';
import { VerseLoaderService } from '@app/services/verse-loader.service';
import { ShareCardService } from '@app/services/share-card.service';
import { TafsirService, TafsirEdition } from '@app/services/tafsir.service';
import { AiPreferencesService, ViewMode } from '@app/services/ai-preferences.service';
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

  // Jump to verse state
  jumpTarget: number | null = null;

  // Metadata density: collapsed by default, expand per verse
  expandedMetadata = new Set<number>();

  // Share as image state
  generatingImageIndex: number | null = null;

  // Inline compare state
  expandedCompare = new Map<string, { verse: Verse | null; title: string; loading: boolean; error: string | null }>();

  // Current UI language for reference display
  currentLang = 'en';

  // View mode state
  hasAnyAiContent = false;

  // Book author metadata
  author: BookAuthor | undefined;

  // Shell format lazy-loading state
  verseRefs: VerseRef[] = [];
  isShellFormat = false;
  loadedVerses = new Map<string, Verse>();
  private observer: IntersectionObserver | null = null;
  private observedElements = new Set<Element>();

  private destroyRef = inject(DestroyRef);

  // AI preference visibility flags
  showContentTypeBadges = true;
  showTopicTags = true;

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
    private verseLoader: VerseLoaderService,
    private shareCard: ShareCardService,
    private i18nService: I18nService,
    private renderer: Renderer2,
    private aiPrefs: AiPreferencesService,
  ) {
    this.tafsirEditions = this.tafsirService.editions;
    this.fragment$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(fragment => {
      setTimeout(() => {
          this.viewportScroller.scrollToAnchor(fragment);
      });
    });
  }

  ngOnInit(): void {
    this.i18nService.currentLang$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(lang => {
      this.currentLang = lang;
    });

    this.aiPrefs.preferences$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(prefs => {
      this.showContentTypeBadges = prefs.showContentTypeBadges;
      this.showTopicTags = prefs.showTopicTags;
      this.cdr.markForCheck();
    });

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
      // Derive book author from index (only show at top-level: al-kafi, al-kafi:1)
      const depth = (book.index.match(/:/g) || []).length;
      this.author = depth <= 1 ? getBookAuthor(book.index) : undefined;

      // Detect shell format vs legacy
      this.isShellFormat = !!(book.data.verse_refs?.length) && !book.data.verses?.length;
      if (this.isShellFormat) {
        this.verseRefs = book.data.verse_refs!;
        this.loadedVerses.clear();
        this.setupIntersectionObserver();
        // For shell format, derive AI content from verse_translations
        this.hasAnyAiContent = book.data.verse_translations?.some(id => id.endsWith('.ai')) || false;
      } else {
        this.verseRefs = [];
        this.destroyObserver();
        this.checkAiContent(book);
      }

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
    this.destroyObserver();
    const host = this.el.nativeElement;
    host.removeEventListener('touchstart', this.onTouchStart);
    host.removeEventListener('touchend', this.onTouchEnd);
  }

  // --- Lazy-loading support ---

  private setupIntersectionObserver(): void {
    this.destroyObserver();
    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const path = (entry.target as HTMLElement).getAttribute('data-path');
            if (path && !this.loadedVerses.has(path)) {
              this.verseLoader.loadVerse(path).subscribe(verse => {
                if (verse) {
                  this.loadedVerses.set(path, verse);
                  this.cdr.markForCheck();
                }
              });
            }
            this.observer?.unobserve(entry.target);
            this.observedElements.delete(entry.target);
          }
        });
      },
      { rootMargin: '200px' }
    );

    // Observe skeleton elements after a tick (DOM needs to render first)
    setTimeout(() => this.observeSkeletons());
  }

  observeSkeletons(): void {
    if (!this.observer) return;
    const skeletons = this.el.nativeElement.querySelectorAll('.verse-skeleton[data-path]');
    skeletons.forEach((el: Element) => {
      if (!this.observedElements.has(el)) {
        this.observer!.observe(el);
        this.observedElements.add(el);
      }
    });
  }

  private destroyObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.observedElements.clear();
  }

  trackByRef(_index: number, ref: VerseRef): string {
    return ref.path || `heading-${ref.local_index}`;
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

  get currentViewMode(): ViewMode {
    return this.aiPrefs.viewMode;
  }

  onViewModeChange(mode: ViewMode): void {
    this.aiPrefs.setViewMode(mode);
  }

  private checkAiContent(book: ChapterContent): void {
    this.hasAnyAiContent = book?.data?.verses?.some(
      v => !!(v.ai?.chunks?.length || v.ai?.word_analysis?.length)
    ) || false;
  }

  getInBookReference(crumbs: Crumb[], verse: Verse): string {
    let result = '';
    const lang = this.currentLang;

    crumbs.forEach(crumb => {
      const title = crumb.indexed_titles[lang] || crumb.indexed_titles['en'] || crumb.indexed_titles['ar'] || '';
      result += title + ' ';
    });

    result += verse.part_type + ' ' + verse.local_index;

    return result;
  }

  getBookName(crumbs: Crumb[]): string {
    if (crumbs.length > 0) {
      const lang = this.currentLang;
      return crumbs[0].titles[lang] || crumbs[0].titles['en'] || crumbs[0].titles['ar'] || '';
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

  jumpToVerse(): void {
    if (!this.jumpTarget) return;
    const anchor = 'h' + this.jumpTarget;
    this.viewportScroller.scrollToAnchor(anchor);

    // Highlight the target verse card
    const target = this.el.nativeElement.querySelector('#' + anchor);
    if (target) {
      const card = target.closest('mat-card');
      if (card) {
        this.renderer.addClass(card, 'highlight-pulse');
        setTimeout(() => this.renderer.removeClass(card, 'highlight-pulse'), 2000);
      }
    }

    // Update URL fragment
    this.router.navigate([], {
      fragment: anchor,
      queryParamsHandling: 'preserve',
    });
  }

  toggleMetadata(index: number): void {
    if (this.expandedMetadata.has(index)) {
      this.expandedMetadata.delete(index);
    } else {
      this.expandedMetadata.add(index);
    }
    this.cdr.markForCheck();
  }

  isMetadataExpanded(index: number): boolean {
    return this.expandedMetadata.has(index);
  }

  isQuranBook(bookIndex: string): boolean {
    return bookIndex.startsWith('quran:');
  }

  getJumpLabel(bookIndex: string): string {
    return this.isQuranBook(bookIndex) ? 'book.jumpToAyah' : 'book.jumpToHadith';
  }

  getVerseCount(book: any): number {
    if (book?.data?.verse_refs?.length) {
      return book.data.verse_refs.filter((r: any) => r.part_type === 'Hadith' || r.part_type === 'Verse').length;
    }
    return book?.data?.verses?.filter((v: any) => v.part_type === 'Hadith' || v.part_type === 'Verse').length || 0;
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
        if (book.kind === 'verse_list') {
          if (book.data.verses) {
            // Legacy format: verses inline
            const found = book.data.verses.find(v => v.local_index === verseIdx);
            entry.verse = found || null;
            entry.title = book.data.titles?.en || chapterIndex;
            if (!found) entry.error = 'Verse not found';
          } else {
            // Shell format: load verse_detail individually
            entry.title = book.data.titles?.en || chapterIndex;
            const versePath = path;
            const vIdx = path.startsWith('/books/') ? path.slice(7) : path;
            this.booksService.getPart(vIdx).subscribe({
              next: (vBook: Book) => {
                if (vBook.kind === 'verse_detail') {
                  entry.verse = (vBook as any).data.verse;
                  entry.loading = false;
                } else {
                  entry.error = 'Unexpected verse format';
                }
                this.cdr.markForCheck();
              },
              error: () => {
                entry.error = 'Failed to load verse';
                this.cdr.markForCheck();
              }
            });
            return; // Don't markForCheck yet — inner subscribe will
          }
        } else if (book.kind === 'verse_detail') {
          entry.verse = (book as any).data.verse;
          entry.title = (book as any).data.chapter_title?.en || chapterIndex;
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
    if (verse.translations) {
      const keys = Object.keys(verse.translations);
      if (keys.length > 0) return verse.translations[keys[0]];
    }
    // Fall back to AI translation if no human translations
    if (verse.ai?.chunks) {
      const aiText = getAiTranslationText(verse.ai, 'en');
      if (aiText) return aiText;
    }
    return null;
  }

  private static readonly CONTENT_TYPE_LABELS: Record<ContentType, string> = {
    legal_ruling: 'Legal Ruling',
    ethical_teaching: 'Ethical Teaching',
    narrative: 'Narrative',
    prophetic_tradition: 'Prophetic Tradition',
    quranic_commentary: "Qur'anic Commentary",
    supplication: 'Supplication',
    creedal: 'Creedal',
    eschatological: 'Eschatological',
    biographical: 'Biographical',
    theological: 'Theological',
    exhortation: 'Exhortation',
    cosmological: 'Cosmological',
  };

  getContentTypeLabel(type: ContentType): string {
    return ChapterContentComponent.CONTENT_TYPE_LABELS[type] || type;
  }

  formatLabel(text: string): string {
    return text.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  getQuranRefLink(ref: string): string {
    const parts = ref.split(':');
    return parts.length >= 1 ? 'quran:' + parts[0] : '';
  }

  getQuranRefFragment(ref: string): string {
    const parts = ref.split(':');
    return parts.length >= 2 ? 'h' + parts[1] : '';
  }

  hasRelations(verse: Verse): boolean {
    return !!verse.relations && Object.keys(verse.relations).length > 0;
  }

  stripBooksPrefix(path: string): string {
    return path.startsWith('/books/') ? path.slice(7) : path;
  }

  formatRelationPath(path: string): string {
    const raw = path.startsWith('/books/') ? path.slice(7) : path;
    const parts = raw.split(':');
    const bookId = parts[0];
    const bookName = BOOK_DISPLAY_NAMES[bookId] || bookId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const segments = parts.slice(1);
    if (!segments.length) return bookName;
    return `${bookName} ${segments.join(':')}`;
  }

  async shareAsImage(book: ChapterContent, verse: Verse, crumbs: Crumb[]): Promise<void> {
    this.generatingImageIndex = verse.local_index;
    this.cdr.markForCheck();
    try {
      const arabicText = (verse.text || []).join(' ').replace(/<[^>]*>/g, '');
      const translations = verse.translations || {};
      const transKeys = Object.keys(translations);
      const transTexts = transKeys.length > 0 ? translations[transKeys[0]] : [];
      const translationText = (transTexts || []).join(' ').replace(/<[^>]*>/g, '');
      const reference = `${verse.part_type} ${verse.local_index}`;
      const bookTitle = this.getBookName(crumbs) || book.data.titles?.en || book.index;
      const grading = verse.gradings?.[0] ? this.parseGrading(verse.gradings[0]).term : undefined;

      await this.shareCard.shareAsImage({
        arabicText,
        translationText,
        reference,
        bookTitle,
        grading,
      });
    } catch {
      // Failed to generate/share
    }
    this.generatingImageIndex = null;
    this.cdr.markForCheck();
  }
}
