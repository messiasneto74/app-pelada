import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { BottomNavComponent } from './bottom-nav.component';

@Component({
  selector: 'app-main-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, BottomNavComponent],
  template: `
    <div class="main-shell">
      <!-- Issue #224 — acesso ao Meu perfil (e ao "Sair da conta") em qualquer tela. -->
      <a class="main-shell__profile" routerLink="/perfil" aria-label="Meu perfil" title="Meu perfil">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </a>
      <main class="main-shell__content">
        <router-outlet />
      </main>
      <pelada-bottom-nav />
    </div>
  `,
  styles: [
    `
      .main-shell {
        background: var(--pelada-bg);
        position: relative;
      }
      .main-shell__profile {
        position: absolute;
        top: var(--pelada-space-3);
        right: var(--pelada-space-3);
        z-index: 5;
        display: flex;
        align-items: center;
        justify-content: center;
        width: var(--pelada-touch-min, 44px);
        height: var(--pelada-touch-min, 44px);
        border-radius: 999px;
        border: 1px solid var(--pelada-line);
        background: var(--pelada-paper);
        color: #173d32;
      }
      .main-shell__content {
        padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px) + var(--pelada-space-4));
      }
    `,
  ],
})
export class MainShellComponent {}
