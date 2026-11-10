import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { MatchDrawDetailDto } from '../../core/match/match-draw-api.model';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import { buildDrawShareText } from '../partida/sorteio-share.logic';
import { PeladaButtonComponent } from '../../ui/button.component';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

const roster = new Map<string, RosterPlayer>([
  [
    'p1',
    {
      id: 'p1',
      displayName: 'Ana Silva',
      isGoalkeeper: false,
      position: 'Meio',
      rating: 8,
      tags: [],
      isFixedList: false,
    },
  ],
  [
    'p2',
    {
      id: 'p2',
      displayName: 'Bruno Ferreira',
      isGoalkeeper: false,
      position: 'Ataque',
      rating: 6,
      tags: [],
      isFixedList: false,
    },
  ],
]);

const draw: MatchDrawDetailDto = {
  drawId: 'preview',
  matchId: 'm-preview',
  balanceScore: 82,
  seed: '1',
  metrics: {
    balanceScore: 82,
    teamAverages: [7, 7],
    maxAverageDiff: 0,
    summaryText: 'Times bem equilibrados.',
  },
  teams: [
    {
      id: 'ta',
      name: 'Time A',
      sortOrder: 0,
      playerIds: ['p1'],
      players: [{ playerId: 'p1', sortOrder: 0 }],
    },
    {
      id: 'tb',
      name: 'Time B',
      sortOrder: 1,
      playerIds: ['p2'],
      players: [{ playerId: 'p2', sortOrder: 0 }],
    },
  ],
};

/** Prévia §3.5-SHARE — evidência 390px (issue #41), rota `/dev/sorteio-3-5-share`. */
@Component({
  selector: 'app-sorteio-3-5-share-preview',
  standalone: true,
  imports: [RouterLink, ScreenHeaderComponent, PeladaButtonComponent],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Partida"
        title="Pelada Resenha"
        subtitle="Compartilhar texto/imagem + ocultar notas (§3.5-SHARE)."
      />
      <nav class="partida-tabs" aria-label="Abas da partida">
        <a routerLink="/dev/sorteio-3-5">Sorteio</a>
        <a routerLink="/dev/sorteio-3-5-share" class="active">Share</a>
      </nav>
      <p class="pelada-muted lead">
        Modal aberto para captura — toggle “Ocultar notas” sem expor notas no texto.
      </p>

      <div class="share-modal-backdrop" role="presentation">
        <div
          class="share-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-preview-title"
        >
          <h2 id="share-preview-title" class="share-modal__title">
            Compartilhar times
          </h2>
          <p class="share-modal__lead pelada-muted">
            Texto para WhatsApp ou imagem com os times (história 61).
          </p>
          <label class="share-toggle pelada-muted">
            <input type="checkbox" checked (change)="onHide($event)" />
            Ocultar notas ao compartilhar
          </label>
          <textarea
            class="share-modal__textarea"
            readonly
            [value]="previewText()"
          ></textarea>
          <div class="share-modal__actions">
            <button type="button" peladaButton variant="lime" [peladaButtonBlock]="true">
              Copiar texto
            </button>
            <button type="button" peladaButton variant="secondary" [peladaButtonBlock]="true">
              Salvar imagem
            </button>
            <button type="button" peladaButton variant="secondary" [peladaButtonBlock]="true">
              Fechar
            </button>
          </div>
        </div>
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
      .lead {
        font-size: 0.8125rem;
        margin-bottom: var(--pelada-space-4);
      }
      .share-modal-backdrop {
        position: relative;
        min-height: 420px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 0;
        background: rgba(0, 0, 0, 0.35);
        border-radius: var(--pelada-radius-lg);
      }
      .share-modal {
        width: 100%;
        padding: var(--pelada-space-4);
        border-radius: var(--pelada-radius-lg) var(--pelada-radius-lg) 0 0;
        background: var(--pelada-paper);
      }
      .share-modal__title {
        margin: 0 0 var(--pelada-space-2);
        font-size: 1.125rem;
      }
      .share-modal__lead {
        margin: 0 0 var(--pelada-space-3);
        font-size: 0.875rem;
      }
      .share-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.8125rem;
        margin-bottom: var(--pelada-space-2);
      }
      .share-modal__textarea {
        width: 100%;
        min-height: 140px;
        margin-bottom: var(--pelada-space-3);
        padding: var(--pelada-space-2);
        border: 1px solid var(--pelada-line);
        border-radius: var(--pelada-radius-md);
        font-size: 0.8125rem;
      }
      .share-modal__actions {
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-2);
      }
    `,
  ],
})
export class Sorteio35SharePreviewComponent {
  readonly hideRatings = signal(true);
  readonly previewText = signal(
    buildDrawShareText(draw, roster, { hideRatings: true }),
  );

  onHide(ev: Event): void {
    const t = ev.target as HTMLInputElement | null;
    const hide = !!t?.checked;
    this.hideRatings.set(hide);
    this.previewText.set(buildDrawShareText(draw, roster, { hideRatings: hide }));
  }
}
