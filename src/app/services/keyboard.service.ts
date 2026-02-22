import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, OnDestroy, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { ThemeService } from './theme.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutService implements OnDestroy {
  private helpVisibleSubject = new BehaviorSubject<boolean>(false);
  helpVisible$: Observable<boolean> = this.helpVisibleSubject.asObservable();
  private isBrowser: boolean;

  private boundHandler = this.handleKeydown.bind(this);

  constructor(
    private router: Router,
    private store: Store,
    private theme: ThemeService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      document.addEventListener('keydown', this.boundHandler);
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      document.removeEventListener('keydown', this.boundHandler);
    }
  }

  toggleHelp(): void {
    this.helpVisibleSubject.next(!this.helpVisibleSubject.value);
  }

  dismissHelp(): void {
    this.helpVisibleSubject.next(false);
  }

  private handleKeydown(event: KeyboardEvent): void {
    // Don't intercept when typing in inputs or textareas
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' ||
        target.isContentEditable) {
      // Allow Escape to blur input
      if (event.key === 'Escape') {
        target.blur();
        event.preventDefault();
      }
      return;
    }

    // Don't intercept with modifier keys (except Shift for ?)
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    switch (event.key) {
      case 'j':
        this.navigateNext();
        event.preventDefault();
        break;
      case 'k':
        this.navigatePrev();
        event.preventDefault();
        break;
      case 'u':
        this.navigateUp();
        event.preventDefault();
        break;
      case '/':
        this.focusSearch();
        event.preventDefault();
        break;
      case '?':
        this.toggleHelp();
        event.preventDefault();
        break;
      case 'd':
        this.theme.toggleTheme();
        event.preventDefault();
        break;
      case 'Escape':
        if (this.helpVisibleSubject.value) {
          this.dismissHelp();
          event.preventDefault();
        }
        break;
    }
  }

  private navigateNext(): void {
    const nav = this.store.selectSnapshot(BooksState.getBookNavigation);
    if (nav?.next) {
      this.router.navigateByUrl(nav.next);
    }
  }

  private navigatePrev(): void {
    const nav = this.store.selectSnapshot(BooksState.getBookNavigation);
    if (nav?.prev) {
      this.router.navigateByUrl(nav.prev);
    }
  }

  private navigateUp(): void {
    const nav = this.store.selectSnapshot(BooksState.getBookNavigation);
    if (nav?.up) {
      this.router.navigateByUrl(nav.up);
    }
  }

  private focusSearch(): void {
    if (!this.isBrowser) { return; }
    const searchInput = document.querySelector<HTMLInputElement>('.search-bar-input input, .search-bar-input');
    if (searchInput) {
      searchInput.focus();
    }
  }
}
