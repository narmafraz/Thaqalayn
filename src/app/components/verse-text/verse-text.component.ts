import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AiLanguage, AiTranslationEntry, Chunk, ContentType, KeyPhrase, WordAnalysisEntry, getAiTranslationText, isAiTranslation, getAiLang } from '@app/models/ai-content';
import { NarratorMetadata, Verse } from '@app/models';
import { SpecialText } from '@app/models/book';
import { SurfacePage } from '@app/models/word';
import { AiPreferencesService } from '@app/services/ai-preferences.service';
import { WordsService } from '@app/services/words.service';
import { slug as wordSlug } from '@app/services/word-normalize';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { PeopleState } from '@store/people/people.state';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-verse-text',
    templateUrl: './verse-text.component.html',
    styleUrls: ['./verse-text.component.scss'],
    standalone: false
})
export class VerseTextComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  translation$: Observable<string> = this.store.select(BooksState.getTranslationIfInBookOrDefault);
  translationClass$: Observable<string> = this.store.select(BooksState.getTranslationClass);
  translation2$: Observable<string> = this.store.select(BooksState.getSecondTranslation);
  translationClass2$: Observable<string> = this.store.select(BooksState.getSecondTranslationClass);
  private aiPrefs = inject(AiPreferencesService);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);
  private words = inject(WordsService);
  private destroy$ = new Subject<void>();

  /**
   * Per-card surface data fetched eagerly when word-by-word view is
   * toggled on. The surface page is small and carries everything the
   * card + popup need: POS (`morphology.pos`), lemma slug for the
   * "Full word page →" link, and Path B's 11-language `translations`.
   * No further lemma fetch happens from this component — that's
   * `word-lemma.component`'s job on the dedicated lemma page.
   */
  surfaceCardData = new Map<string, SurfacePage>();
  /** Set of surface slugs we're currently fetching. */
  private surfaceCardLoading = new Set<string>();


  @Input() verse: Verse;
  @Input() isQuran = false;
  @Input() verseNumber: number;
  @Input() showToggles = true;

  // Narrator hover card state
  hoveredNarrator: { id: number; narrator: NarratorMetadata | null; x: number; y: number } | null = null;
  private hoverTimeout: ReturnType<typeof setTimeout> | null = null;
  private narratorIndex: Record<number, NarratorMetadata> = {};
  private narratorIndexLoaded = false;

  // AI feature toggles (initialized from saved preferences)
  private elementRef = inject(ElementRef);

  showDiacritics = this.aiPrefs.get('showDiacritizedByDefault');
  showWordAnalysis = this.aiPrefs.get('showWordByWord');
  showChainDiagram = this.aiPrefs.get('showChainDiagram');
  private _previousDiacritics = this.showDiacritics;
  wordAnalysisLang: AiLanguage = this.aiPrefs.get('wordByWordDefaultLang');
  activeWordIndex: number | null = null;


  // Word popup state
  wordPopup: { entry: WordAnalysisEntry; x: number; y: number } | null = null;

  ngOnInit(): void {
    this.aiPrefs.preferences$.pipe(takeUntil(this.destroy$)).subscribe(prefs => {
      const wasWBW = this.showWordAnalysis;
      this.showDiacritics = prefs.showDiacritizedByDefault;
      this.showWordAnalysis = prefs.showWordByWord;
      this.showChainDiagram = prefs.showChainDiagram;
      this.wordAnalysisLang = prefs.wordByWordDefaultLang;
      // When WBW transitions off→on (toolbar/sheet flip or other surface)
      // and this verse has no v3 word_analysis, kick the prefetch so cards
      // populate without an extra click. shareReplay makes it idempotent.
      if (this.showWordAnalysis && !wasWBW && !this.hasWordAnalysis) {
        this.prefetchSurfaceData();
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleDiacritics(): void {
    this.aiPrefs.set('showDiacritizedByDefault', !this.showDiacritics);
  }

  toggleWordAnalysis(): void {
    const next = !this.showWordAnalysis;
    if (next) {
      this._previousDiacritics = this.showDiacritics;
      this.aiPrefs.set('showDiacritizedByDefault', false);
      this.aiPrefs.set('showWordByWord', true);
    } else {
      this.aiPrefs.set('showDiacritizedByDefault', this._previousDiacritics);
      this.aiPrefs.set('showWordByWord', false);
    }
  }

  /**
   * Eagerly fetch the surface page for every word token in the verse.
   * Results land in surfaceCardData; the template reads it via
   * cardPos() / cardLemmaSlug() to show inline morphology on each card.
   * WordsService.shareReplay caches all fetches for the session so this
   * is idempotent across re-toggles and across hadiths sharing a word.
   */
  private prefetchSurfaceData(): void {
    for (const token of this.wordTokens) {
      const key = token.word;
      if (this.surfaceCardData.has(key) || this.surfaceCardLoading.has(key)) {
        continue;
      }
      this.surfaceCardLoading.add(key);
      this.words.getSurface(key).subscribe(surfacePage => {
        this.surfaceCardLoading.delete(key);
        if (surfacePage) {
          this.surfaceCardData.set(key, surfacePage);
          this.cdr.markForCheck();
        }
      });
    }
  }

  /** Read-only helper: POS for a card, sourced from inline v3 entry or
   *  eagerly-loaded surface data (whichever's available). */
  cardPos(entry: WordAnalysisEntry): string {
    if (entry.pos) return entry.pos;
    const data = this.surfaceCardData.get(entry.word);
    return data?.morphology?.pos || '';
  }

  /** Read-only helper: lemma slug for a card link target. */
  cardLemmaSlug(entry: WordAnalysisEntry): string | null {
    const data = this.surfaceCardData.get(entry.word);
    return data?.morphology?.lemma_slug || null;
  }

  /** Card gloss for the active language. v3 inline translation wins;
   *  otherwise read from the prefetched surface JSON
   *  (`surfaceCardData[slug].translations[activeLang]`). Empty when the
   *  surface isn't prefetched yet or Path B didn't translate it (~1.3%
   *  of surfaces had validator issues and were skipped by the merger). */
  cardTranslation(entry: WordAnalysisEntry): string {
    const inline = entry.translation?.[this.wordAnalysisLang];
    if (inline) return inline;
    const surface = this.surfaceCardData.get(entry.word);
    if (!surface?.translations) return '';
    return surface.translations[this.wordAnalysisLang] || '';
  }

  toggleChainDiagram(): void {
    this.aiPrefs.set('showChainDiagram', !this.showChainDiagram);
  }

  /** Get narrator-kind parts from the narrator chain for the chain diagram */
  getNarratorParts(): SpecialText[] {
    return this.verse?.narrator_chain?.parts || [];
  }

  get hasNarratorChain(): boolean {
    return !!this.verse?.narrator_chain?.parts?.length;
  }

  get hasIsnadChunk(): boolean {
    return !!this.verse?.ai?.chunks?.some(c => c.chunk_type === 'isnad');
  }

  setActiveWord(index: number | null, event?: MouseEvent): void {
    if (this.activeWordIndex === index) {
      this.activeWordIndex = null;
      this.wordPopup = null;
      this.cdr.markForCheck();
      return;
    }
    this.activeWordIndex = index;
    if (index !== null && event) {
      const entry = this.wordTokens[index];
      if (entry) {
        // No extra fetch on click — the surface page was eagerly
        // prefetched when WBW was toggled on, and carries everything
        // the popup renders (POS + 11-language translations).
        const target = event.currentTarget as HTMLElement;
        const containerRect = target.closest('.word-analysis-grid')?.getBoundingClientRect();
        const cardRect = target.getBoundingClientRect();
        let x: number;
        let y: number;
        if (containerRect) {
          x = cardRect.left - containerRect.left + cardRect.width / 2;
          y = cardRect.bottom - containerRect.top + 8;
        } else {
          x = cardRect.left;
          y = cardRect.bottom + 8;
        }
        const popupWidth = 200;
        const popupHeight = 200;
        if (containerRect) {
          const maxX = containerRect.width - popupWidth / 2 - 8;
          x = Math.max(popupWidth / 2 + 8, Math.min(x, maxX));
          const maxY = window.innerHeight - containerRect.top - popupHeight - 16;
          y = Math.min(y, maxY);
        } else {
          const maxX = window.innerWidth - popupWidth - 16;
          x = Math.max(8, Math.min(x, maxX));
          const maxY = window.innerHeight - popupHeight;
          y = Math.min(y, maxY);
        }
        this.wordPopup = { entry, x, y };
      }
    } else {
      this.wordPopup = null;
    }
  }

  closeWordPopup(): void {
    this.activeWordIndex = null;
    this.wordPopup = null;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.wordPopup) {
      this.closeWordPopup();
      this.cdr.markForCheck();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.wordPopup) return;
    const target = event.target as HTMLElement;
    const grid = this.elementRef.nativeElement.querySelector('.word-analysis-grid');
    if (grid && !grid.contains(target)) {
      this.closeWordPopup();
      this.cdr.markForCheck();
    }
  }

  /** Get all translations for the active popup word */
  getPopupTranslations(): { lang: string; label: string; text: string }[] {
    if (!this.wordPopup) return [];
    const t = this.wordPopup.entry.translation;
    if (!t) return [];
    return [
      { lang: this.wordAnalysisLang, label: this.getWordLangLabel(this.wordAnalysisLang), text: t[this.wordAnalysisLang] || '' }
    ].filter(item => !!item.text);
  }

  private static readonly WORD_LANG_LABELS: Record<string, string> = {
    en: 'English', ur: 'Urdu', tr: 'Turkish', fa: 'Persian',
    id: 'Indonesian', bn: 'Bengali', es: 'Spanish', fr: 'French',
    de: 'German', ru: 'Russian', zh: 'Chinese',
  };

  getWordLangLabel(lang: string): string {
    return VerseTextComponent.WORD_LANG_LABELS[lang] || lang;
  }

  get hasAiText(): boolean {
    return !!this.verse?.ai?.diacritized_text
      || !!this.verse?.ai?.word_analysis?.length
      || !!this.verse?.ai?.chunks?.some(c => !!c.arabic_text);
  }

  /** Diacritized Arabic text. Source priority:
   *  1. ai.diacritized_text (legacy v4 / pre-leanness output)
   *  2. word_analysis joined by word (v3)
   *  3. chunks[].arabic_text joined (current v4 — chunks are LLM canonical)
   */
  get diacritizedText(): string {
    if (this.verse?.ai?.diacritized_text) return this.verse.ai.diacritized_text;
    const wa = this.verse?.ai?.word_analysis;
    if (wa?.length) return wa.map(e => e.word).join(' ');
    const chunks = this.verse?.ai?.chunks;
    if (chunks?.length) {
      return chunks.map(c => c.arabic_text || '').filter(Boolean).join(' ');
    }
    return '';
  }

  get hasWordAnalysis(): boolean {
    return !!this.verse?.ai?.word_analysis?.length;
  }

  /** True when word-by-word view can be shown. With word-data now sourced
   *  per-word from the central ThaqalaynWords repo (not per-verse AI
   *  content), any hadith with Arabic text can render WBW — the
   *  tokenizer falls back to splitting `verse.text` and WordsService
   *  lazy-loads each surface from ThaqalaynWords. */
  get hasWordByWord(): boolean {
    return !!this.verse?.text?.length;
  }

  get wordAnalysis(): WordAnalysisEntry[] {
    return this.verse?.ai?.word_analysis || [];
  }

  /** Memoized wordTokens — recomputed only when the verse input changes.
   *  Without this, the getter returns a fresh array on every change
   *  detection tick; *ngFor's identity diff then tears down and rebuilds
   *  every word card on each click, which (a) is wasteful and (b) caused
   *  a visible layout jump as DOM nodes were destroyed/recreated. */
  private _wordTokensVerse: Verse | undefined;
  private _wordTokensCache: WordAnalysisEntry[] = [];

  /**
   * Word entries for the word-by-word view. Falls back to whitespace-
   * tokenized chunk text when v3 `word_analysis` is absent. Each
   * fallback token has empty `translation` + placeholder `pos` — the
   * UI then lazy-loads the lemma on card click to populate them.
   */
  get wordTokens(): WordAnalysisEntry[] {
    if (this._wordTokensVerse === this.verse) return this._wordTokensCache;
    this._wordTokensVerse = this.verse;
    this._wordTokensCache = this.computeWordTokens();
    return this._wordTokensCache;
  }

  private computeWordTokens(): WordAnalysisEntry[] {
    if (this.hasWordAnalysis) return this.wordAnalysis;
    // Source order: v4 chunks with arabic_text -> raw verse.text fallback.
    // Both paths produce empty WordAnalysisEntry stubs; surface data
    // (pos, lemma, translation) lazy-loads from ThaqalaynWords per click
    // / on toolbar activation (prefetchSurfaceData).
    const chunks = this.verse?.ai?.chunks;
    const sources: string[] = [];
    if (chunks?.length) {
      for (const c of chunks) {
        const t = (c.arabic_text || '').trim();
        if (t) sources.push(t);
      }
    }
    if (!sources.length && this.verse?.text?.length) {
      sources.push(...this.verse.text.map(t => (t || '').trim()).filter(Boolean));
    }
    if (!sources.length) return [];
    const out: WordAnalysisEntry[] = [];
    for (const text of sources) {
      // Split on whitespace; strip leading/trailing Arabic punctuation
      // (، . ؟ ؛ ! : ()).
      for (const raw of text.split(/\s+/)) {
        const token = raw.replace(/^[،.؟؛!:()«»\-]+|[،.؟؛!:()«»\-]+$/g, '');
        if (!token) continue;
        // Cast through `unknown` because the v3 schema requires the
        // full translation/pos shape we don't have yet — UI guards
        // with *ngIf on entry.pos and entry.translation[lang].
        out.push({
          word: token,
          pos: '' as any,
          translation: {} as any,
        } as unknown as WordAnalysisEntry);
      }
    }
    return out;
  }

  /** trackBy for *ngFor over word cards. Stable identity by index +
   *  word text means Angular reuses the existing DOM node when the
   *  array is recomputed (e.g. on verse change), instead of destroying
   *  and rebuilding all cards. */
  trackWordToken = (i: number, e: WordAnalysisEntry): string => i + ':' + e.word;

  /** URL-safe slug for a word token (NFC + percent-encode happens in service). */
  wordHref(word: string): string {
    return wordSlug(word);
  }

  /** Resolve the popup's translation from any source already loaded:
   *  inline v3 entry → prefetched surface JSON's Path B translation.
   *  We read what's already in memory; no extra fetches. Empty when
   *  neither source has a translation for the active language. */
  get popupTranslation(): string {
    if (!this.wordPopup) return '';
    const entry = this.wordPopup.entry;
    const inline = entry.translation?.[this.wordAnalysisLang];
    if (inline) return inline;
    const surface = this.surfaceCardData.get(entry.word);
    if (surface?.translations) {
      return surface.translations[this.wordAnalysisLang] || '';
    }
    return '';
  }

  /** Popup POS — inline v3 entry or the eagerly-prefetched surface
   *  page. Both are in memory by the time the user clicks. */
  get popupPos(): string {
    if (!this.wordPopup) return '';
    const entry = this.wordPopup.entry;
    if (entry.pos) return entry.pos;
    return this.surfaceCardData.get(entry.word)?.morphology?.pos || '';
  }

  get hasChunks(): boolean {
    const chunks = this.verse?.ai?.chunks;
    if (!chunks || chunks.length <= 1) return false;
    // Only activate chunked view if we can reconstruct Arabic text
    // (either word_analysis exists, or chunks have inline arabic_text)
    return !!this.verse?.ai?.word_analysis?.length || !!chunks[0]?.arabic_text;
  }

  get chunks(): Chunk[] {
    return this.verse?.ai?.chunks || [];
  }

  get aiTranslation(): AiTranslationEntry | undefined {
    return this.getAiTranslationForLang(this.wordAnalysisLang);
  }

  getAiTranslationForLang(lang: string): AiTranslationEntry | undefined {
    const ai = this.verse?.ai;
    if (!ai) return undefined;
    const l = lang as AiLanguage;
    const summary = ai.summaries?.[l];
    const key_terms = ai.key_terms?.[l];
    const seo_question = ai.seo_questions?.[l];
    if (summary || key_terms || seo_question) {
      return {
        summary: summary || '',
        key_terms: key_terms || {},
        seo_question: seo_question || '',
      };
    }
    return ai.translations?.[l];
  }

  getTranslationText(verse: Verse, translationId: string): string[] | undefined {
    if (!translationId) return undefined;
    if (verse.translations?.[translationId]) {
      return verse.translations[translationId];
    }
    if (isAiTranslation(translationId) && verse.ai) {
      const lang = getAiLang(translationId);
      return lang ? getAiTranslationText(verse.ai, lang) : undefined;
    }
    return undefined;
  }

  /** Check if the given translation ID is an AI translation */
  isAiTranslationId(translationId: string): boolean {
    return isAiTranslation(translationId);
  }

  /** Check if translation is missing for the current selection */
  isMissingTranslation(translationId: string): boolean {
    return !!translationId && !this.getTranslationText(this.verse, translationId);
  }

  /** Get the language name for a translation ID (e.g., 'en.qarai' -> 'English') */
  getTranslationLangName(translationId: string): string {
    const langCode = translationId?.split('.')[0] || '';
    return VerseTextComponent.LANG_NAMES[langCode] || langCode;
  }

  /** Get list of available translation IDs for this verse */
  getAvailableTranslationIds(): string[] {
    return this.verse?.translations ? Object.keys(this.verse.translations) : [];
  }

  private static readonly LANG_NAMES: Record<string, string> = {
    en: 'English', ar: 'Arabic', fa: 'Persian', ur: 'Urdu',
    fr: 'French', es: 'Spanish', de: 'German', tr: 'Turkish',
    id: 'Indonesian', bn: 'Bengali', ru: 'Russian', zh: 'Chinese',
  };

  getChunkArabicText(chunk: Chunk): string {
    if (chunk.arabic_text) return chunk.arabic_text;
    const wa = this.verse?.ai?.word_analysis;
    if (!wa) return '';
    return wa.slice(chunk.word_start, chunk.word_end).map(e => e.word).join(' ');
  }

  getChunkTranslation(chunk: Chunk, translationId: string): string {
    if (!translationId) return '';
    if (isAiTranslation(translationId)) {
      const lang = getAiLang(translationId);
      if (lang) {
        return (chunk.translations as Record<string, string>)?.[lang] || '';
      }
    }
    return '';
  }

  /** Check if chunks have translation data for the given translation ID. */
  chunksHaveTranslation(translationId: string): boolean {
    if (!translationId || !this.chunks?.length) return false;
    if (!isAiTranslation(translationId)) return false;
    const lang = getAiLang(translationId);
    if (!lang) return false;
    return this.chunks.some(c => !!(c.translations as Record<string, string>)?.[lang]);
  }

  /** Check if this chunk is the first isnad chunk and should render narrator_chain.parts[].
   *  We check if it's the first chunk with chunk_type=isnad in the chunks array. */
  isFirstIsnadChunk(chunk: Chunk): boolean {
    if (chunk.chunk_type !== 'isnad') return false;
    if (!this.verse?.narrator_chain?.parts?.length) return false;
    const chunks = this.verse?.ai?.chunks;
    if (!chunks) return false;
    const firstIsnad = chunks.find(c => c.chunk_type === 'isnad');
    return firstIsnad === chunk;
  }

  getQuranRefLink(ref: string): string {
    const parts = ref.split(':');
    return parts.length >= 1 ? 'quran:' + parts[0] : '';
  }

  getQuranRefFragment(ref: string): string {
    const parts = ref.split(':');
    return parts.length >= 2 ? 'h' + parts[1] : '';
  }

  getPosColor(pos: string): string {
    switch (pos) {
      case 'N': return '#1565c0';
      case 'V': return '#2e7d32';
      case 'ADJ': return '#6a1b9a';
      case 'PREP': case 'CONJ': case 'PART': case 'DET': return '#757575';
      case 'PRON': case 'DEM': case 'REL': return '#e65100';
      default: return '#424242';
    }
  }

  getPosLabel(pos: string): string {
    const labels: Record<string, string> = {
      N: 'Noun', V: 'Verb', ADJ: 'Adj', ADV: 'Adv', PREP: 'Prep',
      CONJ: 'Conj', PRON: 'Pron', DET: 'Det', PART: 'Part', INTJ: 'Intj',
      REL: 'Rel', DEM: 'Dem', NEG: 'Neg', COND: 'Cond', INTERR: 'Q',
    };
    return labels[pos] || pos;
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
    return VerseTextComponent.CONTENT_TYPE_LABELS[type] || type;
  }

  get hasKeyPhrases(): boolean {
    return !!this.verse?.ai?.key_phrases?.length;
  }

  /** Strip Arabic diacritics for phrase matching */
  private static stripDiacritics(text: string): string {
    return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8]/g, '');
  }

  /**
   * Highlight key phrases in Arabic text by wrapping matches in <mark> tags.
   * Returns sanitized SafeHtml for use with [innerHTML].
   */
  highlightPhrases(text: string): SafeHtml {
    const phrases = this.verse?.ai?.key_phrases;
    if (!phrases?.length || !text) {
      return this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(text));
    }

    const sorted = [...phrases].sort((a, b) =>
      (b.phrase_ar?.length || 0) - (a.phrase_ar?.length || 0)
    );

    const normalizedText = VerseTextComponent.stripDiacritics(text);
    const matched = new Array(text.length).fill(false);
    const replacements: { start: number; end: number; phrase: KeyPhrase }[] = [];

    for (const phrase of sorted) {
      if (!phrase.phrase_ar) continue;
      const normalizedPhrase = VerseTextComponent.stripDiacritics(phrase.phrase_ar);
      if (!normalizedPhrase) continue;

      let searchFrom = 0;
      while (searchFrom < normalizedText.length) {
        const idx = normalizedText.indexOf(normalizedPhrase, searchFrom);
        if (idx === -1) break;

        const end = idx + normalizedPhrase.length;
        let overlap = false;
        for (let i = idx; i < end; i++) {
          if (matched[i]) { overlap = true; break; }
        }

        if (!overlap) {
          for (let i = idx; i < end; i++) matched[i] = true;
          const origStart = this.mapNormalizedIndex(text, idx);
          const origEnd = this.mapNormalizedIndex(text, end);
          replacements.push({ start: origStart, end: origEnd, phrase });
        }
        searchFrom = idx + normalizedPhrase.length;
      }
    }

    if (replacements.length === 0) {
      return this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(text));
    }

    replacements.sort((a, b) => a.start - b.start);

    let result = '';
    let pos = 0;
    for (const r of replacements) {
      result += this.escapeHtml(text.substring(pos, r.start));
      const matchedText = this.escapeHtml(text.substring(r.start, r.end));
      const encodedKey = encodeURIComponent(VerseTextComponent.stripDiacritics(r.phrase.phrase_ar));
      result += `<mark class="key-phrase" data-phrase="${encodedKey}" data-en="${this.escapeAttr(r.phrase.phrase_en || '')}">${matchedText}</mark>`;
      pos = r.end;
    }
    result += this.escapeHtml(text.substring(pos));

    return this.sanitizer.bypassSecurityTrustHtml(result);
  }

  /** Map an index in the diacritics-stripped text back to the original text position */
  private mapNormalizedIndex(original: string, normalizedIdx: number): number {
    let nCount = 0;
    for (let i = 0; i < original.length; i++) {
      if (nCount === normalizedIdx) return i;
      if (!/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8]/.test(original[i])) {
        nCount++;
      }
    }
    return original.length;
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private escapeAttr(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /** Extract narrator ID from a narrator path like '/people/narrators/123' */
  private extractNarratorId(path: string): number | null {
    const match = path?.match(/\/people\/narrators\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  showNarratorCard(event: MouseEvent, path: string): void {
    const narratorId = this.extractNarratorId(path);
    if (narratorId === null) return;

    if (!this.narratorIndexLoaded) {
      this.narratorIndex = this.store.selectSnapshot(PeopleState.getEnrichedNarratorIndex) || {};
      this.narratorIndexLoaded = true;
    }

    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    const containerRect = target.closest('.textrow')?.getBoundingClientRect();
    const offsetX = containerRect ? rect.left - containerRect.left : rect.left;
    const offsetY = containerRect ? rect.bottom - containerRect.top + 4 : rect.bottom + 4;

    this.hoveredNarrator = {
      id: narratorId,
      narrator: this.narratorIndex[narratorId] || null,
      x: offsetX,
      y: offsetY
    };
    this.cdr.markForCheck();
  }

  hideNarratorCard(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    this.hoverTimeout = setTimeout(() => {
      this.hoveredNarrator = null;
      this.cdr.markForCheck();
    }, 200);
  }

  keepNarratorCard(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
  }

  private longPressTimeout: ReturnType<typeof setTimeout> | null = null;

  onNarratorTouchStart(event: TouchEvent, path: string): void {
    this.longPressTimeout = setTimeout(() => {
      const touch = event.touches[0];
      const narratorId = this.extractNarratorId(path);
      if (narratorId === null) return;

      if (!this.narratorIndexLoaded) {
        const store = inject(Store);
        this.narratorIndex = store.selectSnapshot(PeopleState.getEnrichedNarratorIndex) || {};
        this.narratorIndexLoaded = true;
      }

      const target = event.target as HTMLElement;
      const containerRect = target.closest('.textrow')?.getBoundingClientRect();
      const offsetX = containerRect ? touch.clientX - containerRect.left : touch.clientX;
      const offsetY = containerRect ? touch.clientY - containerRect.top + 10 : touch.clientY + 10;

      this.hoveredNarrator = {
        id: narratorId,
        narrator: this.narratorIndex[narratorId] || null,
        x: offsetX,
        y: offsetY
      };
      this.cdr.markForCheck();
    }, 500);
  }

  onNarratorTouchEnd(): void {
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
  }
}
