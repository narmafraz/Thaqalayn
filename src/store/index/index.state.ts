import { State, Action, StateContext, NgxsOnInit, Selector } from '@ngxs/store';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, tap } from 'rxjs';
import { LoadIndex } from './index.actions';
import { environment } from '@env/environment';
import { Store } from '@ngxs/store';
import { RouterState } from '../router/router.state';

export interface IndexedTitleEntry {
  local_index: number;
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

  constructor(private http: HttpClient, private store: Store) {}

  ngxsOnInit(ctx: StateContext<IndexStateModel>) {
    ctx.dispatch(new LoadIndex('ar'));
    const lang = this.store.selectSnapshot(RouterState.getLanguage);
    ctx.dispatch(new LoadIndex(lang));
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
