import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { phoneRequiredGuard } from './auth/phone-required.guard';
import { peladaOnboardingGuard } from './core/pelada/pelada-onboarding.guard';
import { MainShellComponent } from './shell/main-shell.component';

const placeholder = () =>
  import('./features/shared/tab-placeholder.component').then((m) => m.TabPlaceholderComponent);

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
    path: 'dev/componentes',
    loadComponent: () =>
      import('./features/dev/componentes-preview.component').then(
        (m) => m.ComponentesPreviewComponent,
      ),
  },
  {
    path: 'dev/tema',
    loadComponent: () =>
      import('./features/dev/tema-preview.component').then((m) => m.TemaPreviewComponent),
  },
  {
    path: 'dev/mobile-ux',
    loadComponent: () =>
      import('./features/dev/mobile-ux-preview.component').then(
        (m) => m.MobileUxPreviewComponent,
      ),
  },
  {
    path: 'dev/criar-pelada',
    loadComponent: () =>
      import('./features/onboarding/criar-pelada.component').then(
        (m) => m.CriarPeladaComponent,
      ),
  },
  {
    path: 'onboarding/pelada',
    canActivate: [authGuard, phoneRequiredGuard],
    loadComponent: () =>
      import('./features/onboarding/criar-pelada.component').then(
        (m) => m.CriarPeladaComponent,
      ),
  },
  {
    path: '',
    component: MainShellComponent,
    canActivate: [authGuard, phoneRequiredGuard, peladaOnboardingGuard],
    children: [
      {
        path: 'inicio',
        loadComponent: () =>
          import('./features/inicio/inicio.component').then((m) => m.InicioComponent),
      },
      {
        path: 'inicio/regras',
        loadComponent: () =>
          import('./features/inicio/regras-pelada.component').then(
            (m) => m.RegrasPeladaComponent,
          ),
      },
      {
        path: 'inicio/criar-partida',
        loadComponent: placeholder,
        data: { title: 'Criar partida', eyebrow: 'Início' },
      },
      { path: 'partida', redirectTo: 'partida/presenca', pathMatch: 'full' },
      {
        path: 'partida/presenca',
        loadComponent: placeholder,
        data: { title: 'Presença', eyebrow: 'Partida' },
      },
      {
        path: 'partida/sorteio',
        loadComponent: placeholder,
        data: { title: 'Sorteio', eyebrow: 'Partida' },
      },
      {
        path: 'partida/campo',
        loadComponent: placeholder,
        data: { title: 'Em campo', eyebrow: 'Partida' },
      },
      {
        path: 'jogadores',
        loadComponent: placeholder,
        data: { title: 'Jogadores', eyebrow: 'Elenco' },
      },
      {
        path: 'caixa',
        loadComponent: placeholder,
        data: { title: 'Caixa', eyebrow: 'Pagamentos' },
      },
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
