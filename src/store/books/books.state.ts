import { Injectable } from '@angular/core';
import { Book, ChapterList, getChapter, getDefaultVerseTranslationIds, getVerseTranslations, Navigation, Translation } from '@app/models';
import { BooksService } from '@app/services';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { RouterState } from '@store/router/router.state';
import { tap } from 'rxjs/operators';
import { LoadBookPart } from './books.actions';

export interface BooksStateModel {
  titles: ChapterList[];
  parts: { [index: string]: Book };
}

@State<BooksStateModel>({
  name: 'books',
  defaults: {
    titles: [],
    parts: {}
  }
})
@Injectable()
export class BooksState {
  constructor(private booksService: BooksService) {}

  @Selector([BooksState])
  public static getState(state: BooksStateModel) {
    return state;
  }

  @Selector([BooksState])
  public static getTitles(state: BooksStateModel) {
    return state.titles;
  }

  @Selector([BooksState])
  public static getParts(state: BooksStateModel) {
    return state.parts;
  }

  @Selector([BooksState])
  public static getPartByIndex(state: BooksStateModel) {
    return (index: string) => {
      if (!state.parts) {
        return undefined;
      }

      return state.parts[index];
    };
  }

  @Selector([BooksState, BooksState.getPartByIndex, RouterState.getBookPartIndex])
  public static getCurrentNavigatedPart(state: BooksStateModel, partByIndex: ((index: string) => Book),
                                        routerIndex: string) {
    const index = routerIndex ?  routerIndex : 'books';

    return partByIndex(index);
  }

  @Selector([BooksState, BooksState.getCurrentNavigatedPart, RouterState.getLanguage, RouterState.getTranslation])
  public static getTranslationIfInBookOrDefault(state: BooksStateModel, book: Book, language: string, translation: string): string {
    const verseTranslations = getVerseTranslations(book);
    if (verseTranslations) {
        // Return selected translation if it exists on the verse
        if (translation && verseTranslations.some(x => x.id === translation)) {
          return translation;
        }
        // Otherwise return default based on language
        const defaultVerseTranslationIds = getDefaultVerseTranslationIds(book);
        if (defaultVerseTranslationIds && defaultVerseTranslationIds[language]) {
          return defaultVerseTranslationIds[language];
        }
        // Otherwise return the first one that matches the language
        const translationMatchingLanguage = verseTranslations.find(x => x.lang === language);
        if (translationMatchingLanguage) {
          return translationMatchingLanguage.id;
        }
        // Otherwise just return the first in the list
        return verseTranslations[0].id;
    }
    return undefined;
  }

  @Selector([BooksState, BooksState.getCurrentNavigatedPart])
  public static getBookTranslations(state: BooksStateModel, book: Book): Translation[] {
    const verseTranslations = getVerseTranslations(book);
    if (verseTranslations) {
      return verseTranslations;
    }
    return [];
  }

  @Selector([BooksState, BooksState.getCurrentNavigatedPart])
  public static getBookNavigation(state: BooksStateModel, book: Book): Navigation {
    const chapter = getChapter(book);
    if (chapter && chapter.nav) {
      return chapter.nav;
    }
    return undefined;
  }

  @Selector([BooksState, BooksState.getTranslationIfInBookOrDefault])
  public static getTranslationClass(state: BooksStateModel, translation: string): string {
    if (!translation) { return undefined; }

    const lang = translation.substring(0, translation.indexOf('.')).toLowerCase();

    return lang + 'Text';
  }

  @Action(LoadBookPart)
  public loadPart(ctx: StateContext<BooksStateModel>, action: LoadBookPart) {
    return this.booksService.getPart(action.payload).pipe(
      tap(loadedPart => {
        const state = ctx.getState();
        return ctx.patchState({
          parts: {
            ...state.parts,
            [loadedPart.index]: loadedPart
          }});
      }));
  }

}
