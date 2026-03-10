import { State, Action, StateContext, NgxsOnInit, Selector } from '@ngxs/store';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { LoadIndex, LoadTranslations } from './index.actions';
import { environment } from '@env/environment';
import { Store } from '@ngxs/store';
import { RouterState } from '../router/router.state';
import { I18nService } from '@app/services/i18n.service';
import { Translation } from '@app/models';

export interface IndexedTitleEntry {
  local_index: number;
  part_type: string;
  title: string;
}

export type IndexedTitles = Record<string, IndexedTitleEntry>;

export interface IndexStateModel {
  books: Record<string, IndexedTitles>;
  translations: Record<string, Translation>;
}

@State<IndexStateModel>({
  name: 'index',
  defaults: {
    books: {},
    translations: {}
  }
})
@Injectable()
export class IndexState implements NgxsOnInit {
  private static readonly indexUrl = environment.apiBaseUrl + 'index';

  constructor(private http: HttpClient, private store: Store, private i18n: I18nService) {}

  ngxsOnInit(ctx: StateContext<IndexStateModel>) {
    ctx.dispatch(new LoadIndex('ar'));
    ctx.dispatch(new LoadIndex('en'));
    // Use I18nService's already-detected language (which checks URL ?lang= param)
    // instead of RouterState which hasn't processed the first navigation yet
    const i18nLang = this.i18n.currentLang;
    const routerLang = this.store.selectSnapshot(RouterState.getLanguage);
    const lang = i18nLang !== 'en' ? i18nLang : routerLang;
    if (lang !== 'ar' && lang !== 'en') {
      ctx.dispatch(new LoadIndex(lang));
    }
    ctx.dispatch(new LoadTranslations());
  }

  @Selector()
  static getBookForLanguage(state: IndexStateModel) {
    return (language: string): IndexedTitles => {
      return state.books[language];
    };
  }

  @Selector()
  static getTranslations(state: IndexStateModel): Record<string, Translation> {
    return state.translations;
  }

  @Action(LoadIndex)
  loadIndex(ctx: StateContext<IndexStateModel>, action: LoadIndex) {
    return this.http.get<Record<string, IndexedTitles>>(`${IndexState.indexUrl}/books.${action.language}.json`).pipe(
      tap((booksData) => {
        const currentBooks = ctx.getState().books;
        ctx.patchState({ books: { ...currentBooks, [action.language]: booksData } as Record<string, IndexedTitles> });
      }),
      catchError(() => {
        // When a language index file 404s (e.g., books.fa.json), fall back to English index
        const currentBooks = ctx.getState().books;
        if (currentBooks['en'] && action.language !== 'en') {
          ctx.patchState({ books: { ...currentBooks, [action.language]: currentBooks['en'] } });
        }
        return of(null);
      })
    );
  }

  @Action(LoadTranslations)
  loadTranslations(ctx: StateContext<IndexStateModel>) {
    const state = ctx.getState();
    if (Object.keys(state.translations).length > 0) {
      return;
    }
    return this.http.get<Record<string, Translation>>(`${IndexState.indexUrl}/translations.json`).pipe(
      tap((data) => {
        ctx.patchState({ translations: data });
      })
    );
  }
}
