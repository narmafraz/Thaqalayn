import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Book display name mapping */
const BOOK_NAMES: Record<string, string> = {
  'al-kafi': 'Al-Kafi',
  'quran': 'Quran',
  'man-la-yahduruhu-al-faqih': 'Man La Yahduruhu al-Faqih',
  'tahdhib-al-ahkam': 'Tahdhib al-Ahkam',
  'al-istibsar': 'Al-Istibsar',
  'wasael-ul-shia': 'Wasael ul-Shia',
  'bihar-al-anwar': 'Bihar al-Anwar',
  'nahj-al-balagha': 'Nahj al-Balagha',
  'kitab-al-irshad': 'Kitab al-Irshad',
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-path-link',
    templateUrl: './path-link.component.html',
    styleUrls: ['./path-link.component.scss'],
    standalone: false
})
export class PathLinkComponent {
  @Input() path: string;

  splitOnLastColon(path: string): string[] {
    const index = path.lastIndexOf(':');
    if (index < 0) {
      return [path, ''];
    }
    return [path.slice(0, index), path.slice(index + 1)];
  }

  formatReadable(path: string): string {
    const raw = path.startsWith('/books/') ? path.slice(7) : path;
    const parts = raw.split(':');
    const bookId = parts[0];
    const bookName = BOOK_NAMES[bookId] || this.titleCase(bookId);
    const segments = parts.slice(1);

    if (!segments.length) return bookName;

    if (bookId === 'quran') {
      return segments.length === 1
        ? `${bookName} ${segments[0]}`
        : `${bookName} ${segments[0]}:${segments[1]}`;
    }

    if (bookId === 'al-kafi') {
      return this.formatKafi(bookName, segments);
    }

    // Generic: Book Vol:Ch:Hadith
    return `${bookName} ${segments.join(':')}`;
  }

  private formatKafi(bookName: string, segments: string[]): string {
    // al-kafi:vol:book:chapter:hadith
    switch (segments.length) {
      case 1: return `${bookName}, Vol. ${segments[0]}`;
      case 2: return `${bookName} ${segments[0]}:${segments[1]}`;
      case 3: return `${bookName} ${segments[0]}:${segments[1]}:${segments[2]}`;
      case 4: return `${bookName} ${segments[0]}:${segments[1]}:${segments[2]}, #${segments[3]}`;
      default: return `${bookName} ${segments.join(':')}`;
    }
  }

  private titleCase(str: string): string {
    return str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
