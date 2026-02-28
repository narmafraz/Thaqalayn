import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { AiLanguage, AiTranslationEntry, Chunk, ContentType, IsnadMatn, WordAnalysisEntry, getAiTranslationText, isAiTranslation, getAiLang } from '@app/models/ai-content';
import { Verse } from '@app/models';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-verse-text',
    templateUrl: './verse-text.component.html',
    styleUrls: ['./verse-text.component.scss'],
    standalone: false
})
export class VerseTextComponent {
  translation$: Observable<string> = inject(Store).select(BooksState.getTranslationIfInBookOrDefault);
  translationClass$: Observable<string> = inject(Store).select(BooksState.getTranslationClass);
  translation2$: Observable<string> = inject(Store).select(BooksState.getSecondTranslation);
  translationClass2$: Observable<string> = inject(Store).select(BooksState.getSecondTranslationClass);

  @Input() verse: Verse;

  // AI feature toggles
  showDiacritics = false;
  showIsnadSeparation = true;
  showWordAnalysis = false;
  showChunkedView = false;
  wordAnalysisLang: AiLanguage = 'en';
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

  setActiveWord(index: number | null): void {
    this.activeWordIndex = this.activeWordIndex === index ? null : index;
  }

  get hasAiText(): boolean {
    return !!this.verse?.ai?.diacritized_text;
  }

  get hasIsnadMatn(): boolean {
    return !!this.verse?.ai?.isnad_matn?.has_chain;
  }

  get isnadMatn(): IsnadMatn | undefined {
    return this.verse?.ai?.isnad_matn;
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
}
