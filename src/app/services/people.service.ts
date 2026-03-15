import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NarratorWrapper } from '@app/models';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { retry, timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PeopleService {

  private static readonly narratorsUrl = environment.apiBaseUrl + 'people/narrators';

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };


  getNarrator(index: string): Observable<NarratorWrapper> {
    return this.http.get<NarratorWrapper>(`${PeopleService.narratorsUrl}/${index}.json`).pipe(
      timeout(30000),
      retry({ count: 2, delay: 1000 })
    );
  }

  getFeaturedNarrators(): Observable<FeaturedNarratorsResponse> {
    return this.http.get<FeaturedNarratorsResponse>(`${PeopleService.narratorsUrl}/featured.json`).pipe(
      timeout(15000),
      retry({ count: 1, delay: 1000 })
    );
  }

  constructor(private http: HttpClient) { }
}

export interface FeaturedNarratorEntry {
  id: number;
  name_ar: string;
  name_en: string;
  narrations: number;
}

export interface FeaturedNarratorsResponse {
  index: string;
  kind: string;
  data: {
    featured: FeaturedNarratorEntry[];
    imam_ids: Record<string, { name_en: string; name_ar: string }>;
  };
}
