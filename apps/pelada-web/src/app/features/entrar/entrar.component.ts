import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-entrar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="shell">
      <h1>Entrar</h1>
      <p class="muted">
        Login Keycloak (Google / e-mail) — issue <strong>F0-5</strong>.
      </p>
      <p class="hint">
        Realm <code>{{ environment.keycloak.realm }}</code> ·
        {{ environment.keycloak.url }}
      </p>
      <a routerLink="/inicio" class="link">Ir para Início (dev)</a>
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
      .hint {
        font-size: 0.85rem;
      }
      .link {
        color: #173d32;
        font-weight: 600;
      }
    `,
  ],
  imports: [],
})
export class EntrarComponent {
  readonly environment = environment;
}
