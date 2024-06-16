import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatSortModule } from '@angular/material/sort';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from '@app/routing/app-routing.module';
import { NgxsStoreModule } from '@store/store.module';
import { AppComponent } from './app.component';
import { AboutComponent } from './components/about/about.component';
import { BookDispatcherComponent } from './components/book-dispatcher/book-dispatcher.component';
import { BookTitlesComponent } from './components/book-titles/book-titles.component';
import { BreadcrumbsComponent } from './components/breadcrumbs/breadcrumbs.component';
import { ChapterContentComponent } from './components/chapter-content/chapter-content.component';
import { ChapterListComponent } from './components/chapter-list/chapter-list.component';
import { DownloadComponent } from './components/download/download.component';
import { PathLinkComponent } from './components/path-link/path-link.component';
import { PeopleContentComponent } from './components/people-content/people-content.component';
import { PeopleListComponent } from './components/people-list/people-list.component';
import { SettingsComponent } from './components/settings/settings.component';
import { SupportComponent } from './components/support/support.component';
import { TranslationSelectionComponent } from './components/translation-selection/translation-selection.component';
import { VerseContentComponent } from './components/verse-content/verse-content.component';
import { VerseTextComponent } from './components/verse-text/verse-text.component';
import { ExpandLanguagePipe } from './pipes/expand-language.pipe';

@NgModule({
  declarations: [
    AppComponent,
    BookDispatcherComponent,
    ChapterListComponent,
    AboutComponent,
    ChapterContentComponent,
    BookTitlesComponent,
    BreadcrumbsComponent,
    VerseContentComponent,
    ExpandLanguagePipe,
    VerseTextComponent,
    TranslationSelectionComponent,
    SupportComponent,
    DownloadComponent,
    SettingsComponent,
    PeopleListComponent,
    PeopleContentComponent,
    PathLinkComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    NgxsStoreModule,
    BrowserAnimationsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatButtonModule,
    FormsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
