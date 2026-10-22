import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-inicio',
  standalone: true,
  template: `
    <main class="shell">
      <h1>Bora jogar</h1>
      <p class="muted">Shell M0 — abas e telas Resenha nas issues T3 / 3.x.</p>
      @if (health) {
        <p class="ok">API: {{ health.status }} ({{ health.service }})</p>
      } @else if (healthError) {
        <p class="warn">API offline — rode <code>npm run dev:api</code></p>
      }
      <nav>
        <a routerLink="/entrar">Entrar</a>
      </nav>
    </main>
  `,
  styles: [
    `
      .shell {
        max-width: 28rem;
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
      .warn {
        color: #b94848;
        font-size: 0.9rem;
      }
      nav a {
        color: #173d32;
        font-weight: 600;
      }
    `,
  ],
  imports: [RouterLink],
})
export class InicioComponent {
  private readonly http = inject(HttpClient);
  health: { status: string; service: string } | null = null;
  healthError = false;

  constructor() {
    this.http
      .get<{ status: string; service: string }>(
        `${environment.apiUrl}/health`,
      )
      .subscribe({
        next: (body) => (this.health = body),
        error: () => (this.healthError = true),
      });
  }
}
