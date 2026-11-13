import {
  CdkDragDrop,
  DragDropModule,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatRosterRating, rosterPositionLabel } from '../../core/roster/roster-list.logic';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import { PeladaAvatarComponent } from '../../ui/avatar.component';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaCardComponent } from '../../ui/card.component';
import { PeladaProgressComponent } from '../../ui/progress.component';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';
import { resolveSwapPairAfterCrossListDrop } from '../partida/sorteio-drag.logic';
import type { SorteioTeamView } from '../partida/sorteio-view.logic';
import {
  buildSpikeDrawState,
  redrawSpikeBalanced,
  SPIKE_MOCK_ROSTER,
  swapSpikePlayers,
} from './sorteio-spike.logic';

/** Prévia §3.5 + 5-SPIKE — drag local + `drawTeams` no browser; rota `/dev/sorteio-3-5`. */
@Component({
  selector: 'app-sorteio-3-5-preview',
  standalone: true,
  imports: [
    RouterLink,
    DragDropModule,
    ScreenHeaderComponent,
    PeladaCardComponent,
    PeladaButtonComponent,
    PeladaAvatarComponent,
    PeladaProgressComponent,
  ],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Partida · 5-SPIKE"
        title="Pelada Resenha"
        subtitle="Sorteio com @pelada/core no browser (sem API) + arraste entre times."
      />
      <nav class="partida-tabs" aria-label="Abas da partida">
        <a routerLink="/dev/presenca">Presença</a>
        <a routerLink="/dev/sorteio-3-5" class="active">Sorteio</a>
        <a routerLink="/dev/campo-3-6">Em campo</a>
      </nav>

      @if (state(); as s) {
        <pelada-card title="Equilíbrio">
          <p class="balance-lead">
            <strong>{{ s.draw.metrics.balanceScore }}%</strong>
            · {{ s.draw.metrics.summaryText }}
          </p>
          <pelada-progress
            [value]="s.draw.metrics.balanceScore"
            [startLabel]="'Dif. médias ' + formatDiff(s.draw.metrics.maxAverageDiff)"
            [endLabel]="s.draw.metrics.balanceScore + '%'"
          />
        </pelada-card>

        <p class="pelada-muted drag-hint">Segure e arraste um jogador para trocar de time.</p>
        @if (swapError(); as err) {
          <p class="swap-error" role="alert">{{ err }}</p>
        }

        <div cdkDropListGroup class="teams-grid">
          @for (meta of s.teams; track meta.sortOrder) {
            <pelada-card [title]="meta.name + ' · média ' + meta.averageLabel">
              <div
                class="team-drop"
                cdkDropList
                [id]="meta.listId"
                [cdkDropListData]="playersForTeam(meta.sortOrder)"
                (cdkDropListDropped)="onTeamDrop($event, meta.sortOrder)"
              >
                @for (p of playersForTeam(meta.sortOrder); track p.id) {
                  <div class="player-pill" cdkDrag [cdkDragData]="p">
                    <span class="drag-handle" cdkDragHandle aria-label="Arrastar">⋮⋮</span>
                    <pelada-avatar [name]="p.displayName" size="small" tone="lime" />
                    <span class="player-pill__main">
                      <span class="player-pill__name">{{ p.displayName }}</span>
                      <span class="player-pill__meta pelada-muted">
                        {{ rosterPositionLabel(p) }}
                        · Nota {{ formatRosterRating(p.rating) }}
                      </span>
                    </span>
                  </div>
                }
              </div>
            </pelada-card>
          }
        </div>

        <div class="sorteio-actions">
          <button
            type="button"
            peladaButton
            variant="lime"
            [peladaButtonBlock]="true"
            (click)="redrawBalanced()"
          >
            Sortear de novo (equilibrado)
          </button>
          <button type="button" peladaButton variant="secondary" [peladaButtonBlock]="true">
            Compartilhar
          </button>
        </div>
      }
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
        min-height: var(--pelada-touch-min);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .partida-tabs a.active {
        background: #f0f5e6;
        color: #486f36;
        border-color: #c5d9a8;
      }
      .balance-lead {
        margin: 0 0 var(--pelada-space-3);
        font-size: 0.9375rem;
      }
      .drag-hint {
        font-size: 0.8125rem;
        margin-bottom: var(--pelada-space-3);
      }
      .swap-error {
        margin: 0 0 var(--pelada-space-3);
        padding: var(--pelada-space-2) var(--pelada-space-3);
        border-radius: var(--pelada-radius-md);
        border: 1px solid #e8b4b4;
        background: #fdf2f2;
        color: #8a2f2f;
        font-size: 0.8125rem;
      }
      .teams-grid {
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-4);
        margin-bottom: var(--pelada-space-4);
      }
      .team-drop {
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-2);
      }
      .player-pill {
        display: flex;
        align-items: center;
        gap: var(--pelada-space-2);
        padding: var(--pelada-space-2) var(--pelada-space-3);
        border: 1px solid var(--pelada-line);
        border-radius: var(--pelada-radius-md);
        background: var(--pelada-paper);
      }
      .cdk-drag-preview {
        box-shadow: var(--pelada-shadow-md);
      }
      .cdk-drag-placeholder {
        opacity: 0.35;
      }
      .drag-handle {
        cursor: grab;
        color: var(--pelada-muted);
        font-size: 0.75rem;
        padding: 4px;
      }
      .player-pill__main {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .player-pill__name {
        font-weight: 600;
      }
      .player-pill__meta {
        font-size: 0.6875rem;
      }
      .sorteio-actions {
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-2);
        padding-bottom: 5rem;
      }
    `,
  ],
})
export class Sorteio35PreviewComponent {
  private spikeSeed = 5_422;

  readonly state = signal(
    buildSpikeDrawState(SPIKE_MOCK_ROSTER, this.spikeSeed),
  );
  readonly swapError = signal<string | null>(null);
  readonly rosterPositionLabel = rosterPositionLabel;
  readonly formatRosterRating = formatRosterRating;

  playersForTeam(sortOrder: number): RosterPlayer[] {
    return (
      this.state().teams.find((t) => t.sortOrder === sortOrder)?.players ?? []
    );
  }

  formatDiff(maxDiff: number): string {
    if (Number.isNaN(maxDiff)) {
      return '—';
    }
    return maxDiff.toFixed(1).replace('.', ',');
  }

  redrawBalanced(): void {
    this.spikeSeed += 1;
    this.swapError.set(null);
    this.state.set(redrawSpikeBalanced(this.state(), this.spikeSeed));
  }

  onTeamDrop(event: CdkDragDrop<RosterPlayer[]>, targetSortOrder: number): void {
    if (event.previousContainer === event.container) {
      return;
    }
    const previous = this.state();
    const working = cloneTeamsState(previous.teams);
    const src = working.find((t) => `sorteio-team-${t.sortOrder}` === event.previousContainer.id);
    const tgt = working.find((t) => t.sortOrder === targetSortOrder);
    const dragged = event.item.data as RosterPlayer;
    if (!src || !tgt) {
      return;
    }
    transferArrayItem(
      src.players,
      tgt.players,
      event.previousIndex,
      event.currentIndex,
    );
    const pair = resolveSwapPairAfterCrossListDrop(
      tgt.players,
      event.currentIndex,
      dragged.id,
    );
    if (!pair) {
      this.state.set({ ...previous, teams: cloneTeamsState(previous.teams) });
      return;
    }
    const result = swapSpikePlayers(previous, pair.playerAId, pair.playerBId);
    if (!result.ok) {
      this.swapError.set(result.message);
      this.state.set({ ...previous, teams: cloneTeamsState(previous.teams) });
      return;
    }
    this.swapError.set(null);
    this.state.set(result.state);
  }
}

function cloneTeamsState(teams: SorteioTeamView[]): SorteioTeamView[] {
  return teams.map((t) => ({
    ...t,
    players: [...t.players],
  }));
}
