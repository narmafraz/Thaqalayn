import { Injectable } from '@angular/core';
import { Book, ChapterList, getChapter, getDefaultVerseTranslationIds, getVerseTranslations, NarratorWrapper, Navigation, Translation } from '@app/models';
import { BooksService } from '@app/services';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { RouterState } from '@store/router/router.state';
import { tap } from 'rxjs/operators';
import { BooksAction, LoadBookPart, LoadNarrator } from './books.actions';

export interface BooksStateModel {
  titles: ChapterList[];
  parts: { [index: string]: Book };
  narrators: { [index: string]: NarratorWrapper };
}

@State<BooksStateModel>({
  name: 'books',
  defaults: {
    titles: [],
    parts: {},
    narrators: {}
  }
})
@Injectable()
export class BooksState {
  constructor(private booksService: BooksService) {}

  @Selector()
  public static getState(state: BooksStateModel) {
    return state;
  }

  @Selector()
  public static getTitles(state: BooksStateModel) {
    return state.titles;
  }

  @Selector()
  public static getParts(state: BooksStateModel) {
    return state.parts;
  }

  @Selector()
  public static getPartByIndex(state: BooksStateModel) {
    return (index: string) => {
      if (!state.parts) {
        return undefined;
      }

      return state.parts[index];
    };
  }

  @Selector()
  public static getNarratorByIndex(state: BooksStateModel) {
    return (index: string) => {
      if (!state.narrators) {
        return undefined;
      }

      return state.narrators[index];
    };
  }

  @Selector([BooksState.getPartByIndex, RouterState.getBookPartIndex])
  public static getCurrentNavigatedPart(state: BooksStateModel, partByIndex: ((index: string) => Book),
                                        routerIndex: string) {
    const index = routerIndex ?  routerIndex : 'books';
    return partByIndex(index);
  }

  @Selector([BooksState.getNarratorByIndex])
  public static getNarratorIndex(state: BooksStateModel, narratorByIndex: ((index: string) => NarratorWrapper)) {
    return narratorByIndex('people').data;
  }

  @Selector([BooksState.getNarratorByIndex, RouterState.getBookPartIndex])
  public static getCurrentNavigatedNarrator(state: BooksStateModel, narratorByIndex: ((index: string) => NarratorWrapper),
                                        routerIndex: string) {
    const index = routerIndex ?  routerIndex : 'people';
    return narratorByIndex(index).data;
  }

  @Selector([BooksState.getCurrentNavigatedPart, RouterState.getLanguage, RouterState.getTranslation])
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

  @Selector([BooksState.getCurrentNavigatedPart])
  public static getBookTranslations(state: BooksStateModel, book: Book): Translation[] {
    const verseTranslations = getVerseTranslations(book);
    if (verseTranslations) {
      return verseTranslations;
    }
    return [];
  }

  @Selector([BooksState.getCurrentNavigatedPart])
  public static getBookNavigation(state: BooksStateModel, book: Book): Navigation {
    const chapter = getChapter(book);
    if (chapter && chapter.nav) {
      return chapter.nav;
    }
    return undefined;
  }

  @Selector([BooksState.getTranslationIfInBookOrDefault])
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

  @Action(LoadNarrator)
  public loadNarrator(ctx: StateContext<BooksStateModel>, action: LoadNarrator) {
    return this.booksService.getNarrator(action.payload).pipe(
      tap(loaded => {
        const state = ctx.getState();
        return ctx.patchState({
          narrators: {
            ...state.narrators,
            [loaded.index]: loaded
          }});
      }));
  }

  @Action(BooksAction)
  public add(ctx: StateContext<BooksStateModel>, { payload }: BooksAction) {
    // const stateModel = ctx.getState();
    // stateModel.items = [...stateModel.items, payload];
    // ctx.setState(stateModel);
  }
}
