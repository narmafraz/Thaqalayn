import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { BookDispatcherComponent } from '@app/components/book-dispatcher/book-dispatcher.component';
import { EmbedVerseComponent } from '@app/components/embed-verse/embed-verse.component';
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
