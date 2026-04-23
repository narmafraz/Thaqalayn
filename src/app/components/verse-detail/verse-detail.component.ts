import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { ContentType } from '@app/models/ai-content';
import { BOOK_DISPLAY_NAMES, Verse, VerseDetail } from '@app/models';
import { AudioService } from '@app/services/audio.service';
import { BookmarkService } from '@app/services/bookmark.service';
import { Comment, DiscussionService } from '@app/services/discussion.service';
import { SeoService } from '@app/services/seo.service';
import { ShareCardService, ShareCardData } from '@app/services/share-card.service';
import { AiPreferencesService } from '@app/services/ai-preferences.service';
import { ExternalLink, ExternalLinksService } from '@app/services/external-links.service';
import { SyncService } from '@app/services/sync.service';
import { TafsirService, TafsirEdition } from '@app/services/tafsir.service';
import { VerseLoaderService } from '@app/services/verse-loader.service';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

interface CompareEntry {
  path: string;
  verse: Verse | null;
  chapterTitle: string;
  loading: boolean;
  error: string | null;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-verse-detail',
    templateUrl: './verse-detail.component.html',
    styleUrls: ['./verse-detail.component.scss'],
    standalone: false
})
export class VerseDetailComponent implements OnInit, OnDestroy {
  @Input() book$: Observable<VerseDetail>;

  translation$: Observable<string> = inject(Store).select(BooksState.getTranslationIfInBookOrDefault);

  translationClass$: Observable<string> = this.translation$.pipe(
    map(t => t ? t.split('.')[0] : 'en')
  );

  linkCopied = false;
  generatingImage = false;
  isBookmarked = false;
  noteText = '';
  showNoteEditor = false;
  hasNote = false;
  currentTranslation = '';
  private sub: Subscription | null = null;
  private transSub: Subscription | null = null;

  // Comparative view state
  compareEntries = new Map<string, CompareEntry>();
  compareExpanded = false;

  // Tafsir state (Quran only)
  tafsirEditions: TafsirEdition[] = [];
  selectedTafsirEdition = 'en.mizan';
  tafsirExpanded = false;
  tafsirText = '';
  tafsirLoading = false;

  // Discussion state
  discussionEnabled: boolean;
  comments$: Observable<Comment[]>;
  discussionLoading$: Observable<boolean>;
  showCommentEditor = false;
  newCommentText = '';
  isSignedIn = false;

  // AI preference visibility flags
  showContentTypeBadges = true;
  showTopicTags = true;

  // External links
  externalLinks: ExternalLink[] = [];

  constructor(
    private bookmarkService: BookmarkService,
    private cdr: ChangeDetectorRef,
    private seoService: SeoService,
    private shareCard: ShareCardService,
    private discussionService: DiscussionService,
    private syncService: SyncService,
    private aiPrefs: AiPreferencesService,
    private externalLinksService: ExternalLinksService,
    public audioService: AudioService,
    private tafsirService: TafsirService,
    private verseLoader: VerseLoaderService,
  ) {
    this.discussionEnabled = this.discussionService.isConfigured;
    this.comments$ = this.discussionService.comments$;
    this.discussionLoading$ = this.discussionService.loading$;
    this.tafsirService.loadEditions().subscribe(editions => {
      this.tafsirEditions = editions;
      if (editions.length > 0 && !editions.find(e => e.id === this.selectedTafsirEdition)) {
        this.selectedTafsirEdition = editions[0].id;
      }
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    this.aiPrefs.preferences$.subscribe(prefs => {
      this.showContentTypeBadges = prefs.showContentTypeBadges;
      this.showTopicTags = prefs.showTopicTags;
      this.cdr.markForCheck();
    });

    this.transSub = this.translation$.subscribe(t => {
      this.currentTranslation = t || '';
    });
    // Track sign-in state for discussion
    if (this.discussionEnabled) {
      this.syncService.user$.subscribe(user => {
        this.isSignedIn = !!user;
        this.cdr.markForCheck();
      });
    }
    this.sub = this.book$.subscribe(book => {
      if (!book) return;
      const path = '/books/' + book.index;
      // Set SEO metadata with AI data if available
      const verse = book.data.verse;
      const aiSeoQuestion = verse.ai?.seo_questions?.en || verse.ai?.translations?.en?.seo_question;
      const aiSummary = verse.ai?.summaries?.en || verse.ai?.translations?.en?.summary;
      this.seoService.setVerseDetailPageWithAi(
        book.index,
        verse.local_index,
        verse.part_type,
        book.data.chapter_title?.en || '',
        aiSeoQuestion,
        aiSummary,
      );
      this.bookmarkService.isBookmarked(path).then(result => {
        this.isBookmarked = result;
        this.cdr.markForCheck();
      });
      // Load existing annotation
      this.bookmarkService.getAnnotation(path).then(ann => {
        this.noteText = ann?.text || '';
        this.hasNote = !!ann;
        this.showNoteEditor = false;
        this.cdr.markForCheck();
      });
      // Track reading progress
      const title = (book.data.chapter_title?.en || '') + ' ' +
        book.data.verse.part_type + ' ' + book.data.verse.local_index;
      this.bookmarkService.updateReadingProgress(path, title);
      // Compute external links
      this.externalLinks = this.externalLinksService.getExternalLinks(
        path, book.data.source_url || book.data.verse?.source_url
      );
      // Load discussion comments
      if (this.discussionEnabled) {
        this.discussionService.loadComments(path);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.transSub?.unsubscribe();
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

  parseGradingTerm(raw: string): string {
    const match = raw.match(/<span>\s*(.+?)\s*<\/span>/);
    return match ? match[1] : raw;
  }

  parseGradingScholar(raw: string): string {
    const match = raw.match(/^(.+?):/);
    return match ? match[1].trim() : '';
  }

  getChapterRouterLink(chapterPath: string): string {
    return chapterPath.replace('/books/', '');
  }

  isQuranBook(bookIndex: string): boolean {
    return bookIndex.startsWith('quran:') || bookIndex === 'quran';
  }

  getNavRouterLink(path: string): string {
    return path.replace('/books/', '');
  }

  async toggleBookmark(book: VerseDetail): Promise<void> {
    const path = '/books/' + book.index;
    const title = (book.data.chapter_title?.en || '') + ' ' +
      book.data.verse.part_type + ' ' + book.data.verse.local_index;
    const arabicTitle = book.data.chapter_title?.ar;
    this.isBookmarked = await this.bookmarkService.toggleBookmark(path, title, arabicTitle);
    this.cdr.markForCheck();
  }

  async saveNote(book: VerseDetail): Promise<void> {
    const path = '/books/' + book.index;
    if (this.noteText.trim()) {
      await this.bookmarkService.saveAnnotation(path, this.noteText.trim());
      this.hasNote = true;
    } else {
      await this.bookmarkService.deleteAnnotation(path);
      this.hasNote = false;
    }
    this.showNoteEditor = false;
    this.cdr.markForCheck();
  }

  async deleteNote(book: VerseDetail): Promise<void> {
    const path = '/books/' + book.index;
    await this.bookmarkService.deleteAnnotation(path);
    this.noteText = '';
    this.hasNote = false;
    this.showNoteEditor = false;
    this.cdr.markForCheck();
  }

  async shareHadith(index: string): Promise<void> {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Hadith - ${index}`, url });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url);
      this.linkCopied = true;
      setTimeout(() => this.linkCopied = false, 2000);
    }
  }

  async shareAsImage(book: VerseDetail, translationId: string): Promise<void> {
    this.generatingImage = true;
    this.cdr.markForCheck();
    try {
      const verse = book.data.verse;
      const arabicText = (verse.text || []).join(' ').replace(/<[^>]*>/g, '');
      const translations = verse.translations || {};
      const transTexts = translations[translationId] || Object.values(translations)[0] || [];
      const translationText = transTexts.join(' ').replace(/<[^>]*>/g, '');
      const reference = `${verse.part_type} ${verse.local_index}`;
      const bookTitle = book.data.chapter_title?.en || book.index;
      const grading = verse.gradings?.[0] ? this.parseGradingTerm(verse.gradings[0]) : undefined;

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
    this.generatingImage = false;
    this.cdr.markForCheck();
  }

  // Comparative view methods
  toggleCompare(): void {
    this.compareExpanded = !this.compareExpanded;
    this.cdr.markForCheck();
  }

  isCompareLoaded(path: string): boolean {
    return this.compareEntries.has(path);
  }

  getCompareEntry(path: string): CompareEntry | undefined {
    return this.compareEntries.get(path);
  }

  togglePreview(path: string): void {
    if (this.compareEntries.has(path)) {
      this.compareEntries.delete(path);
      if (this.compareEntries.size === 0) {
        this.compareExpanded = false;
      }
      this.cdr.markForCheck();
      return;
    }
    this.loadCompareVerse(path);
  }

  loadCompareVerse(path: string): void {
    if (this.compareEntries.has(path)) return;

    const stripped = path.startsWith('/books/') ? path.slice(7) : path;
    const entry: CompareEntry = {
      path,
      verse: null,
      chapterTitle: this.formatRelationPath(path),
      loading: true,
      error: null,
    };
    this.compareEntries.set(path, entry);
    this.compareExpanded = true;
    this.cdr.markForCheck();

    this.verseLoader.loadVerse(stripped).subscribe({
      next: (verse: Verse | null) => {
        entry.loading = false;
        if (verse) {
          entry.verse = verse;
        } else {
          entry.error = 'Could not load referenced hadith';
        }
        this.cdr.markForCheck();
      },
      error: () => {
        entry.loading = false;
        entry.error = 'Failed to load referenced content';
        this.cdr.markForCheck();
      }
    });
  }

  loadAllRelations(relations: Record<string, string[]>): void {
    this.compareExpanded = true;
    for (const paths of Object.values(relations)) {
      for (const path of paths) {
        this.loadCompareVerse(path);
      }
    }
  }

  // Audio + tafsir (Quran)
  getQuranSurah(bookIndex: string): number {
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
    if (this.tafsirExpanded) {
      this.tafsirExpanded = false;
      this.cdr.markForCheck();
      return;
    }
    const surah = this.getQuranSurah(bookIndex);
    if (surah <= 0) return;
    this.tafsirExpanded = true;
    this.tafsirLoading = true;
    this.cdr.markForCheck();
    this.tafsirService.getAyahTafsir(surah, ayah, this.selectedTafsirEdition)
      .subscribe(text => {
        this.tafsirLoading = false;
        this.tafsirText = text || 'No tafsir available for this verse.';
        this.cdr.markForCheck();
      });
  }

  onTafsirEditionChange(bookIndex: string, ayah: number): void {
    const surah = this.getQuranSurah(bookIndex);
    if (surah <= 0 || !this.tafsirExpanded) return;
    this.tafsirLoading = true;
    this.cdr.markForCheck();
    this.tafsirService.getAyahTafsir(surah, ayah, this.selectedTafsirEdition)
      .subscribe(text => {
        this.tafsirLoading = false;
        this.tafsirText = text || 'No tafsir available for this verse.';
        this.cdr.markForCheck();
      });
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

  getFirstTranslation(verse: Verse): string[] | null {
    if (!verse.translations) return null;
    const keys = Object.keys(verse.translations);
    return keys.length > 0 ? verse.translations[keys[0]] : null;
  }

  removeBookPrefix(path: string): string {
    return path.replace('/books/', '');
  }

  private static readonly CONTENT_TYPE_LABELS: Record<ContentType, string> = {
    legal_ruling: 'Legal Ruling', ethical_teaching: 'Ethical Teaching',
    narrative: 'Narrative', prophetic_tradition: 'Prophetic Tradition',
    quranic_commentary: "Qur'anic Commentary", supplication: 'Supplication',
    creedal: 'Creedal', eschatological: 'Eschatological',
    biographical: 'Biographical', theological: 'Theological',
    exhortation: 'Exhortation', cosmological: 'Cosmological',
  };

  getContentTypeLabel(type: ContentType): string {
    return VerseDetailComponent.CONTENT_TYPE_LABELS[type] || type;
  }

  /** Format snake_case labels for display: "divine_attributes" → "Divine Attributes" */
  formatLabel(text: string): string {
    return text.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /** Strip Arabic diacritics for use as URL key */
  stripDiacritics(text: string): string {
    return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8]/g, '');
  }

  getQuranRefLink(ref: string): string {
    const parts = ref.split(':');
    return parts.length >= 1 ? 'quran:' + parts[0] : '';
  }

  getQuranRefFragment(ref: string): string {
    const parts = ref.split(':');
    return parts.length >= 2 ? 'h' + parts[1] : '';
  }

  // Discussion methods
  async postComment(book: VerseDetail): Promise<void> {
    if (!this.newCommentText.trim()) return;
    const path = '/books/' + book.index;
    await this.discussionService.addComment(path, this.newCommentText.trim());
    this.newCommentText = '';
    this.showCommentEditor = false;
    this.cdr.markForCheck();
  }

  async flagComment(commentId: string): Promise<void> {
    await this.discussionService.flagComment(commentId);
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.discussionService.deleteComment(commentId);
  }

  signInForDiscussion(): void {
    this.syncService.signInWithGoogle();
  }
}
