import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { BookTitle } from '@app/models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chapter-list',
  templateUrl: './chapter-list.component.html',
  styleUrls: ['./chapter-list.component.scss']
})
export class ChapterListComponent implements OnInit {
  @Input() book: BookTitle;

  constructor() { }

  ngOnInit(): void {
  }

}
