import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Navigation } from '@app/models';
import { ReadingSheetService } from '@app/services/reading-sheet.service';
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
  private readingSheet = inject(ReadingSheetService);
  open$: Observable<boolean> = this.readingSheet.open$;

  constructor(private store: Store) {}

  getPathTitle(_path: string) {
    return "todo"; // TODO fix me and also fix the tooltip
  }

  /** Opens the global Reading Sheet hosted at the app shell. */
  toggleAiSettings(): void {
    this.readingSheet.toggle();
  }
}
