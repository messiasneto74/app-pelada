import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaCardComponent } from '../../ui/card.component';
import { PeladaProgressComponent } from '../../ui/progress.component';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

/** Prévia §3.6 — evidência 390px (issue #43), rota `/dev/campo-3-6`. */
@Component({
  selector: 'app-campo-3-6-preview',
  standalone: true,
  imports: [
    RouterLink,
    ScreenHeaderComponent,
    PeladaCardComponent,
    PeladaButtonComponent,
    PeladaProgressComponent,
  ],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Partida"
        title="Pelada Resenha"
        subtitle="Em campo — placar, cronômetro e rodízio (§3.6)."
      />
      <nav class="partida-tabs">
        <a routerLink="/dev/sorteio-3-5">Sorteio</a>
        <a routerLink="/dev/campo-3-6" class="active">Em campo</a>
      </nav>

      <p class="round-eyebrow pelada-muted">Rodada 2 · Ganha fica</p>
      <div class="scoreboard">
        <div class="score-team">
          <span class="team-name">Time A</span>
          <span class="score-number">2</span>
        </div>
        <span class="score-sep">×</span>
        <div class="score-team">
          <span class="team-name">Time C</span>
          <span class="score-number">1</span>
        </div>
      </div>
      <p class="timer">{{ timer() }}</p>
      <pelada-progress [value]="42" />

      <pelada-card title="Descansando">
        <ul class="rest-list">
          <li>Time B</li>
        </ul>
        <p class="pelada-muted rest-hint">Próximo a entrar: Time B</p>
      </pelada-card>

      <div class="campo-actions">
        <button type="button" peladaButton variant="lime" [peladaButtonBlock]="true">
          +1 Time A
        </button>
        <button type="button" peladaButton variant="lime" [peladaButtonBlock]="true">
          +1 Time C
        </button>
        <button type="button" peladaButton variant="secondary" [peladaButtonBlock]="true">
          Pausar cronômetro
        </button>
      </div>
    </section>
  `,
  styles: [
    `
      .partida-tabs {
        display: flex;
        gap: var(--pelada-space-2);
        margin-bottom: var(--pelada-space-4);
      }
      .partida-tabs a {
        flex: 1;
        text-align: center;
        padding: var(--pelada-space-2);
        border-radius: var(--pelada-radius-md);
        font-size: 0.75rem;
        font-weight: 600;
        text-decoration: none;
        color: var(--pelada-muted);
        border: 1px solid var(--pelada-line);
      }
      .partida-tabs a.active {
        background: #f0f5e6;
        color: #486f36;
        border-color: #c5d9a8;
      }
      .round-eyebrow {
        font-size: 0.75rem;
        text-transform: uppercase;
        margin: 0 0 var(--pelada-space-3);
      }
      .scoreboard {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--pelada-space-4);
        margin-bottom: var(--pelada-space-4);
      }
      .score-team {
        flex: 1;
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .team-name {
        font-weight: 700;
      }
      .score-number {
        font-size: 2.5rem;
        font-weight: 800;
      }
      .score-sep {
        font-size: 1.5rem;
        color: var(--pelada-muted);
      }
      .timer {
        text-align: center;
        font-size: 2rem;
        font-weight: 700;
        margin: 0 0 var(--pelada-space-2);
      }
      pelada-progress {
        display: block;
        margin-bottom: var(--pelada-space-4);
      }
      .rest-list {
        margin: 0;
        padding-left: 1.25rem;
      }
      .rest-hint {
        margin-top: var(--pelada-space-2);
        font-size: 0.8125rem;
      }
      .campo-actions {
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-2);
        margin-top: var(--pelada-space-4);
      }
    `,
  ],
})
export class Campo36PreviewComponent {
  readonly timer = signal('12:34');
}
