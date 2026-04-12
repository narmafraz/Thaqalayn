import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe } from '../pipes/translate.pipe';
import { ExpandLanguagePipe } from '../pipes/expand-language.pipe';
import { PathLinkComponent } from '../components/path-link/path-link.component';
import { ErrorDisplayComponent } from '../components/error-display/error-display.component';
import { BookTitlesComponent } from '../components/book-titles/book-titles.component';
import { VerseTextComponent } from '../components/verse-text/verse-text.component';
import { SkeletonLoaderComponent } from '../components/skeleton-loader/skeleton-loader.component';
import { NarratorHoverCardComponent } from '../components/narrator-hover-card/narrator-hover-card.component';
import { VerseActionsComponent } from '../components/verse-actions/verse-actions.component';

@NgModule({
  declarations: [
    TranslatePipe,
    ExpandLanguagePipe,
    PathLinkComponent,
    ErrorDisplayComponent,
    BookTitlesComponent,
    VerseTextComponent,
    SkeletonLoaderComponent,
    NarratorHoverCardComponent,
    VerseActionsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  exports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatTooltipModule,
    TranslatePipe,
    ExpandLanguagePipe,
    PathLinkComponent,
    ErrorDisplayComponent,
    BookTitlesComponent,
    VerseTextComponent,
    SkeletonLoaderComponent,
    NarratorHoverCardComponent,
    VerseActionsComponent,
  ],
})
export class SharedModule {}
