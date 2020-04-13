import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BookDispatcherComponent } from '@app/components/book-dispatcher/book-dispatcher.component';
import { BookTitlesComponent } from '@app/components/book-titles/book-titles.component';
import { BookPartResolver } from './book-part-resolver';
import { BookTitlesResolver } from './book-titles-resolver';


const routes: Routes = [
  { path: '', redirectTo: 'books', pathMatch: 'full' },
  { path: 'books', component: BookTitlesComponent, resolve: { titles: BookTitlesResolver } },
  { path: 'books/:index', component: BookDispatcherComponent, resolve: { titles: BookPartResolver } },
  // { path: 'about', component: AboutComponent },
  // { path: 'contact', component: ContactComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true})],
  exports: [RouterModule],
  providers: [
    BookTitlesResolver,
    BookPartResolver
  ]
})
export class AppRoutingModule { }
