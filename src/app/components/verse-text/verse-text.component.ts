import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AiLanguage, AiTranslationEntry, Chunk, ContentType, IsnadMatn, KeyPhrase, WordAnalysisEntry, getAiTranslationText, isAiTranslation, getAiLang } from '@app/models/ai-content';
import { NarratorMetadata, Verse } from '@app/models';
import { SpecialText } from '@app/models/book';
import { AiPreferencesService } from '@app/services/ai-preferences.service';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { PeopleState } from '@store/people/people.state';
import { Observable } from 'rxjs';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-verse-text',
    templateUrl: './verse-text.component.html',
    styleUrls: ['./verse-text.component.scss'],
    standalone: false
})
export class VerseTextComponent {
  private store = inject(Store);
  translation$: Observable<string> = this.store.select(BooksState.getTranslationIfInBookOrDefault);
  translationClass$: Observable<string> = this.store.select(BooksState.getTranslationClass);
  translation2$: Observable<string> = this.store.select(BooksState.getSecondTranslation);
  translationClass2$: Observable<string> = this.store.select(BooksState.getSecondTranslationClass);
  private aiPrefs = inject(AiPreferencesService);
  private sanitizer = inject(DomSanitizer);

  @Input() verse: Verse;
  @Input() isQuran = false;
  @Input() verseNumber: number;

  // Narrator hover card state
  hoveredNarrator: { id: number; narrator: NarratorMetadata | null; x: number; y: number } | null = null;
  private hoverTimeout: ReturnType<typeof setTimeout> | null = null;
  private narratorIndex: Record<number, NarratorMetadata> = {};
  private narratorIndexLoaded = false;

  // AI feature toggles (initialized from saved preferences)
  showDiacritics = this.aiPrefs.get('showDiacritizedByDefault');
  showIsnadSeparation = this.aiPrefs.get('showIsnadSeparation');
  showWordAnalysis = false;
  showChunkedView = false;
  showChainDiagram = false;
  wordAnalysisLang: AiLanguage = this.aiPrefs.get('wordByWordDefaultLang');
  activeWordIndex: number | null = null;

  toggleDiacritics(): void {
    this.showDiacritics = !this.showDiacritics;
  }

  toggleWordAnalysis(): void {
    this.showWordAnalysis = !this.showWordAnalysis;
    if (this.showWordAnalysis) {
      this.showDiacritics = false;
    }
  }

  toggleChunkedView(): void {
    this.showChunkedView = !this.showChunkedView;
  }

  toggleChainDiagram(): void {
    this.showChainDiagram = !this.showChainDiagram;
  }

  /** Get narrator-kind parts from the narrator chain for the chain diagram */
  getNarratorParts(): SpecialText[] {
    return this.verse?.narrator_chain?.parts || [];
  }

  get hasNarratorChain(): boolean {
    return !!this.verse?.narrator_chain?.parts?.length;
  }

  setActiveWord(index: number | null): void {
    this.activeWordIndex = this.activeWordIndex === index ? null : index;
  }

  get hasAiText(): boolean {
    return !!this.verse?.ai?.diacritized_text || !!this.verse?.ai?.word_analysis?.length;
  }

  /** Reconstruct diacritized text from word_analysis if diacritized_text is not present */
  get diacritizedText(): string {
    if (this.verse?.ai?.diacritized_text) return this.verse.ai.diacritized_text;
    const wa = this.verse?.ai?.word_analysis;
    return wa ? wa.map(e => e.word).join(' ') : '';
  }

  get hasIsnadMatn(): boolean {
    return !!this.verse?.ai?.isnad_matn?.has_chain;
  }

  get isnadMatn(): IsnadMatn | undefined {
    return this.verse?.ai?.isnad_matn;
  }

  /** Reconstruct isnad Arabic text from chunks with chunk_type=isnad, or from isnad_matn.isnad_ar */
  get isnadArabicText(): string {
    const im = this.verse?.ai?.isnad_matn;
    if (im?.isnad_ar) return im.isnad_ar;
    // Reconstruct from chunks
    const chunks = this.verse?.ai?.chunks;
    const wa = this.verse?.ai?.word_analysis;
    if (!chunks || !wa) return '';
    return chunks
      .filter(c => c.chunk_type === 'isnad')
      .map(c => wa.slice(c.word_start, c.word_end).map(e => e.word).join(' '))
      .join(' ');
  }

  /** Reconstruct matn Arabic text from non-isnad chunks, or from isnad_matn.matn_ar */
  get matnArabicText(): string {
    const im = this.verse?.ai?.isnad_matn;
    if (im?.matn_ar) return im.matn_ar;
    // Reconstruct from chunks
    const chunks = this.verse?.ai?.chunks;
    const wa = this.verse?.ai?.word_analysis;
    if (!chunks || !wa) return '';
    return chunks
      .filter(c => c.chunk_type !== 'isnad')
      .map(c => wa.slice(c.word_start, c.word_end).map(e => e.word).join(' '))
      .join(' ');
  }

  get hasWordAnalysis(): boolean {
    return !!this.verse?.ai?.word_analysis?.length;
  }

  get wordAnalysis(): WordAnalysisEntry[] {
    return this.verse?.ai?.word_analysis || [];
  }

  get hasChunks(): boolean {
    return (this.verse?.ai?.chunks?.length || 0) > 1;
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
    // Try dissolved fields first (lean format from merger)
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
    // Fall back to legacy translations object (pre-merger format)
    return ai.translations?.[l];
  }

  getTranslationText(verse: Verse, translationId: string): string[] | undefined {
    if (!translationId) return undefined;
    // Try human translation first
    if (verse.translations?.[translationId]) {
      return verse.translations[translationId];
    }
    // Try AI translation (reconstruct from chunks)
    if (isAiTranslation(translationId) && verse.ai) {
      const lang = getAiLang(translationId);
      return lang ? getAiTranslationText(verse.ai, lang) : undefined;
    }
    return undefined;
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
    // Use arabic_text if present, otherwise reconstruct from word_analysis
    if (chunk.arabic_text) return chunk.arabic_text;
    const wa = this.verse?.ai?.word_analysis;
    if (!wa) return '';
    return wa.slice(chunk.word_start, chunk.word_end).map(e => e.word).join(' ');
  }

  getChunkTranslation(chunk: Chunk, lang: string): string {
    return (chunk.translations as Record<string, string>)?.[lang] || '';
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

    // Sort phrases by length (longest first) to avoid partial matches
    const sorted = [...phrases].sort((a, b) =>
      (b.phrase_ar?.length || 0) - (a.phrase_ar?.length || 0)
    );

    const normalizedText = VerseTextComponent.stripDiacritics(text);
    // Track which character positions are already matched
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
        // Check if any characters in range are already matched
        let overlap = false;
        for (let i = idx; i < end; i++) {
          if (matched[i]) { overlap = true; break; }
        }

        if (!overlap) {
          for (let i = idx; i < end; i++) matched[i] = true;
          // Map from normalized positions back to original text positions
          // Since diacritics removal only removes chars, normalized index i
          // corresponds to the same logical position. We need to find the original
          // text positions by walking through and counting non-diacritic chars.
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

    // Sort replacements by start position
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
      // Check if this char is a diacritic (would be stripped)
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

    // Load narrator index if not yet loaded
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
  }

  hideNarratorCard(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    this.hoverTimeout = setTimeout(() => {
      this.hoveredNarrator = null;
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
    }, 500);
  }

  onNarratorTouchEnd(): void {
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
  }
}
