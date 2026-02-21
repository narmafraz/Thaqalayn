import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { VerseDetail } from '@app/models';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-verse-detail',
  templateUrl: './verse-detail.component.html',
  styleUrls: ['./verse-detail.component.scss'],
})
export class VerseDetailComponent {
  @Input() book$: Observable<VerseDetail>;

  translation$: Observable<string> = inject(Store).select(BooksState.getTranslationIfInBookOrDefault);

  translationClass$: Observable<string> = this.translation$.pipe(
    map(t => t ? t.split('.')[0] : 'en')
  );

  linkCopied = false;

  getGradingClass(grading: string): string {
    const lower = grading.toLowerCase();
    if (lower === 'sahih' || lower === 'صحيح') return 'grading-sahih';
    if (lower === 'hasan' || lower === 'حسن') return 'grading-hasan';
    if (lower === "da'if" || lower === 'ضعيف' || lower === 'daif') return 'grading-daif';
    if (lower === "mu'tabar" || lower === 'معتبر' || lower === 'muatabar') return 'grading-mutabar';
    return 'grading-unknown';
  }

  getChapterRouterLink(chapterPath: string): string {
    return chapterPath.replace('/books/', '');
  }

  getNavRouterLink(path: string): string {
    return path.replace('/books/', '');
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
}
