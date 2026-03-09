import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SharedModule } from '../../shared/shared.module';
import { PeopleListComponent } from '../../components/people-list/people-list.component';
import { PeopleContentComponent } from '../../components/people-content/people-content.component';
import { NarratorListResolver } from '../../routing/narrator-list-resolver';
import { NarratorResolver } from '../../routing/narrator-resolver';

const routes: Routes = [
  { path: '', redirectTo: 'narrators/index', pathMatch: 'full' },
  { path: 'narrators', redirectTo: 'narrators/index', pathMatch: 'full' },
  { path: 'narrators/index', component: PeopleListComponent, resolve: { titles: NarratorListResolver } },
  { path: 'narrators/:index', component: PeopleContentComponent, resolve: { titles: NarratorResolver } },
];

@NgModule({
  declarations: [
    PeopleListComponent,
    PeopleContentComponent,
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
  ],
  providers: [
    NarratorListResolver,
    NarratorResolver,
  ],
})
export class PeopleModule {}
