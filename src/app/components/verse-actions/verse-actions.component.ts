import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { Verse } from '@app/models';
import { isAiTranslation, getAiLang, getAiTranslationText } from '@app/models/ai-content';

@Component({
  selector: 'app-verse-actions',
  templateUrl: './verse-actions.component.html',
  styleUrls: ['./verse-actions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class VerseActionsComponent {
  /** Full verse index path, e.g. 'al-kafi:1:1:1:1' */
  @Input() versePath!: string;

  /** Verse data (for copy text extraction) */
  @Input() verse!: Verse;

  /** Resolved display name of the book */
  @Input() bookTitle = '';

  /** Which translation to include when copying (e.g. 'en.hubeali') */
  @Input() preferredTranslation: string | null = null;

  // --- State inputs ---
  @Input() isBookmarked = false;
  @Input() hasNote = false;
  @Input() isGeneratingImage = false;

  // --- Chapter mode inputs ---
  /** Set to show the "view details" link (open_in_new) */
  @Input() detailPath: string | null = null;
  /** Set to show the anchor link icon */
  @Input() anchorFragment: string | null = null;

  // --- Detail mode inputs ---
  /** Show share (Web Share API) button */
  @Input() showShareLink = false;
  @Input() isLinkCopied = false;
  /** Path for "view in chapter" link */
  @Input() chapterPath: string | null = null;

  // --- Quran-specific ---
  @Input() isQuran = false;
  @Input() isPlaying = false;
  @Input() isTafsirExpanded = false;

  /** Optional label shown before buttons (e.g. "Hadith 1") */
  @Input() label: string | null = null;

  // --- Events ---
  @Output() bookmarkToggle = new EventEmitter<void>();
  @Output() noteToggle = new EventEmitter<void>();
  @Output() imageShare = new EventEmitter<void>();
  @Output() audioToggle = new EventEmitter<void>();
  @Output() tafsirToggle = new EventEmitter<void>();
  @Output() linkShare = new EventEmitter<void>();

  // Internal copy feedback state
  textCopied = false;

  constructor(private cdr: ChangeDetectorRef) {}

  async copyText(): Promise<void> {
    const verse = this.verse;
    if (!verse) return;

    // Build Arabic text: narrator chain (isnad) + verse body
    const chain = verse.narrator_chain;
    const chainText = (chain?.text || chain?.parts?.map(p => p.text).join('') || '').replace(/<[^>]*>/g, '').trim();
    const bodyText = (verse.text || []).join('\n').replace(/<[^>]*>/g, '');
    const arabicText = chainText ? `${chainText}\n${bodyText}` : bodyText;

    // Build translation text: check AI translations first, then standard translations
    const pref = this.preferredTranslation;
    let transTexts: string[] | undefined;
    if (pref && isAiTranslation(pref) && verse.ai) {
      const lang = getAiLang(pref);
      if (lang) transTexts = getAiTranslationText(verse.ai, lang);
    }
    if (!transTexts?.length) {
      const translations = verse.translations || {};
      if (pref && translations[pref]) {
        transTexts = translations[pref];
      } else {
        const keys = Object.keys(translations);
        transTexts = keys.length > 0 ? (translations[keys[0]] || []) : [];
      }
    }
    const translationText = (transTexts || []).join('\n').replace(/<[^>]*>/g, '');

    const reference = `${verse.part_type} ${verse.local_index}`;
    const link = `${window.location.origin}/books/${this.versePath}`;

    const lines = [arabicText, '', translationText, '', `— ${this.bookTitle}, ${reference}`, link];
    await navigator.clipboard.writeText(lines.join('\n'));

    this.textCopied = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.textCopied = false;
      this.cdr.markForCheck();
    }, 2000);
  }
}
