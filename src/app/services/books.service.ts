import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Book } from '@app/models';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { retry, timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BooksService {

  private static readonly bookpartsUrl = environment.apiBaseUrl + 'books';

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };


  getPart(index: string): Observable<Book> {
    return this.http.get<Book>(`${BooksService.bookpartsUrl}/${index.replace(/:/g, '/')}.json`).pipe(
      timeout(30000),
      retry({ count: 2, delay: 1000 })
    );
  }

  private http = inject(HttpClient);
}
