import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AiLanguage } from '@app/models/ai-content';
import { AiPreferences, AiPreferencesService } from '@app/services/ai-preferences.service';
import { BookmarkService } from '@app/services/bookmark.service';
import { ReadingSheetService } from '@app/services/reading-sheet.service';
import { I18nService, ThemeService } from '@app/services';
import { ThemeMode } from '@app/services/theme.service';

/**
 * Global Settings sheet — slide-out panel hosted at the app shell.
 * Single canonical surface for all reading-app settings:
 *   - Display (theme, font size)
 *   - Language (UI language, word-by-word default language)
 *   - AI Features (diacritics-by-default, badges, topic tags, disclaimer)
 *   - Navigate (top-level routes; on mobile this also replaces the old
 *     hamburger menu, so the trigger is the *only* nav-and-settings
 *     affordance off the header).
 *
 * Trigger: the labeled "Settings" pill in `app.component.html`
 * (desktop and mobile) calls `ReadingSheetService.toggle()`.
 * Single-instance, survives route changes, closes on Esc / backdrop.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-reading-sheet',
  templateUrl: './reading-sheet.component.html',
  styleUrls: ['./reading-sheet.component.scss'],
  standalone: false,
})
export class ReadingSheetComponent implements OnInit, OnDestroy {
  readonly sheet = inject(ReadingSheetService);
  readonly aiPrefs = inject(AiPreferencesService);
  private readonly themeService = inject(ThemeService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly bookmarks = inject(BookmarkService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly open$: Observable<boolean> = this.sheet.open$;
  readonly preferences$: Observable<AiPreferences> = this.aiPrefs.preferences$;
  readonly theme$: Observable<ThemeMode> = this.themeService.theme$;
  readonly fontSize$: Observable<number> = this.themeService.fontSize$;
  readonly currentLang$: Observable<string> = this.i18n.currentLang$;

  readonly uiLanguages = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'العربية' },
    { code: 'fa', name: 'فارسی' },
    { code: 'fr', name: 'Français' },
    { code: 'ur', name: 'اردو' },
    { code: 'tr', name: 'Türkçe' },
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'bn', name: 'বাংলা' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ru', name: 'Русский' },
    { code: 'zh', name: '中文' },
  ];

  readonly navLinks = [
    { route: '/books', icon: 'menu_book', labelKey: 'nav.books' },
    { route: '/topics', icon: 'category', labelKey: 'nav.topics' },
    { route: '/people/narrators', icon: 'people', labelKey: 'nav.narrators' },
    { route: '/bookmarks', icon: 'bookmark', labelKey: 'nav.bookmarks' },
    { route: '/about', icon: 'info', labelKey: 'nav.about' },
    { route: '/download', icon: 'download', labelKey: 'nav.download' },
    { route: '/support', icon: 'volunteer_activism', labelKey: 'nav.support' },
  ];

  /** Element that had focus before the sheet opened, restored on close. */
  private previouslyFocused: HTMLElement | null = null;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.sheet.open$.pipe(takeUntil(this.destroy$)).subscribe(isOpen => {
      if (isOpen) {
        this.previouslyFocused = (document.activeElement as HTMLElement) ?? null;
        // Defer to after the panel is in the DOM and CSS class applied.
        setTimeout(() => this.focusFirst(), 0);
      } else if (this.previouslyFocused) {
        const target = this.previouslyFocused;
        this.previouslyFocused = null;
        target.focus?.();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  close(): void {
    this.sheet.close();
  }

  // --- Display ---
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
  increaseFontSize(): void {
    this.themeService.increaseFontSize();
  }
  decreaseFontSize(): void {
    this.themeService.decreaseFontSize();
  }
  resetFontSize(): void {
    this.themeService.resetFontSize();
  }

  // --- Language ---
  onUiLanguageChange(lang: string): void {
    this.i18n.setLanguage(lang);
    this.router.navigate([], {
      queryParams: { lang },
      queryParamsHandling: 'merge',
    });
  }
  onWordByWordLangChange(value: AiLanguage): void {
    this.aiPrefs.set('wordByWordDefaultLang', value);
  }

  // --- AI prefs ---
  onPrefChange<K extends keyof AiPreferences>(key: K, value: AiPreferences[K]): void {
    this.aiPrefs.set(key, value);
  }

  /** Wipe ALL read marks across every book. RE-17. */
  async resetAllProgress(): Promise<void> {
    const all = await this.bookmarks.getReadVerses();
    if (all.length === 0) return;
    const msg = this.i18n.get('reading.resetAllConfirm');
    const fallback = `Remove all ${all.length} read marks across all books?`;
    const ok = window.confirm(
      msg === 'reading.resetAllConfirm'
        ? fallback
        : msg.replace(/\{\{\s*count\s*\}\}/g, String(all.length)),
    );
    if (!ok) return;
    await this.bookmarks.clearReadVerses();
  }

  // --- Navigate (closes the sheet on click) ---
  navigateTo(route: string): void {
    this.close();
    this.router.navigateByUrl(route);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.sheet.isOpen) this.close();
  }

  /** Cycles focus inside the panel while it's open. */
  @HostListener('document:keydown.Tab', ['$event'])
  @HostListener('document:keydown.shift.Tab', ['$event'])
  onTab(event: KeyboardEvent): void {
    if (!this.sheet.isOpen) return;
    const focusables = this.focusableElements();
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    // If focus has escaped the panel entirely, pull it back in.
    if (!active || !this.host.nativeElement.contains(active)) {
      event.preventDefault();
      first.focus();
      return;
    }
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusFirst(): void {
    const focusables = this.focusableElements();
    focusables[0]?.focus();
  }

  private focusableElements(): HTMLElement[] {
    const panel: HTMLElement | null = this.host.nativeElement.querySelector('.reading-sheet-panel');
    if (!panel) return [];
    return Array.from(panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }
}
