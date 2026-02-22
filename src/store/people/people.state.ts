import { Injectable } from '@angular/core';
import { Narrator, NarratorMetadata, NarratorWrapper } from '@app/models';
import { PeopleService } from '@app/services';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { RouterState } from '@store/router/router.state';
import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { LoadNarrator, RetryLoadNarrator } from './people.actions';

export interface PeopleStateModel {
  narrators: { [index: string]: NarratorWrapper };
  loading: { [index: string]: boolean };
  errors: { [index: string]: string };
}

@State<PeopleStateModel>({
  name: 'people',
  defaults: {
    narrators: {},
    loading: {},
    errors: {}
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
  public static getLoading(state: PeopleStateModel) {
    return state.loading;
  }

  @Selector([PeopleState])
  public static getErrors(state: PeopleStateModel) {
    return state.errors;
  }

  @Selector([PeopleState, RouterState.getBookPartIndex])
  public static getCurrentLoading(state: PeopleStateModel, routerIndex: string): boolean {
    const index = routerIndex || 'people';
    return !!state.loading[index];
  }

  @Selector([PeopleState, RouterState.getBookPartIndex])
  public static getCurrentError(state: PeopleStateModel, routerIndex: string): string {
    const index = routerIndex || 'people';
    return state.errors[index] || undefined;
  }

  @Selector([PeopleState])
  public static getNarratorByIndex(state: PeopleStateModel) {
    return (index: string) => {
      if (!state?.narrators) {
        return undefined;
      }

      return state.narrators[index];
    };
  }

  @Selector([PeopleState, PeopleState.getNarratorByIndex])
  public static getNarratorIndex(state: PeopleStateModel, narratorByIndex: ((index: string) => NarratorWrapper)) {
    if (!narratorByIndex) { return undefined; }
    const wrapper = narratorByIndex('people');
    return wrapper ? wrapper.data : undefined;
  }

  @Selector([PeopleState, PeopleState.getNarratorIndex])
  public static getEnrichedNarratorIndex(state: PeopleStateModel, narratorIndex: Record<number, NarratorMetadata>) {
    if (!narratorIndex) { return {}; }
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
    if (!narratorIndex) { return []; }
    return Object.values(narratorIndex);
  }

  @Selector([PeopleState, PeopleState.getNarratorByIndex, RouterState.getBookPartIndex])
  public static getCurrentNavigatedNarrator(state: PeopleStateModel, narratorByIndex: ((index: string) => NarratorWrapper),
                                            routerIndex: string): Narrator {
    if (!narratorByIndex) { return undefined; }
    const index = routerIndex ?  routerIndex : 'people';

    const narrator = narratorByIndex(index);
    return <Narrator> (narrator ? narrator.data : undefined);
  }

  @Action(LoadNarrator)
  public loadNarrator(ctx: StateContext<PeopleStateModel>, action: LoadNarrator) {
    const state = ctx.getState();

    // Skip if already loaded
    if (state.narrators[action.payload]) {
      return;
    }

    ctx.patchState({
      loading: { ...state.loading, [action.payload]: true },
      errors: { ...state.errors, [action.payload]: undefined }
    });

    return this.peopleService.getNarrator(action.payload).pipe(
      tap(loaded => {
        const s = ctx.getState();
        ctx.patchState({
          narrators: { ...s.narrators, [loaded.index]: loaded },
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

  @Action(RetryLoadNarrator)
  public retryLoadNarrator(ctx: StateContext<PeopleStateModel>, action: RetryLoadNarrator) {
    const state = ctx.getState();
    const narrators = { ...state.narrators };
    delete narrators[action.payload];
    ctx.patchState({
      narrators,
      errors: { ...state.errors, [action.payload]: undefined }
    });
    return ctx.dispatch(new LoadNarrator(action.payload));
  }

}
