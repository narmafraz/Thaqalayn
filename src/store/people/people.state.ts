import { Injectable } from '@angular/core';
import { NarratorMetadata, NarratorWrapper } from '@app/models';
import { PeopleService } from '@app/services';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { RouterState } from '@store/router/router.state';
import { tap } from 'rxjs/operators';
import { LoadNarrator } from './people.actions';

export interface PeopleStateModel {
  narrators: { [index: string]: NarratorWrapper };
}

@State<PeopleStateModel>({
  name: 'people',
  defaults: {
    narrators: {}
  }
})
@Injectable()
export class PeopleState {
  constructor(private peopleService: PeopleService) { }

  @Selector([PeopleState])
  public static getState(state: PeopleStateModel) {
    return state;
  }

  @Selector([PeopleState])
  public static getNarratorByIndex(state: PeopleStateModel) {
    return (index: string) => {
      if (!state.narrators) {
        return undefined;
      }

      return state.narrators[index];
    };
  }

  @Selector([PeopleState, PeopleState.getNarratorByIndex])
  public static getNarratorIndex(state: PeopleStateModel, narratorByIndex: ((index: string) => NarratorWrapper)) {
    return narratorByIndex('people').data;
  }

  @Selector([PeopleState, PeopleState.getNarratorIndex])
  public static getEnrichedNarratorIndex(state: PeopleStateModel, narratorIndex: Record<number, NarratorMetadata>) {
    const result = {};
    Object.entries(narratorIndex).forEach(([key, value]) => {
      result[key] = {...value,
        index: key,
        conarrators: value.narrated_from + value.narrated_to
      };
    });
    return result;
  }

  @Selector([PeopleState, PeopleState.getEnrichedNarratorIndex])
  public static getEnrichedNarratorsList(state: PeopleStateModel, narratorIndex: Record<number, NarratorMetadata>) {
    return Object.values(narratorIndex);
  }

  @Selector([PeopleState, PeopleState.getNarratorByIndex, RouterState.getBookPartIndex])
  public static getCurrentNavigatedNarrator(state: PeopleStateModel, narratorByIndex: ((index: string) => NarratorWrapper),
                                            routerIndex: string) {
    const index = routerIndex ?  routerIndex : 'people';
    return narratorByIndex(index).data;
  }

  @Action(LoadNarrator)
  public loadNarrator(ctx: StateContext<PeopleStateModel>, action: LoadNarrator) {
    return this.peopleService.getNarrator(action.payload).pipe(
      tap(loaded => {
        const state = ctx.getState();
        return ctx.patchState({
          narrators: {
            ...state.narrators,
            [loaded.index]: loaded
          }});
      }));
  }

}
