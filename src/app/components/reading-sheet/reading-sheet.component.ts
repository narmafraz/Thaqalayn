import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AiLanguage } from '@app/models/ai-content';
import { AiPreferences, AiPreferencesService } from '@app/services/ai-preferences.service';
import { ReadingSheetService } from '@app/services/reading-sheet.service';

/**
 * Global Reading Sheet — slide-out panel hosted at the app shell.
 * Currently surfaces AI preferences (was the inline ai-settings-panel
 * inside SettingsComponent). Step 4 of READING_CONTROLS_REDESIGN will
 * add the 3 view-toggles (chain / diacritics / WBW) here too; for now
 * those still live on per-verse footers.
 *
 * Trigger: SettingsComponent's `ai-settings-btn` calls
 * `ReadingSheetService.toggle()`. The sheet is single-instance,
 * survives route changes (hosted in `app.component.html`), and closes
 * on Esc or backdrop click.
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
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly open$: Observable<boolean> = this.sheet.open$;
  readonly preferences$: Observable<AiPreferences> = this.aiPrefs.preferences$;

  /** Element that had focus before the sheet opened, restored on close. */
  private previouslyFocused: HTMLElement | null = null;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.sheet.open$.pipe(takeUntil(this.destroy$)).subscribe(isOpen => {
      if (isOpen) {
        this.previouslyFocused = (document.activeElement as HTMLElement) ?? null;
        // Defer to after the panel is in the DOM and CSS class applied.
        // setTimeout works for tests + real browsers; using rAF in SSR
        // contexts isn't safe so timeout is the portable choice.
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

  onPrefChange<K extends keyof AiPreferences>(key: K, value: AiPreferences[K]): void {
    this.aiPrefs.set(key, value);
  }

  /** Type-narrowed wrapper so the template can pass strings without `any`. */
  onLangChange(value: AiLanguage): void {
    this.aiPrefs.set('wordByWordDefaultLang', value);
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
