import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MatCardModule } from '@angular/material/card';

import { SharedModule } from '../../shared/shared.module';
import { AboutComponent } from '../../components/about/about.component';
import { SupportComponent } from '../../components/support/support.component';
import { DownloadComponent } from '../../components/download/download.component';
import { BookmarksComponent } from '../../components/bookmarks/bookmarks.component';
import { SearchResultsComponent } from '../../components/search-results/search-results.component';

const routes: Routes = [
  { path: 'about', component: AboutComponent },
  { path: 'support', component: SupportComponent },
  { path: 'download', component: DownloadComponent },
  { path: 'bookmarks', component: BookmarksComponent },
  { path: 'search', component: SearchResultsComponent },
];

@NgModule({
  declarations: [
    AboutComponent,
    SupportComponent,
    DownloadComponent,
    BookmarksComponent,
    SearchResultsComponent,
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    MatCardModule,
  ],
})
export class StaticPagesModule {}
