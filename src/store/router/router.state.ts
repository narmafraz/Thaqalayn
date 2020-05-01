import { RouterNavigation } from '@ngxs/router-plugin';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { BookPartIndexChanged, SortChanged } from './router.actions';

export interface RouterStateModel {
  index: string;
  sort: string;
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
    sort: undefined
  }
})
export class RouterState {

  @Selector()
  public static getBookPartIndex(state: RouterStateModel) {
    return state.index;
  }

  @Action(RouterNavigation)
  changeRoute(context: StateContext<RouterStateModel>, action: RouterNavigation) {
    console.log('MyRouterState.RouterNavigation=', action);
  }

  @Action(RouterNavigation)
  bookPartIndexChanged(context: StateContext<RouterStateModel>, action: RouterNavigation) {
    const routerIndex = action.routerState.root.firstChild.paramMap.get('index');
    const storeIndex = context.getState().index;
    if(routerIndex !== storeIndex) {
      context.patchState({index: routerIndex});
      context.dispatch(new BookPartIndexChanged(routerIndex));
    }
  }

  @Action(RouterNavigation)
  sortChanged(context: StateContext<RouterStateModel>, action: RouterNavigation) {
    const routerIndex = action.routerState.root.queryParamMap.get('sort');
    const storeIndex = context.getState().sort;
    if(routerIndex !== storeIndex) {
      context.patchState({sort: routerIndex});
      context.dispatch(new SortChanged(routerIndex));
    }
  }
}
