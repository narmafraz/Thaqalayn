import { environment } from '@env/environment';
import { NgxsDevtoolsOptions } from '@ngxs/devtools-plugin/src/symbols';
import { NgxsLoggerPluginOptions } from '@ngxs/logger-plugin/src/symbols';
import { NgxsConfig } from '@ngxs/store/src/symbols';
import { AuthStateModule } from './auth/auth.state';
import { BooksState } from './books/books.state';
import { DashboardStateModule, DashboardStates } from './dashboard';
import { PeopleState } from './people/people.state';
import { RouterState } from './router/router.state';

export const STATES_MODULES = [RouterState, BooksState, PeopleState, AuthStateModule, DashboardStateModule, ...DashboardStates];

export const OPTIONS_CONFIG: Partial<NgxsConfig> = {
  /**
   * Run in development mode. This will add additional debugging features:
   * - Object.freeze on the state and actions to guarantee immutability
   * todo: you need set production mode
   * import { environment } from '@env';
   * developmentMode: !environment.production
   */
  developmentMode: !environment.production
};

export const DEVTOOLS_REDUX_CONFIG: NgxsDevtoolsOptions = {
  /**
   * Whether the dev tools is enabled or note. Useful for setting during production.
   * todo: you need set production mode
   * import { environment } from '@env';
   * disabled: environment.production
   */
  disabled: environment.production
};

export const LOGGER_CONFIG: NgxsLoggerPluginOptions = {
  /**
   * Disable the logger. Useful for prod mode..
   * todo: you need set production mode
   * import { environment } from '@env';
   * disabled: environment.production
   */
  disabled: environment.production
};
