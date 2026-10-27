import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { phoneRequiredGuard } from './auth/phone-required.guard';

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
    path: 'dev/tema',
    loadComponent: () =>
      import('./features/dev/tema-preview.component').then((m) => m.TemaPreviewComponent),
  },
  {
    path: 'inicio',
    canActivate: [authGuard, phoneRequiredGuard],
    loadComponent: () =>
      import('./features/inicio/inicio.component').then((m) => m.InicioComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: '**', redirectTo: 'inicio' },
];
