import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Book, BookTitle } from '@app/models';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BooksService {

  private static readonly apiVersion = 'api/v1/';
  private static readonly booksUrl = environment.apiBaseUrl + BooksService.apiVersion + 'books';

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  getTitles(): Observable<BookTitle[]> {
    return this.http.get<BookTitle[]>(BooksService.booksUrl);
  }

  getPart(index: string): Observable<Book> {
    return this.http.get<Book>(`${BooksService.booksUrl}/${index}`);
  }

  constructor(private http: HttpClient) { }
}
