import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxsStoreModule } from '@store/store.module';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BookTitlesComponent } from './components/book-titles/book-titles.component';

@NgModule({
  declarations: [
    AppComponent,
    BookTitlesComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgxsStoreModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
