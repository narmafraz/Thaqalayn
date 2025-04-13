import { State, Action, StateContext, NgxsOnInit, Selector } from '@ngxs/store';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, tap } from 'rxjs';
import { LoadIndex } from './index.actions';
import { environment } from '@env/environment';

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
  private static readonly indexUrl = environment.apiBaseUrl + 'index';

  constructor(private http: HttpClient) {}

  ngxsOnInit(ctx: StateContext<IndexStateModel>) {
    // Dispatch for Arabic index on initialization.
    ctx.dispatch(new LoadIndex('ar'));
  }

  @Selector()
  static getBookForLanguage(state: IndexStateModel) {
    return (language: string): IndexedTitles => {
      return state.books[language];
    };
  }

  @Action(LoadIndex)
  loadIndex(ctx: StateContext<IndexStateModel>, action: LoadIndex) {
    return this.http.get<Record<string, IndexedTitles>>(`${IndexState.indexUrl}/books.${action.language}.json`).pipe(
      tap((booksData) => {
        const currentBooks = ctx.getState().books;
        ctx.patchState({ books: { ...currentBooks, [action.language]: booksData } as Record<string, IndexedTitles> });
      })
    );
  }
}
