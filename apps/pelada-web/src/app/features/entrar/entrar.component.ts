import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-entrar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="shell">
      <h1>Entrar</h1>
      @if (loading()) {
        <p class="muted">Conectando ao Keycloak…</p>
      } @else if (auth.isLoggedIn()) {
        <p class="ok">Você já está autenticado.</p>
        <button type="button" class="primary" (click)="continue()">Continuar</button>
        <button type="button" class="link-btn" (click)="logout()">Sair</button>
      } @else {
        <p class="muted">Use sua conta Google ou e-mail (Keycloak).</p>
        <button type="button" class="primary" (click)="login()">
          Entrar com Keycloak
        </button>
      }
      <p class="hint">
        <a routerLink="/inicio">Voltar ao início</a> (sem login)
      </p>
    </main>
  `,
  styles: [
    `
      .shell {
        max-width: 24rem;
        margin: 2rem auto;
        padding: 1rem;
        font-family: system-ui, sans-serif;
      }
      .muted {
        color: #5c665f;
      }
      .ok {
        color: #173d32;
        font-weight: 600;
      }
      .hint {
        margin-top: 1.5rem;
        font-size: 0.85rem;
      }
      .hint a {
        color: #173d32;
        font-weight: 600;
      }
      .primary {
        display: block;
        width: 100%;
        margin-top: 1rem;
        background: #173d32;
        color: #fff;
        border: none;
        padding: 0.65rem 1rem;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      .link-btn {
        margin-top: 0.75rem;
        background: none;
        border: none;
        color: #173d32;
        font-weight: 600;
        cursor: pointer;
      }
    `,
  ],
})
export class EntrarComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    await this.auth.init();
    this.loading.set(false);
    if (this.auth.isLoggedIn()) {
      await this.auth.continueAfterLogin();
    }
  }

  login(): void {
    this.auth.login();
  }

  async continue(): Promise<void> {
    await this.auth.continueAfterLogin();
  }

  logout(): void {
    this.auth.logout();
  }
}
