import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { PeladaButtonComponent } from '../../ui/button.component';

@Component({
  selector: 'app-entrar',
  standalone: true,
  imports: [RouterLink, PeladaButtonComponent],
  template: `
    <main class="pelada-shell">
      <h1>Entrar</h1>
      @if (loading()) {
        <p class="pelada-muted">Conectando ao Keycloak…</p>
      } @else if (auth.isLoggedIn()) {
        <p class="pelada-text-ok">Você já está autenticado.</p>
        <button type="button" peladaButton peladaButtonBlock (click)="continue()">
          Continuar
        </button>
        <button type="button" peladaButton variant="ghost" (click)="logout()">Sair</button>
      } @else {
        <p class="pelada-muted">Use sua conta Google ou e-mail (Keycloak).</p>
        <button type="button" peladaButton variant="lime" peladaButtonBlock (click)="login()">
          Entrar com Keycloak
        </button>
      }
      <p class="hint pelada-muted">
        <a routerLink="/inicio">Voltar ao início</a> (sem login) ·
        <a routerLink="/dev/tema">T1</a> · <a routerLink="/dev/componentes">T2</a> ·
        <a routerLink="/dev/mobile-ux">T6</a>
      </p>
    </main>
  `,
  styles: [
    `
      .hint {
        margin-top: var(--pelada-space-6);
        font-size: 0.85rem;
      }
      [peladaButton] {
        margin-top: var(--pelada-space-4);
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
