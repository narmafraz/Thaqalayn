import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { WordSurfaceComponent } from '../../components/word-surface/word-surface.component';
import { WordLemmaComponent } from '../../components/word-lemma/word-lemma.component';
import { WordRootComponent } from '../../components/word-root/word-root.component';

const routes: Routes = [
  { path: '', redirectTo: 'index', pathMatch: 'full' },
  { path: 'index', component: WordSurfaceComponent }, // placeholder until browse page lands
  { path: 'lemmas/:slug', component: WordLemmaComponent },
  { path: 'roots/:slug', component: WordRootComponent },
  // Catch-all for /words/:surface — must be last so 'lemmas' and 'roots' match first.
  { path: ':surface', component: WordSurfaceComponent },
];

@NgModule({
  declarations: [
    WordSurfaceComponent,
    WordLemmaComponent,
    WordRootComponent,
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
  ],
})
export class WordsModule {}
