import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
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
