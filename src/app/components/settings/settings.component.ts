import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Navigation } from '@app/models';
import { Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  nav$: Observable<Navigation> = inject(Store).select(BooksState.getBookNavigation);

  constructor(private store: Store) {
  }
}
