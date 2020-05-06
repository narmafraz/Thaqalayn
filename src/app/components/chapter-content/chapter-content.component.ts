import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { ChapterContent } from '@app/models';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-chapter-content',
  templateUrl: './chapter-content.component.html',
  styleUrls: ['./chapter-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChapterContentComponent implements OnInit {
  @Input() book$: Observable<ChapterContent>;

  constructor() { }

  ngOnInit(): void {
  }

}
