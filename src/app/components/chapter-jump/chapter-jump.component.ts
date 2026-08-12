import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '@app/services/i18n.service';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface JumpOption {
  index: number;
  partType: string;
}

interface JumpModel {
  labelKey: string;
  options: JumpOption[];
}

/**
 * Compact jump-to-verse dropdown for the sticky reading toolbar. Reads the
 * current chapter from the store and navigates by setting the `#hN` URL
 * fragment — chapter-content's fragment handler owns the actual scrolling
 * (eager-loading the lazy verses above the target and re-aligning until the
 * layout settles), so this component stays a dumb control.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chapter-jump',
  templateUrl: './chapter-jump.component.html',
  styleUrls: ['./chapter-jump.component.scss'],
  standalone: false,
})
export class ChapterJumpComponent {
  private router = inject(Router);
  private i18nService = inject(I18nService);

  /** Non-null only on chapter pages with enough verses to warrant a jump control. */
  jump$: Observable<JumpModel | null> = inject(Store)
    .select(BooksState.getCurrentNavigatedPart)
    .pipe(
      map((book: any) => {
        if (!book || book.kind !== 'verse_list') return null;
        const source: any[] = book.data?.verse_refs?.length
          ? book.data.verse_refs
          : book.data?.verses || [];
        const options = source
          .filter(v => v.part_type === 'Hadith' || v.part_type === 'Verse')
          .map(v => ({ index: v.local_index, partType: v.part_type }));
        if (options.length < 10) return null;
        const labelKey = book.index?.startsWith('quran:') ? 'book.jumpToAyah' : 'book.jumpToHadith';
        return { labelKey, options };
      }),
    );

  translatedPartType(partType: string): string {
    return this.i18nService.translatePartType(partType);
  }

  onJump(value: string): void {
    const index = parseInt(value, 10);
    if (Number.isNaN(index)) return;
    this.router.navigate([], {
      fragment: 'h' + index,
      queryParamsHandling: 'preserve',
    });
  }
}
