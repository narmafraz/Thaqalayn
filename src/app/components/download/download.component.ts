import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OfflineStorageService, DownloadProgress, OfflineBookMeta } from '@app/services/offline-storage.service';
import { environment } from '@env/environment';
import { Subscription } from 'rxjs';

interface DataPackage {
  id: string;
  name: string;
  format: string;
  size: string;
  url: string;
  csvExport: boolean;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-download',
    templateUrl: './download.component.html',
    styleUrls: ['./download.component.scss'],
    standalone: false
})
export class DownloadComponent implements OnInit, OnDestroy {

  downloadedBooks: OfflineBookMeta[] = [];
  progress: DownloadProgress = { bookId: '', loaded: 0, total: 0, status: 'idle' };
  availableBooks: string[] = [];
  csvExporting: string | null = null;

  dataPackages: DataPackage[] = [
    {
      id: 'al-kafi-complete',
      name: 'Al-Kafi (Complete)',
      format: 'JSON',
      size: '84 MB',
      url: environment.apiBaseUrl + 'books/complete/al-kafi.json',
      csvExport: true,
    },
    {
      id: 'quran-complete',
      name: 'Holy Quran (Complete)',
      format: 'JSON',
      size: '47 MB',
      url: environment.apiBaseUrl + 'books/complete/quran.json',
      csvExport: true,
    },
    {
      id: 'narrators',
      name: 'Narrator Index',
      format: 'JSON',
      size: '~2 MB',
      url: environment.apiBaseUrl + 'people/narrators/index.json',
      csvExport: false,
    },
    {
      id: 'translations',
      name: 'Translation Metadata',
      format: 'JSON',
      size: '<1 KB',
      url: environment.apiBaseUrl + 'index/translations.json',
      csvExport: false,
    },
  ];

  private sub: Subscription | null = null;

  constructor(
    private offlineStorage: OfflineStorageService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
  ) {
    this.availableBooks = this.offlineStorage.getAvailableBooks();
  }

  ngOnInit(): void {
    this.loadDownloadedBooks();
    this.sub = this.offlineStorage.progress$.subscribe(p => {
      this.progress = p;
      if (p.status === 'complete') {
        this.loadDownloadedBooks();
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  isDownloaded(bookId: string): boolean {
    return this.downloadedBooks.some(b => b.bookId === bookId);
  }

  isDownloading(bookId: string): boolean {
    return this.progress.status === 'downloading' && this.progress.bookId === bookId;
  }

  downloadBook(bookId: string): void {
    this.offlineStorage.downloadBook(bookId);
  }

  removeBook(bookId: string): void {
    this.offlineStorage.removeBook(bookId).then(() => {
      this.loadDownloadedBooks();
    });
  }

  formatBookName(bookId: string): string {
    const names: Record<string, string> = {
      'quran': 'Quran',
      'al-kafi': 'Al-Kafi',
    };
    return names[bookId] || bookId;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  exportAsCsv(packageId: string): void {
    const pkg = this.dataPackages.find(p => p.id === packageId);
    if (!pkg) return;

    this.csvExporting = packageId;
    this.cdr.markForCheck();

    this.http.get(pkg.url).subscribe({
      next: (json: any) => {
        const csv = this.jsonToCsv(json, packageId);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = packageId + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        this.csvExporting = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.csvExporting = null;
        this.cdr.markForCheck();
      }
    });
  }

  private jsonToCsv(json: any, packageId: string): string {
    const data = json.data || json;
    const verses = this.extractVerses(data);

    if (verses.length === 0) return '';

    const headers = ['index', 'path', 'arabic_text', 'english_translation'];
    const rows = verses.map(v => {
      const arabic = (v.text || []).join(' ');
      const translations = v.translations || {};
      const enKey = Object.keys(translations).find(k => k.startsWith('en.')) || '';
      const english = enKey ? (translations[enKey] || []).join(' ') : '';
      return [v.index, v.path, arabic, english].map(val => '"' + String(val || '').replace(/"/g, '""') + '"');
    });

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  private extractVerses(data: any): any[] {
    if (!data) return [];
    if (data.verses && Array.isArray(data.verses)) return data.verses;
    if (data.chapters && Array.isArray(data.chapters)) {
      return data.chapters.reduce((acc: any[], ch: any) => acc.concat(this.extractVerses(ch)), []);
    }
    return [];
  }

  private loadDownloadedBooks(): void {
    this.offlineStorage.getDownloadedBooks().then(books => {
      this.downloadedBooks = books;
      this.cdr.markForCheck();
    });
  }
}
