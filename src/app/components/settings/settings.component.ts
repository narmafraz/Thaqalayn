import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { AiLanguage } from '@app/models/ai-content';
import { Navigation } from '@app/models';
import { AiPreferencesService } from '@app/services/ai-preferences.service';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss'],
    standalone: false
})
export class SettingsComponent {
  nav$: Observable<Navigation> = inject(Store).select(BooksState.getBookNavigation);
  showAiSettings = false;

  constructor(
    private store: Store,
    private cdr: ChangeDetectorRef,
    public aiPrefs: AiPreferencesService,
  ) {}

  getPathTitle(_path: string) {
    return "todo"; // TODO fix me and also fix the tooltip
  }

  toggleAiSettings(): void {
    this.showAiSettings = !this.showAiSettings;
    this.cdr.markForCheck();
  }

  onPrefChange(key: string, value: boolean | string): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.aiPrefs.set(key as any, value as any);
    this.cdr.markForCheck();
  }

  get wordLang(): AiLanguage {
    return this.aiPrefs.get('wordByWordDefaultLang');
  }
}
