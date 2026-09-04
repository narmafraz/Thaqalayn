import { environment } from '@env/environment';
import { NgxsDevtoolsOptions } from '@ngxs/devtools-plugin';
import { NgxsLoggerPluginOptions } from '@ngxs/logger-plugin';
import { NgxsConfig } from '@ngxs/store';
import { IndexState } from '@store/index/index.state';
import { BooksState } from './books/books.state';
import { PeopleState } from './people/people.state';
import { RouterState } from './router/router.state';
import { SearchState } from './search/search.state';
import { SettingsState } from './settings/settings.state';

// SettingsState first: its ngxsOnInit hydrates the saved UI settings
// (language / theme / font size) before any other state or service reads
// them, so nothing has to correct itself a tick later.
export const STATES_MODULES = [SettingsState, RouterState, BooksState, IndexState, PeopleState, SearchState];

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
