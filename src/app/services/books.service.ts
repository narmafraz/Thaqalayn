import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Book, NarratorWrapper } from '@app/models';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BooksService {

  private static readonly bookpartsUrl = environment.apiBaseUrl + 'books';
  private static readonly narratorsUrl = environment.apiBaseUrl + 'people/narrators';

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };


  getPart(index: string): Observable<Book> {
    return this.http.get<Book>(`${BooksService.bookpartsUrl}/${index.replace(/:/g, '/')}.json`);
  }

  getNarrator(index: string): Observable<NarratorWrapper> {
    return this.http.get<NarratorWrapper>(`${BooksService.narratorsUrl}/${index}.json`);
  }

  constructor(private http: HttpClient) { }
}
