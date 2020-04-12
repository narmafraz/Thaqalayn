import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BookTitlesComponent } from './components/book-titles/book-titles.component';


const routes: Routes = [
  { path: '', redirectTo: 'books', pathMatch: 'full' },
  { path: 'books', component: BookTitlesComponent },
  // { path: 'about', component: AboutComponent },
  // { path: 'contact', component: ContactComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
