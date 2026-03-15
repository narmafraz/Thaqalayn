import { Injectable } from '@angular/core';
import { Book, ChapterList, Crumb, getChapter, getDefaultVerseTranslationIds, getVerseTranslations, Navigation, Translation } from '@app/models';
import { BooksService } from '@app/services';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { IndexedTitles, IndexState } from '@store/index/index.state';
import { RouterState } from '@store/router/router.state';
import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { LoadBookPart, RetryLoadBookPart } from './books.actions';

export interface BooksStateModel {
  titles: ChapterList[];
  parts: { [index: string]: Book };
  loading: { [index: string]: boolean };
  errors: { [index: string]: string };
}

@State<BooksStateModel>({
  name: 'books',
  defaults: {
    titles: [],
    parts: {},
    loading: {},
    errors: {}
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
  public static getLoading(state: BooksStateModel) {
    return state.loading;
  }

  @Selector([BooksState])
  public static getErrors(state: BooksStateModel) {
    return state.errors;
  }

  @Selector([BooksState, RouterState.getBookPartIndex])
  public static getCurrentLoading(state: BooksStateModel, routerIndex: string): boolean {
    const index = routerIndex || 'books';
    return !!state?.loading?.[index];
  }

  @Selector([BooksState, RouterState.getBookPartIndex])
  public static getCurrentError(state: BooksStateModel, routerIndex: string): string {
    const index = routerIndex || 'books';
    return state?.errors?.[index] || undefined;
  }

  @Selector([BooksState])
  public static getPartByIndex(state: BooksStateModel) {
    return (index: string) => {
      if (!state?.parts) {
        return undefined;
      }

      return state.parts[index];
    };
  }

  @Selector([BooksState, BooksState.getPartByIndex, RouterState.getBookPartIndex])
  public static getCurrentNavigatedPart(state: BooksStateModel, partByIndex: ((index: string) => Book),
                                        routerIndex: string) {
    const index = routerIndex ? routerIndex : 'books';
    if (!partByIndex) { return undefined; }
    return partByIndex(index);
  }

  @Selector([BooksState, BooksState.getCurrentNavigatedPart, RouterState.getLanguage, RouterState.getTranslation])
  public static getTranslationIfInBookOrDefault(state: BooksStateModel, book: Book, language: string, translation: string): string {
    const verseTranslations = getVerseTranslations(book);
    if (verseTranslations) {
        // Return selected translation if it exists on the verse
        if (translation && verseTranslations.some(x => x === translation)) {
          return translation;
        }
        // Otherwise return default based on language
        const defaultVerseTranslationIds = getDefaultVerseTranslationIds(book);
        if (defaultVerseTranslationIds && defaultVerseTranslationIds[language]) {
          return defaultVerseTranslationIds[language];
        }
        // Otherwise prefer AI translation for the language, then fall back to any match
        const matchingTranslations = verseTranslations.filter(x => x.split('.')[0] === language);
        if (matchingTranslations.length > 0) {
          const aiMatch = matchingTranslations.find(x => x.endsWith('.ai'));
          return aiMatch || matchingTranslations[0];
        }
        // Otherwise just return the first in the list
        return verseTranslations[0];
    }
    return undefined;
  }

  @Selector([BooksState, BooksState.getCurrentNavigatedPart, IndexState.getTranslations])
  public static getBookTranslations(state: BooksStateModel, book: Book, translations: Record<string, Translation>): Translation[] {
    const verseTranslations = getVerseTranslations(book);
    if (verseTranslations) {
      return verseTranslations.map(id => translations[id] || { id, lang: id.split('.')[0], name: id });
    }
    return [];
  }

  @Selector([BooksState, BooksState.getCurrentNavigatedPart])
  public static getBookNavigation(state: BooksStateModel, book: Book): Navigation {
    const chapter = getChapter(book);
    if (chapter && chapter.nav) {
      return chapter.nav;
    }
    if (book && book.kind === 'verse_detail' && book.data.nav) {
      return book.data.nav;
    }
    return undefined;
  }

  @Selector([BooksState, BooksState.getTranslationIfInBookOrDefault])
  public static getTranslationClass(state: BooksStateModel, translation: string): string {
    if (!translation) { return undefined; }

    const lang = translation.substring(0, translation.indexOf('.')).toLowerCase();

    return lang + 'Text';
  }

  @Selector([BooksState, BooksState.getCurrentNavigatedPart, RouterState.getTranslation2])
  public static getSecondTranslation(state: BooksStateModel, book: Book, translation2: string): string {
    if (!translation2) return undefined;
    const verseTranslations = getVerseTranslations(book);
    if (verseTranslations && verseTranslations.some(x => x === translation2)) {
      return translation2;
    }
    return undefined;
  }

  @Selector([BooksState, BooksState.getSecondTranslation])
  public static getSecondTranslationClass(state: BooksStateModel, translation2: string): string {
    if (!translation2) { return undefined; }
    const lang = translation2.substring(0, translation2.indexOf('.')).toLowerCase();
    return lang + 'Text';
  }

  @Selector([BooksState, BooksState.getCurrentNavigatedPart, RouterState.getLanguage, IndexState.getBookForLanguage])
  public static getCurrentNavigatedCrumbs(state: BooksStateModel, currentPart: Book, language: string, getBookForLanguage: (lang: string) => IndexedTitles): Crumb[] {
    if (!currentPart) return [];
    const chapter = getChapter(currentPart);
    let path: string;
    if (chapter) {
      path = chapter.path;
    } else if (currentPart.kind === 'verse_detail' && currentPart.data.chapter_path) {
      path = currentPart.data.chapter_path;
    } else {
      return [];
    }
    const crumbs = [];
    const arIndex = getBookForLanguage('ar');
    const enIndex = getBookForLanguage('en');
    const langIndex = getBookForLanguage(language);
    while (path) {
      const arEntry = arIndex ? arIndex[path] : undefined;
      const enEntry = enIndex ? enIndex[path] : undefined;
      const langEntry = langIndex ? langIndex[path] : undefined;
      if (!arEntry && !enEntry && !langEntry) {
        break;
      }

      const indexed_titles: Record<string, string> = {};
      indexed_titles['ar'] = arEntry ? ((arEntry.part_type ?? '') + ' ' + (arEntry.local_index ?? '')) : '';
      indexed_titles['en'] = enEntry ? ((enEntry.part_type ?? '') + ' ' + (enEntry.local_index ?? '')) : '';
      if (language !== 'ar' && language !== 'en') {
        indexed_titles[language] = langEntry ? ((langEntry.part_type ?? '') + ' ' + (langEntry.local_index ?? '')) : (indexed_titles['en'] || '');
      }

      const titles: Record<string, string> = {};
      titles['ar'] = arEntry ? arEntry.title : '';
      titles['en'] = enEntry ? enEntry.title : '';
      if (language !== 'ar' && language !== 'en') {
        titles[language] = langEntry ? langEntry.title : (titles['en'] || '');
      }

      crumbs.unshift({
        path: path,
        indexed_titles: indexed_titles,
        titles: titles
      });
      const lastColon = path.lastIndexOf(':');
      if (lastColon === -1) {
        break;
      }
      path = path.substring(0, lastColon);
    }

    // For verse_detail, append a crumb for the current verse
    if (currentPart.kind === 'verse_detail' && currentPart.data.verse) {
      const v = currentPart.data.verse;
      const verseLabel = (v.part_type || 'Hadith') + ' ' + v.local_index;
      crumbs.push({
        path: '/books/' + currentPart.index,
        indexed_titles: { ar: verseLabel, en: verseLabel },
        titles: { ar: verseLabel, en: verseLabel }
      });
    }

    return crumbs;
  }

  @Action(LoadBookPart)
  public loadPart(ctx: StateContext<BooksStateModel>, action: LoadBookPart) {
    const state = ctx.getState();

    // Skip if already loaded
    if (state.parts[action.payload]) {
      return;
    }

    ctx.patchState({
      loading: { ...state.loading, [action.payload]: true },
      errors: { ...state.errors, [action.payload]: undefined }
    });

    return this.booksService.getPart(action.payload).pipe(
      tap(loadedPart => {
        const s = ctx.getState();
        ctx.patchState({
          parts: { ...s.parts, [loadedPart.index]: loadedPart },
          loading: { ...s.loading, [action.payload]: false }
        });
      }),
      catchError(error => {
        const s = ctx.getState();
        const message = error.status === 0
          ? 'Network error — unable to reach the server'
          : error.status === 404
            ? 'Content not found'
            : `Failed to load content (${error.status})`;
        ctx.patchState({
          loading: { ...s.loading, [action.payload]: false },
          errors: { ...s.errors, [action.payload]: message }
        });
        return of(null);
      })
    );
  }

  @Action(RetryLoadBookPart)
  public retryLoadPart(ctx: StateContext<BooksStateModel>, action: RetryLoadBookPart) {
    const state = ctx.getState();
    // Clear cached data and error so a fresh load occurs
    const parts = { ...state.parts };
    delete parts[action.payload];
    ctx.patchState({
      parts,
      errors: { ...state.errors, [action.payload]: undefined }
    });
    return ctx.dispatch(new LoadBookPart(action.payload));
  }

}
