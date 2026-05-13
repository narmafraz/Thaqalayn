import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { RootPage } from '@app/models/word';
import { WordsService } from '@app/services/words.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-word-root',
  templateUrl: './word-root.component.html',
  styleUrls: ['./word-root.component.scss'],
  standalone: false,
})
export class WordRootComponent implements OnInit, OnDestroy {
  slug = '';
  root: RootPage | null = null;
  loading = true;
  notFound = false;

  private subscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private words: WordsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.subscription = this.route.paramMap.pipe(
      switchMap(params => {
        this.slug = params.get('slug') || '';
        this.loading = true;
        this.notFound = false;
        this.root = null;
        this.cdr.markForCheck();
        return this.words.getRoot(this.slug);
      }),
    ).subscribe(page => {
      this.loading = false;
      if (page) {
        this.root = page;
      } else {
        this.notFound = true;
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
