import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';

import { TranslatePipe } from '../pipes/translate.pipe';
import { ExpandLanguagePipe } from '../pipes/expand-language.pipe';
import { PathLinkComponent } from '../components/path-link/path-link.component';
import { ErrorDisplayComponent } from '../components/error-display/error-display.component';
import { BookTitlesComponent } from '../components/book-titles/book-titles.component';
import { VerseTextComponent } from '../components/verse-text/verse-text.component';

@NgModule({
  declarations: [
    TranslatePipe,
    ExpandLanguagePipe,
    PathLinkComponent,
    ErrorDisplayComponent,
    BookTitlesComponent,
    VerseTextComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
  ],
  exports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    TranslatePipe,
    ExpandLanguagePipe,
    PathLinkComponent,
    ErrorDisplayComponent,
    BookTitlesComponent,
    VerseTextComponent,
  ],
})
export class SharedModule {}
