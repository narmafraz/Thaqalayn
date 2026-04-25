import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { BookDispatcherComponent } from '@app/components/book-dispatcher/book-dispatcher.component';
import { EmbedVerseComponent } from '@app/components/embed-verse/embed-verse.component';
import { NotFoundComponent } from '@app/components/not-found/not-found.component';
import { BookPartResolver } from './book-part-resolver';
import { BookTitlesResolver } from './book-titles-resolver';


const routes: Routes = [
  { path: '', redirectTo: '/books', pathMatch: 'full' },
  { path: 'embed/books/:index', component: EmbedVerseComponent, resolve: { titles: BookPartResolver } },
  { path: 'books', component: BookDispatcherComponent, resolve: { titles: BookTitlesResolver } },
  { path: 'books/:index', component: BookDispatcherComponent, resolve: { titles: BookPartResolver } },
  {
    path: 'people',
    loadChildren: () => import('../features/people/people.module').then(m => m.PeopleModule)
  },
  {
    path: '',
    loadChildren: () => import('../features/static-pages/static-pages.module').then(m => m.StaticPagesModule)
  },
  // Catch-all wildcard MUST be last. Renders the NotFoundComponent which
  // emits <meta name="robots" content="noindex"> so crawlers treat the page
  // as a soft-404 and don't index unknown paths as duplicates of the SPA shell.
  { path: '**', component: NotFoundComponent },
];

const routerConfig: ExtraOptions = {
    useHash: false,
    scrollPositionRestoration: 'enabled',
    anchorScrolling: 'enabled',
    onSameUrlNavigation: 'reload'
};

@NgModule({
  imports: [RouterModule.forRoot(routes, routerConfig)],
  exports: [RouterModule],
  providers: [
    BookTitlesResolver,
    BookPartResolver,
  ]
})
export class AppRoutingModule { }
