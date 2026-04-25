import { ScrollingModule } from '@angular/cdk/scrolling';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule, isDevMode } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MAT_TOOLTIP_DEFAULT_OPTIONS, MatTooltipDefaultOptions, MatTooltipModule } from '@angular/material/tooltip';

const tooltipDefaults: MatTooltipDefaultOptions = {
  showDelay: 300,
  hideDelay: 0,
  touchendHideDelay: 1500,
};
import { BrowserModule, provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from '@app/routing/app-routing.module';
import { NgxsStoreModule } from '@store/store.module';
import { SharedModule } from './shared/shared.module';
import { AppComponent } from './app.component';
import { BreadcrumbsComponent } from './components/breadcrumbs/breadcrumbs.component';
import { BookDispatcherComponent } from './components/book-dispatcher/book-dispatcher.component';
import { ChapterContentComponent } from './components/chapter-content/chapter-content.component';
import { ChapterListComponent } from './components/chapter-list/chapter-list.component';
import { VerseContentComponent } from './components/verse-content/verse-content.component';
import { VerseDetailComponent } from './components/verse-detail/verse-detail.component';
import { BookTreeComponent } from './components/book-tree/book-tree.component';
import { TranslationSelectionComponent } from './components/translation-selection/translation-selection.component';
import { SettingsComponent } from './components/settings/settings.component';
import { InstallPromptComponent } from './components/install-prompt/install-prompt.component';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { EmbedVerseComponent } from './components/embed-verse/embed-verse.component';
import { DiffViewerComponent } from './components/diff-viewer/diff-viewer.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { ErrorInterceptor } from './services/error.interceptor';
import { ServiceWorkerModule } from '@angular/service-worker';

@NgModule({
  declarations: [
    AppComponent,
    BreadcrumbsComponent,
    BookDispatcherComponent,
    ChapterListComponent,
    ChapterContentComponent,
    VerseContentComponent,
    VerseDetailComponent,
    BookTreeComponent,
    TranslationSelectionComponent,
    SettingsComponent,
    InstallPromptComponent,
    SearchBarComponent,
    EmbedVerseComponent,
    DiffViewerComponent,
    NotFoundComponent,
  ],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgxsStoreModule,
    BrowserAnimationsModule,
    SharedModule,
    MatTableModule,
    MatSortModule,
    MatCardModule,
    MatSelectModule,
    FormsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatButtonToggleModule,
    MatProgressBarModule,
    ScrollingModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [
    { provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: tooltipDefaults },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    provideHttpClient(withInterceptorsFromDi()),
    provideClientHydration(withEventReplay())
  ]
})
export class AppModule { }
