import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { OfflineStorageService, DownloadProgress, OfflineBookMeta } from '@app/services/offline-storage.service';
import { Subscription } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-download',
  templateUrl: './download.component.html',
  styleUrls: ['./download.component.scss']
})
export class DownloadComponent implements OnInit, OnDestroy {

  downloadedBooks: OfflineBookMeta[] = [];
  progress: DownloadProgress = { bookId: '', loaded: 0, total: 0, status: 'idle' };
  availableBooks: string[] = [];

  private sub: Subscription | null = null;

  constructor(
    private offlineStorage: OfflineStorageService,
    private cdr: ChangeDetectorRef,
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

  private loadDownloadedBooks(): void {
    this.offlineStorage.getDownloadedBooks().then(books => {
      this.downloadedBooks = books;
      this.cdr.markForCheck();
    });
  }
}
