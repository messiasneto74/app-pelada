import { DragDropModule } from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatRosterRating, rosterPositionLabel } from '../../core/roster/roster-list.logic';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import { PeladaAvatarComponent } from '../../ui/avatar.component';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaCardComponent } from '../../ui/card.component';
import { PeladaProgressComponent } from '../../ui/progress.component';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

const teamA: RosterPlayer[] = [
  {
    id: 'p1',
    displayName: 'Ana Silva',
    isGoalkeeper: true,
    position: null,
    rating: 8,
    tags: [],
    isFixedList: false,
    userId: null,
  },
  {
    id: 'p2',
    displayName: 'Bruno Ferreira',
    isGoalkeeper: false,
    position: 'Meio',
    rating: 6,
    tags: [],
    isFixedList: false,
    userId: null,
  },
  {
    id: 'p3',
    displayName: 'Carlos Lima',
    isGoalkeeper: false,
    position: 'Ataque',
    rating: 7,
    tags: [],
    isFixedList: false,
    userId: null,
  },
];

const teamB: RosterPlayer[] = [
  {
    id: 'p4',
    displayName: 'Diego Souza',
    isGoalkeeper: true,
    position: null,
    rating: 7,
    tags: [],
    isFixedList: false,
    userId: null,
  },
  {
    id: 'p5',
    displayName: 'Eduardo Ramos',
    isGoalkeeper: false,
    position: 'Zaga',
    rating: 6,
    tags: [],
    isFixedList: false,
    userId: null,
  },
  {
    id: 'p6',
    displayName: 'Felipe Costa',
    isGoalkeeper: false,
    position: 'Meio',
    rating: 6,
    tags: [],
    isFixedList: false,
    userId: null,
  },
];

/** Prévia §3.5 — evidência 390px (issue #40), rota `/dev/sorteio-3-5`. */
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
        eyebrow="Partida"
        title="Pelada Resenha"
        subtitle="Sorteio equilibrado, trocas e compartilhamento (§3.5)."
      />
      <nav class="partida-tabs" aria-label="Abas da partida">
        <a routerLink="/dev/presenca">Presença</a>
        <a routerLink="/dev/sorteio-3-5" class="active">Sorteio</a>
        <a routerLink="/dev/sorteio-3-5">Em campo</a>
      </nav>

      <pelada-card title="Equilíbrio">
        <p class="balance-lead">
          <strong>92%</strong>
          · Times com médias próximas (exemplo evidência)
        </p>
        <pelada-progress
          [value]="92"
          startLabel="Dif. médias 0,8"
          endLabel="92%"
        />
      </pelada-card>

      <p class="pelada-muted drag-hint">Segure e arraste um jogador para trocar de time.</p>

      <div class="teams-grid">
        <pelada-card title="Time A · média 6,7">
          <div class="team-drop" cdkDropList [cdkDropListData]="teamA">
            @for (p of teamA; track p.id) {
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
        <pelada-card title="Time B · média 6,3">
          <div class="team-drop" cdkDropList [cdkDropListData]="teamB">
            @for (p of teamB; track p.id) {
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
      </div>

      <div class="sorteio-actions">
        <button type="button" peladaButton variant="lime" [peladaButtonBlock]="true">
          Sortear de novo (equilibrado)
        </button>
        <button type="button" peladaButton variant="secondary" [peladaButtonBlock]="true">
          Compartilhar
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
  readonly teamA = teamA;
  readonly teamB = teamB;
  readonly rosterPositionLabel = rosterPositionLabel;
  readonly formatRosterRating = formatRosterRating;
}
