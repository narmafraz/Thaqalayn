import { State, Action, StateContext, NgxsOnInit } from '@ngxs/store';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, tap } from 'rxjs';
import { LoadIndex } from './index.actions';

export interface IndexedTitleEntry {
  part_type: string;
  title: string;
}

export type IndexedTitles = Record<string, IndexedTitleEntry>;

export interface IndexStateModel {
  books: Record<string, IndexedTitles>;
}

@State<IndexStateModel>({
  name: 'index',
  defaults: {
    books: {}
  }
})
@Injectable()
export class IndexState implements NgxsOnInit {
  constructor(private http: HttpClient) {}

  ngxsOnInit(ctx: StateContext<IndexStateModel>) {
    // Dispatch with default language 'en'
    ctx.dispatch(new LoadIndex('en'));
  }

  @Action(LoadIndex)
  loadIndex(ctx: StateContext<IndexStateModel>, action: LoadIndex) {
    const { language } = action;
    return forkJoin({
      booksAr: this.http.get<Record<string, IndexedTitles>>('/index/books.ar.json'),
      booksLocalized: this.http.get<Record<string, IndexedTitles>>(`/index/books.${language}.json`)
    }).pipe(
      tap(({ booksAr, booksLocalized }) => {
        ctx.patchState({ books: { ar: booksAr, [language]: booksLocalized } });
      })
    );
  }
}
