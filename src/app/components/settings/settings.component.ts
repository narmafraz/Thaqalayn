import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Navigation } from '@app/models';
import { Navigate } from '@ngxs/router-plugin';
import { Select, Store } from '@ngxs/store';
import { BooksState } from '@store/books/books.state';
import { Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  @Select(BooksState.getBookNavigation) nav$: Observable<Navigation>;
}
