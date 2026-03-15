import { Injectable, inject } from '@angular/core';
import { BooksService } from './books.service';
import { Verse, VerseDetail } from '@app/models/book';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class VerseLoaderService {
  private booksService = inject(BooksService);
  private cache = new Map<string, Observable<Verse>>();

  loadVerse(path: string): Observable<Verse> {
    const cached = this.cache.get(path);
    if (cached) return cached;

    const index = path.startsWith('/books/') ? path.slice(7) : path;
    const obs = this.booksService.getPart(index).pipe(
      map(book => {
        if (book.kind === 'verse_detail') {
          return (book as VerseDetail).data.verse;
        }
        return null as unknown as Verse;
      }),
      shareReplay(1),
    );
    this.cache.set(path, obs);
    return obs;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
