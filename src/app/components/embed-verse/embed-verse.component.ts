import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Book, VerseDetail, ChapterContent } from '@app/models';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-embed-verse',
    templateUrl: './embed-verse.component.html',
    styleUrls: ['./embed-verse.component.scss'],
    standalone: false
})
export class EmbedVerseComponent {
  book$: Observable<Book> = inject(Store).select(BooksState.getCurrentNavigatedPart);
  loading$: Observable<boolean> = inject(Store).select(BooksState.getCurrentLoading);
  translation$: Observable<string> = inject(Store).select(BooksState.getTranslationIfInBookOrDefault);

  translationClass$: Observable<string> = this.translation$.pipe(
    map(t => t ? t.split('.')[0] : 'en')
  );

  theme: string;

  constructor(private route: ActivatedRoute) {
    this.route.queryParams.subscribe(params => {
      this.theme = params['theme'] || 'auto';
    });
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
}
