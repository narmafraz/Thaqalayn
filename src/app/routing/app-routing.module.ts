import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { AboutComponent } from '@app/components/about/about.component';
import { BookDispatcherComponent } from '@app/components/book-dispatcher/book-dispatcher.component';
import { DownloadComponent } from '@app/components/download/download.component';
import { SupportComponent } from '@app/components/support/support.component';
import { BookPartResolver } from './book-part-resolver';
import { BookTitlesResolver } from './book-titles-resolver';


const routes: Routes = [
  { path: '', redirectTo: '/books?lang=en', pathMatch: 'full' },
  { path: 'books', component: BookDispatcherComponent, resolve: { titles: BookTitlesResolver } },
  { path: 'books/:index', component: BookDispatcherComponent, resolve: { titles: BookPartResolver } },
  { path: 'about', component: AboutComponent },
  { path: 'support', component: SupportComponent },
  { path: 'download', component: DownloadComponent },
  // { path: 'contact', component: ContactComponent },
];

const routerConfig: ExtraOptions = {
  useHash: true,
  scrollPositionRestoration: 'enabled',
  anchorScrolling: 'enabled',
  onSameUrlNavigation: 'reload',
};

@NgModule({
  imports: [RouterModule.forRoot(routes, routerConfig)],
  exports: [RouterModule],
  providers: [
    BookTitlesResolver,
    BookPartResolver
  ]
})
export class AppRoutingModule { }
