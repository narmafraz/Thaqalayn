import { State, Action, Selector, StateContext } from '@ngxs/store';
import { RouterParserAction } from './router-parser.actions';

export interface RouterParserStateModel {
  items: string[];
}

@State<RouterParserStateModel>({
  name: 'routerParser',
  defaults: {
    items: []
  }
})
export class RouterParserState {

  @Selector()
  public static getState(state: RouterParserStateModel) {
    return state;
  }

  @Action(RouterParserAction)
  public add(ctx: StateContext<RouterParserStateModel>, { payload }: RouterParserAction) {
    const stateModel = ctx.getState();
    stateModel.items = [...stateModel.items, payload];
    ctx.setState(stateModel);
  }
}
