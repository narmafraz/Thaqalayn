import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PwaService } from '@app/services/pwa.service';
import { Observable } from 'rxjs';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-install-prompt',
    templateUrl: './install-prompt.component.html',
    styleUrls: ['./install-prompt.component.scss'],
    standalone: false
})
export class InstallPromptComponent {

  installable$: Observable<boolean>;
  updateAvailable$: Observable<boolean>;

  constructor(private pwa: PwaService) {
    this.installable$ = this.pwa.installable$;
    this.updateAvailable$ = this.pwa.updateAvailable$;
  }

  install(): void {
    this.pwa.promptInstall();
  }

  applyUpdate(): void {
    this.pwa.applyUpdate();
  }

  dismissUpdate(): void {
    this.pwa.dismissUpdate();
  }
}
