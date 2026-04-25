import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { SeoService } from '@app/services/seo.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-not-found',
    templateUrl: './not-found.component.html',
    styleUrls: ['./not-found.component.scss'],
    standalone: false,
})
export class NotFoundComponent implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setNotFoundPage();
  }
}
