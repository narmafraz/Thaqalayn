import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NarratorWrapper } from '@app/models';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PeopleService {

  private static readonly narratorsUrl = environment.apiBaseUrl + 'people/narrators';

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };


  getNarrator(index: string): Observable<NarratorWrapper> {
    return this.http.get<NarratorWrapper>(`${PeopleService.narratorsUrl}/${index}.json`);
  }

  constructor(private http: HttpClient) { }
}
