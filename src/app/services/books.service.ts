import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Book } from '@app/models';
import { OfflineStorageService } from './offline-storage.service';
import { environment } from '@env/environment';
import { Observable, from, of } from 'rxjs';
import { catchError, retry, switchMap, tap, timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BooksService {

  private static readonly bookpartsUrl = environment.apiBaseUrl + 'books';

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  getPart(index: string): Observable<Book> {
    // Try offline storage first (downloaded books + cached responses), then network
    return from(this.getOfflinePart(index)).pipe(
      catchError(() => of(null as Book | null)), // catch offline storage errors only
      switchMap(offlineData => {
        if (offlineData) return of(offlineData);
        return this.fetchFromNetwork(index);
      })
    );
  }

  private fetchFromNetwork(index: string): Observable<Book> {
    return this.http.get<Book>(`${BooksService.bookpartsUrl}/${index.replace(/:/g, '/')}.json`).pipe(
      timeout(30000),
      retry({ count: 2, delay: 1000 }),
      tap(book => {
        // Cache-on-read: store the response for future offline access
        this.offlineStorage.cacheResponse(index, book);
      })
    );
  }

  private async getOfflinePart(index: string): Promise<Book | null> {
    // Check downloaded complete books first
    const fromBook = await this.offlineStorage.getPartFromBook(index);
    if (fromBook) return fromBook;
    // Then check individual cached responses
    return this.offlineStorage.getCachedResponse(index);
  }

  private http = inject(HttpClient);
  private offlineStorage = inject(OfflineStorageService);
}
