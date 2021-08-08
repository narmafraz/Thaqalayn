import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-path-link',
  templateUrl: './path-link.component.html',
  styleUrls: ['./path-link.component.scss']
})
export class PathLinkComponent {
  @Input() path: string;
  splitOnLastColon(path: string): string[] {
    const index = path.lastIndexOf(":");
    if (index < 0) {
      return [path, ""];
    }
    return [path.slice(0, index), path.slice(index+1)];
  }

  removeBookPrefix(path: string): string {
    return path.slice(7);
  }
}
