import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'entrar',
    loadComponent: () =>
      import('./features/entrar/entrar.component').then((m) => m.EntrarComponent),
  },
  {
    path: 'inicio',
    loadComponent: () =>
      import('./features/inicio/inicio.component').then((m) => m.InicioComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: '**', redirectTo: 'inicio' },
];
