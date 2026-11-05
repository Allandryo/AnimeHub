import { Routes } from '@angular/router';
import { CatalogComponent } from './features/catalog/catalog.component';
import { DetailsComponent } from './features/details/details.component';
import { MyListComponent } from './features/my-list/my-list.component';

export const routes: Routes = [
  { path: '', component: CatalogComponent },
  { path: 'anime/:id', component: DetailsComponent },
  { path: 'my-list', component: MyListComponent },
  { path: '**', redirectTo: '' }
];