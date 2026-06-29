import { isPlatformServer, ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, HostBinding, inject, Input, OnDestroy, OnInit, PLATFORM_ID, Renderer2 } from '@angular/core';
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
import { AiPreferencesService } from '@app/services/ai-preferences.service';
import { RelatedChaptersService, RelatedChapter } from '@app/services/related-chapters.service';
import { ReadingStatsService } from '@app/services/reading-stats.service';
import { SeoService } from '@app/services/seo.service';
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
  selectedTafsirEdition = 'en.mizan';
  expandedTafsir = new Map<number, string>();
  loadingTafsir = new Set<number>();

  // Touch swipe state
  private touchStartX = 0;
  private touchStartY = 0;
  private currentNav: { prev: string | null; next: string | null } = { prev: null, next: null };

  // Jump to verse state
  jumpTarget: number | null = null;

  /**
   * RE-17: local_index of the first unread Hadith/Verse in this chapter, or
   * null. Drives the "jump to first unread" FAB. Only set when the chapter is
   * partially read (≥1 read AND ≥1 unread) — a fresh chapter's first-unread is
   * just the top (useless) and a fully-read chapter has nothing to jump to.
   * Recomputed whenever read-state or the loaded chapter changes.
   */
  firstUnreadIndex: number | null = null;
  /** Ordered (index, path) for every Hadith/Verse in the chapter — the basis for firstUnreadIndex. */
  private orderedVersePaths: Array<{ index: number; path: string }> = [];

  // Metadata density: collapsed by default, expand per verse
  expandedMetadata = new Set<number>();

  // Share as image state
  generatingImageIndex: number | null = null;


  // Inline compare state
  expandedCompare = new Map<string, { verse: Verse | null; title: string; loading: boolean; error: string | null }>();

  // Current UI language for reference display
  currentLang = 'en';

  // Book author metadata
  author: BookAuthor | undefined;

  // Shell format lazy-loading state
  verseRefs: VerseRef[] = [];
  isShellFormat = false;
  loadedVerses = new Map<string, Verse>();
  private observer: IntersectionObserver | null = null;
  private observedElements = new Set<Element>();

  // Read-state tracking (RE-01)
  readPaths = new Set<string>();
  private readObserver: IntersectionObserver | null = null;
  private readObservedElements = new Set<Element>();
  private readDwellTimers = new Map<Element, ReturnType<typeof setTimeout>>();
  /** Verse must stay ≥50% visible for this long before being auto-marked read. */
  private static readonly READ_DWELL_MS = 3000;
  /** Pending auto-marks are flushed in batches to avoid Dexie churn on fast scroll. */
  private pendingReadFlush: ReturnType<typeof setTimeout> | null = null;
  private pendingReadPaths = new Set<string>();

  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  // Cap on how many lazy verses to prefetch under SSR. Keeps prerender HTML
  // sizes manageable for very long chapters (some Al-Kafi chapters have 100+
  // hadith). The browser still loads the rest via IntersectionObserver after
  // hydration, so users see the full chapter — but crawlers see at least the
  // first SSR_INLINE_VERSE_LIMIT, which is enough for indexing.
  private static readonly SSR_INLINE_VERSE_LIMIT = 50;

  // AI preference visibility flags
  showContentTypeBadges = true;
  showTopicTags = true;

  /**
   * RE-05: bound to `:host.show-read-marks-off` so the SCSS in this component
   * can disable the `.verse-read` mute/checkmark styling globally based on the
   * user's preference. `true` → class IS present → styling disabled.
   */
  @HostBinding('class.show-read-marks-off') hideReadStyling = false;

  // Related chapters from other books
  /**
   * Related chapters with a read-fraction annotation tacked on (RE-15).
   * Unread chapters are sorted before read ones so the user's eye lands on
   * new material first.
   */
  relatedChapters: Array<RelatedChapter & { fraction: number; isRead: boolean }> = [];

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
    private relatedChaptersService: RelatedChaptersService,
    private readingStats: ReadingStatsService,
    private seo: SeoService,
  ) {
    this.tafsirService.loadEditions().subscribe(editions => {
      this.tafsirEditions = editions;
      if (editions.length > 0 && !editions.find(e => e.id === this.selectedTafsirEdition)) {
        this.selectedTafsirEdition = editions[0].id;
      }
      this.cdr.markForCheck();
    });
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
      this.hideReadStyling = !prefs.muteReadVerses;
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
        if (isPlatformServer(this.platformId) || isLikelyCrawler()) {
          // Two cases land here:
          //   1. True Angular SSR (the 7 prerendered routes don't include
          //      chapter URLs but might in future)
          //   2. Netlify Prerender Extension running headless Chromium —
          //      it executes the browser bundle, not the server bundle,
          //      so isPlatformServer is FALSE there. Detect via user
          //      agent / navigator.webdriver instead.
          // Either way: skip IntersectionObserver and eagerly load verses
          // so the rendered DOM contains all hadith bodies for crawlers.
          this.prefetchVersesForSsr(book);
        } else {
          this.setupIntersectionObserver();
          this.setupReadObserver();
        }
      } else {
        this.verseRefs = [];
        this.destroyObserver();
        // Legacy inline-verse format: still track reads for visible cards.
        if (!isPlatformServer(this.platformId) && !isLikelyCrawler()) {
          this.setupReadObserver();
        }
      }

      // Build the ordered Hadith/Verse path list (basis for "first unread").
      this.buildOrderedVersePaths(book);

      // Load bookmark, annotation, and read states for all verses
      this.loadBookmarkStates(book);
      this.loadAnnotationStates(book);
      this.loadReadStates(book);

      // Load related chapters from other books
      this.relatedChaptersService.getRelatedChapters('/books/' + book.index)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(async related => {
          // RE-15: annotate each related chapter with the user's read
          // fraction, then promote unread ones to the front so new material
          // is what the reader sees first.
          const annotated = await this.readingStats.annotateChapterReadFractions(related);
          annotated.sort((a, b) => {
            if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
            return b.score - a.score;
          });
          this.relatedChapters = annotated;
          this.cdr.markForCheck();
        });
    });

    // Touch swipe navigation
    const host = this.el.nativeElement;
    host.addEventListener('touchstart', this.onTouchStart, { passive: true });
    host.addEventListener('touchend', this.onTouchEnd, { passive: true });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.destroyObserver();
    this.destroyReadObserver();
    this.flushPendingReadsNow();
    const host = this.el.nativeElement;
    host.removeEventListener('touchstart', this.onTouchStart);
    host.removeEventListener('touchend', this.onTouchEnd);
  }

  // --- Lazy-loading support ---

  // SSR path: synchronously kick off verse_detail fetches so Angular's
  // pending-task tracking waits for them before serializing the rendered
  // HTML. Caps at SSR_INLINE_VERSE_LIMIT to keep prerender HTML manageable.
  private prefetchVersesForSsr(book: ChapterContent): void {
    const refs = this.verseRefs.filter(r => !!r.path).slice(0, ChapterContentComponent.SSR_INLINE_VERSE_LIMIT);
    let pending = refs.length;
    for (const ref of refs) {
      this.verseLoader.loadVerse(ref.path!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: verse => {
          if (verse) {
            this.loadedVerses.set(ref.path!, verse);
            this.cdr.markForCheck();
          }
        },
        complete: () => {
          pending--;
          if (pending === 0) this.maybeEmitFaqSeo(book);
        },
        error: () => {
          pending--;
          if (pending === 0) this.maybeEmitFaqSeo(book);
        },
      });
    }
    if (refs.length === 0) this.maybeEmitFaqSeo(book);
  }

  // Build a FAQ list from per-hadith AI seo_question + summary and re-emit
  // the chapter's SEO with FAQPage JSON-LD. Falls back silently if no
  // verses have AI question/answer data — chapter retains the plain Book
  // schema set by app.component.
  private maybeEmitFaqSeo(book: ChapterContent): void {
    const faqs: Array<{ question: string; answer: string }> = [];
    for (const ref of this.verseRefs) {
      if (!ref.path) continue;
      const verse = this.loadedVerses.get(ref.path);
      const ai = verse?.ai;
      const q = ai?.seo_questions?.['en'] || ai?.translations?.['en']?.seo_question;
      const a = ai?.summaries?.['en'] || ai?.translations?.['en']?.summary;
      if (q && a) faqs.push({ question: q, answer: a });
    }
    if (faqs.length === 0) return;

    const titleEn = book.data.titles?.en || book.index;
    this.seo.setBookPageWithFaq(
      book.index,
      titleEn,
      book.data.descriptions?.en,
      faqs,
      this.currentLang,
      undefined,
    );
  }

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
                  // The card replaces the skeleton — re-scan so the new
                  // [data-path] element gets the read observer attached.
                  setTimeout(() => this.observeReadTargets(), 0);
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

  getInBookReference(crumbs: Crumb[], verse: Verse): string {
    let result = '';
    const lang = this.currentLang;

    crumbs.forEach(crumb => {
      const title = crumb.indexed_titles[lang] || crumb.indexed_titles['en'] || crumb.indexed_titles['ar'] || '';
      result += title + ' ';
    });

    result += this.i18nService.translatePartType(verse.part_type) + ' ' + verse.local_index;

    return result;
  }

  getBookName(crumbs: Crumb[]): string {
    if (crumbs.length > 0) {
      const lang = this.currentLang;
      return crumbs[0].titles[lang] || crumbs[0].titles['en'] || crumbs[0].titles['ar'] || '';
    }
    return '';
  }

  translatedPartType(partType: string | undefined | null): string {
    return this.i18nService.translatePartType(partType);
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
    this.scrollToHadith(this.jumpTarget);
  }

  /**
   * RE-17: scroll to the first unread Hadith/Verse and pulse-highlight it.
   * Wired to the floating "jump to first unread" button.
   */
  jumpToFirstUnread(): void {
    if (this.firstUnreadIndex === null) return;
    this.scrollToHadith(this.firstUnreadIndex);
  }

  /** Shared scroll-to-anchor + highlight-pulse + URL-fragment update for a hadith index. */
  private scrollToHadith(index: number): void {
    const anchor = 'h' + index;
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

  // ---------------------------------------------------------------------------
  // Read-state tracking (RE-01)
  // ---------------------------------------------------------------------------

  private async loadReadStates(book: ChapterContent): Promise<void> {
    const bookId = book.index.split(':')[0];
    const reads = await this.bookmarkService.getReadVersesForBook(bookId);
    this.readPaths.clear();
    for (const r of reads) this.readPaths.add(r.path);
    this.recomputeFirstUnread();
    this.cdr.markForCheck();
  }

  /**
   * Snapshot the chapter's Hadith/Verse paths in display order. Headings are
   * skipped. Works for both shell (verse_refs) and legacy (inline verses).
   */
  private buildOrderedVersePaths(book: ChapterContent): void {
    const ordered: Array<{ index: number; path: string }> = [];
    if (this.isShellFormat) {
      for (const ref of this.verseRefs) {
        if (ref.part_type !== 'Hadith' && ref.part_type !== 'Verse') continue;
        if (!ref.path) continue;
        ordered.push({ index: ref.local_index, path: ref.path });
      }
    } else {
      for (const verse of book.data.verses || []) {
        if (verse.part_type !== 'Hadith' && verse.part_type !== 'Verse') continue;
        ordered.push({ index: verse.local_index, path: this.getVersePath(book.index, verse) });
      }
    }
    this.orderedVersePaths = ordered;
  }

  /**
   * Set `firstUnreadIndex` to the first unread Hadith/Verse — but only when the
   * chapter is partially read. If nothing is read the jump target would be the
   * top (pointless), and if everything is read there's nothing to jump to.
   */
  private recomputeFirstUnread(): void {
    let firstUnread: number | null = null;
    let anyRead = false;
    for (const { index, path } of this.orderedVersePaths) {
      if (this.readPaths.has(path)) {
        anyRead = true;
      } else if (firstUnread === null) {
        firstUnread = index;
      }
    }
    this.firstUnreadIndex = anyRead ? firstUnread : null;
  }

  isVerseRead(bookIndex: string, verse: Verse): boolean {
    return this.readPaths.has(this.getVersePath(bookIndex, verse));
  }

  async toggleVerseRead(bookIndex: string, verse: Verse): Promise<void> {
    const path = this.getVersePath(bookIndex, verse);
    if (this.readPaths.has(path)) {
      await this.bookmarkService.unmarkRead(path);
      this.readPaths.delete(path);
    } else {
      await this.bookmarkService.markRead(path, 'manual');
      this.readPaths.add(path);
    }
    this.recomputeFirstUnread();
    this.cdr.markForCheck();
  }

  /** Mark every verse in the chapter up to and including `verse` as read. */
  async markReadUpTo(bookIndex: string, verse: Verse): Promise<void> {
    const cutoff = verse.local_index;
    const paths: string[] = [];
    if (this.isShellFormat) {
      for (const ref of this.verseRefs) {
        if (ref.part_type === 'Heading') continue;
        if (!ref.path) continue;
        if (ref.local_index <= cutoff) paths.push(ref.path);
      }
    }
    if (paths.length === 0) return;
    await this.bookmarkService.markReadBulk(paths, 'manual');
    for (const p of paths) this.readPaths.add(p);
    this.recomputeFirstUnread();
    this.cdr.markForCheck();
  }

  private setupReadObserver(): void {
    this.destroyReadObserver();
    if (typeof IntersectionObserver === 'undefined') return;

    this.readObserver = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          const target = entry.target;
          const path = (target as HTMLElement).getAttribute('data-path');
          if (!path) continue;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Already marked? Stop watching to free observer slots.
            if (this.readPaths.has(path)) {
              this.readObserver?.unobserve(target);
              this.readObservedElements.delete(target);
              continue;
            }
            if (this.readDwellTimers.has(target)) continue;
            const timer = setTimeout(() => {
              this.readDwellTimers.delete(target);
              this.queueAutoMark(path);
              this.readObserver?.unobserve(target);
              this.readObservedElements.delete(target);
            }, ChapterContentComponent.READ_DWELL_MS);
            this.readDwellTimers.set(target, timer);
          } else {
            // Left view (or below the 0.5 threshold) — cancel dwell timer
            const t = this.readDwellTimers.get(target);
            if (t !== undefined) {
              clearTimeout(t);
              this.readDwellTimers.delete(target);
            }
          }
        }
      },
      { threshold: [0.5] }
    );

    setTimeout(() => this.observeReadTargets(), 0);
  }

  /** Observe every `[data-path]` element. Safe to call multiple times — already-observed nodes are skipped. */
  observeReadTargets(): void {
    if (!this.readObserver) return;
    const els = this.el.nativeElement.querySelectorAll('[data-path]') as NodeListOf<HTMLElement>;
    els.forEach((el: HTMLElement) => {
      const path = el.getAttribute('data-path');
      if (!path) return;
      // Skip already-marked verses — no need to watch them.
      if (this.readPaths.has(path)) return;
      if (this.readObservedElements.has(el)) return;
      this.readObserver!.observe(el);
      this.readObservedElements.add(el);
    });
  }

  private destroyReadObserver(): void {
    if (this.readObserver) {
      this.readObserver.disconnect();
      this.readObserver = null;
    }
    this.readObservedElements.clear();
    for (const t of this.readDwellTimers.values()) clearTimeout(t);
    this.readDwellTimers.clear();
  }

  /**
   * Buffer auto-marks and flush in batches via `markReadBulk`. Keeps Dexie
   * writes from thrashing when the user scrolls slowly through many verses.
   */
  private queueAutoMark(path: string): void {
    this.pendingReadPaths.add(path);
    if (this.pendingReadFlush !== null) return;
    this.pendingReadFlush = setTimeout(() => this.flushPendingReadsNow(), 1000);
  }

  private flushPendingReadsNow(): void {
    if (this.pendingReadFlush !== null) {
      clearTimeout(this.pendingReadFlush);
      this.pendingReadFlush = null;
    }
    if (this.pendingReadPaths.size === 0) return;
    const paths = Array.from(this.pendingReadPaths);
    this.pendingReadPaths.clear();
    this.bookmarkService.markReadBulk(paths, 'auto').then(() => {
      for (const p of paths) this.readPaths.add(p);
      this.recomputeFirstUnread();
      this.cdr.markForCheck();
    });
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
      const reference = `${this.i18nService.translatePartType(verse.part_type)} ${verse.local_index}`;
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

// Heuristic to detect crawlers / headless renderers running the browser
// bundle. Used to switch chapter-content from lazy IntersectionObserver
// loading to eager prefetch so the rendered DOM contains all hadith
// bodies. Real users on real browsers fall through to the lazy path.
//
// Triggers on:
//   - navigator.webdriver = true (Selenium, Puppeteer, Playwright,
//     and notably Netlify Prerender's headless Chromium)
//   - Common bot UA strings: Googlebot, Bingbot, GPTBot, ClaudeBot,
//     PerplexityBot, etc., plus the catch-all "HeadlessChrome"
function isLikelyCrawler(): boolean {
  if (typeof navigator === 'undefined') return false;
  if ((navigator as Navigator & { webdriver?: boolean }).webdriver) return true;
  const ua = navigator.userAgent || '';
  return /headlesschrome|googlebot|bingbot|gptbot|claudebot|claude-searchbot|perplexitybot|oai-searchbot|applebot|yandexbot|baiduspider|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|whatsapp|prerender|netlify[ -]prerender/i.test(ua);
}
