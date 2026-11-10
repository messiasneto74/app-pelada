import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { phoneRequiredGuard } from './auth/phone-required.guard';
import { peladaOnboardingGuard } from './core/pelada/pelada-onboarding.guard';
import { presenceListClosedGuard } from './core/presence/presence-list-closed.guard';
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
    path: 'dev/inicio-empty',
    loadComponent: () =>
      import('./features/dev/inicio-empty-preview.component').then(
        (m) => m.InicioEmptyPreviewComponent,
      ),
  },
  {
    path: 'dev/jogadores-list',
    loadComponent: () =>
      import('./features/dev/jogadores-list-preview.component').then(
        (m) => m.JogadoresListPreviewComponent,
      ),
  },
  {
    path: 'dev/jogador-perfil',
    loadComponent: () =>
      import('./features/dev/jogador-perfil-preview.component').then(
        (m) => m.JogadorPerfilPreviewComponent,
      ),
  },
  {
    path: 'dev/jogador-perfil-edit',
    loadComponent: () =>
      import('./features/dev/jogador-perfil-edit-preview.component').then(
        (m) => m.JogadorPerfilEditPreviewComponent,
      ),
  },
  {
    path: 'dev/criar-partida',
    loadComponent: () =>
      import('./features/dev/criar-partida-preview.component').then(
        (m) => m.CriarPartidaPreviewComponent,
      ),
  },
  {
    path: 'dev/presenca',
    loadComponent: () =>
      import('./features/dev/presenca-preview.component').then(
        (m) => m.PresencaPreviewComponent,
      ),
  },
  {
    path: 'dev/partida-sorteio',
    loadComponent: () =>
      import('./features/dev/sorteio-nav-preview.component').then(
        (m) => m.SorteioNavPreviewComponent,
      ),
  },
  {
    path: 'dev/sorteio-3-5',
    loadComponent: () =>
      import('./features/dev/sorteio-3-5-preview.component').then(
        (m) => m.Sorteio35PreviewComponent,
      ),
  },
  {
    path: 'dev/sorteio-3-5-share',
    loadComponent: () =>
      import('./features/dev/sorteio-3-5-share-preview.component').then(
        (m) => m.Sorteio35SharePreviewComponent,
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
        loadComponent: () =>
          import('./features/inicio/criar-partida.component').then(
            (m) => m.CriarPartidaComponent,
          ),
      },
      { path: 'partida', redirectTo: 'partida/presenca', pathMatch: 'full' },
      {
        path: 'partida/presenca',
        loadComponent: () =>
          import('./features/partida/presenca-partida.component').then(
            (m) => m.PresencaPartidaComponent,
          ),
      },
      {
        path: 'partida/sorteio',
        canActivate: [presenceListClosedGuard],
        loadComponent: () =>
          import('./features/partida/sorteio-partida.component').then(
            (m) => m.SorteioPartidaComponent,
          ),
        data: { title: 'Sorteio', eyebrow: 'Partida' },
      },
      {
        path: 'partida/campo',
        loadComponent: placeholder,
        data: { title: 'Em campo', eyebrow: 'Partida' },
      },
      {
        path: 'jogadores',
        loadComponent: () =>
          import('./features/jogadores/jogadores-lista.component').then(
            (m) => m.JogadoresListaComponent,
          ),
      },
      {
        path: 'jogadores/:playerId',
        loadComponent: () =>
          import('./features/jogadores/jogador-perfil.component').then(
            (m) => m.JogadorPerfilComponent,
          ),
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
