import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AiContentService, PhraseIndexEntry } from '@app/services/ai-content.service';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-phrase-detail',
  templateUrl: './phrase-detail.component.html',
  styleUrls: ['./phrase-detail.component.scss'],
  standalone: false,
})
export class PhraseDetailComponent implements OnInit, OnDestroy {

  phraseKey = '';
  phrase: PhraseIndexEntry | null = null;
  loading = true;
  notFound = false;

  private subscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private aiContentService: AiContentService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.subscription = this.route.paramMap.pipe(
      switchMap(params => {
        this.phraseKey = decodeURIComponent(params.get('phraseAr') || '');
        this.loading = true;
        this.notFound = false;
        this.cdr.markForCheck();
        return this.aiContentService.getPhrases();
      })
    ).subscribe(phrases => {
      this.loading = false;
      if (phrases && this.phraseKey && phrases[this.phraseKey]) {
        this.phrase = phrases[this.phraseKey];
      } else {
        this.notFound = true;
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  formatLabel(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  getPathDisplay(path: string): string {
    return path.replace('/books/', '').replace(/:/g, ' › ');
  }

  getRouterLink(path: string): string {
    return path.replace('/books/', '');
  }
}
