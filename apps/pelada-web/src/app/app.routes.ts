import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: 'entrar',
    loadComponent: () =>
      import('./features/entrar/entrar.component').then((m) => m.EntrarComponent),
  },
  {
    path: 'entrar/completar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/entrar/completar/completar.component').then(
        (m) => m.CompletarComponent,
      ),
  },
  {
    path: 'inicio',
    loadComponent: () =>
      import('./features/inicio/inicio.component').then((m) => m.InicioComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: '**', redirectTo: 'inicio' },
];
