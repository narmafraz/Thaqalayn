import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { Observable } from 'rxjs';
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
export class ReadingSheetComponent {
  readonly sheet = inject(ReadingSheetService);
  readonly aiPrefs = inject(AiPreferencesService);
  readonly open$: Observable<boolean> = this.sheet.open$;
  readonly preferences$: Observable<AiPreferences> = this.aiPrefs.preferences$;

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
}
