import { Injectable } from '@angular/core';
import { RouterNavigation } from '@ngxs/router-plugin';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { BookPartIndexChanged, SortChanged } from './router.actions';
import { LoadIndex } from '@store/index/index.actions';

export interface RouterStateModel {
  index: string;
  fragment: string;
  sort: string;
  translation: string;
  language: string;
}

/*
map to router state
filter: key in queryParam && queryParam[key] !== stateValue
concatMap(nextAction)

nextAction returns Observable<Action>

*/

@State<RouterStateModel>({
  name: 'myrouter',
  defaults: {
    index: undefined,
    fragment: undefined,
    sort: undefined,
    translation: undefined,
    language: 'en',
  }
})
@Injectable()
export class RouterState {

  @Selector()
  public static getBookPartIndex(state: RouterStateModel) {
    return state.index;
  }

  @Selector()
  public static getUrlFragment(state: RouterStateModel) {
    return state.fragment;
  }

  @Selector()
  public static getTranslation(state: RouterStateModel) {
    return state.translation;
  }

  @Selector()
  public static getLanguage(state: RouterStateModel) {
    return state.language || 'en';
  }

  @Action(RouterNavigation)
  fragmentChanged(context: StateContext<RouterStateModel>, action: RouterNavigation) {
    const routerValue = action.routerState.root.fragment;
    const storeValue = context.getState().fragment;
    if (routerValue !== storeValue) {
      // console.log('Fragment changed to=', routerValue, action);
      context.patchState({fragment: routerValue});
    }
  }

  @Action(RouterNavigation)
  bookPartIndexChanged(context: StateContext<RouterStateModel>, action: RouterNavigation) {
    const routerIndex = action.routerState.root.firstChild.paramMap.get('index');
    const storeIndex = context.getState().index;
    if (routerIndex !== storeIndex) {
      context.patchState({index: routerIndex});
      context.dispatch(new BookPartIndexChanged(routerIndex));
    }
  }

  @Action(RouterNavigation)
  languageChanged(context: StateContext<RouterStateModel>, action: RouterNavigation) {
    const routerLanguage = action.routerState.root.queryParamMap.get('lang');
    const storeLanguage = context.getState().language;
    if (routerLanguage && routerLanguage.toLowerCase() !== storeLanguage) {
      context.patchState({language: routerLanguage.toLowerCase()});
      context.dispatch(new LoadIndex(routerLanguage.toLowerCase()));
    }
  }

  @Action(RouterNavigation)
  sortChanged(context: StateContext<RouterStateModel>, action: RouterNavigation) {
    const routerIndex = action.routerState.root.queryParamMap.get('sort');
    const storeIndex = context.getState().sort;
    if (routerIndex !== storeIndex) {
      context.patchState({sort: routerIndex});
      context.dispatch(new SortChanged(routerIndex));
    }
  }

  @Action(RouterNavigation)
  translationChanged(context: StateContext<RouterStateModel>, action: RouterNavigation) {
    const routerIndex = action.routerState.root.queryParamMap.get('translation');
    const storeIndex = context.getState().translation;
    if (routerIndex !== storeIndex) {
      context.patchState({translation: routerIndex});
    }
  }
}
