import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from '@app/routing/app-routing.module';
import { NgxsStoreModule } from '@store/store.module';
import { AppComponent } from './app.component';
import { BookDispatcherComponent } from './components/book-dispatcher/book-dispatcher.component';
import { ChapterListComponent } from './components/chapter-list/chapter-list.component';

@NgModule({
  declarations: [
    AppComponent,
    BookDispatcherComponent,
    ChapterListComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    NgxsStoreModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
