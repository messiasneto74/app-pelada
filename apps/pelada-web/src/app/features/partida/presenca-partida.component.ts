import { Component, computed, inject, model, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { MatchPresenceMode } from '../../core/match/create-match-form.logic';
import type { InicioDashboardView } from '../../core/inicio/inicio-dashboard.model';
import { PeladaDashboardService } from '../../core/inicio/pelada-dashboard.service';
import {
  canOrganizerEditPresence,
  presenceModeHint,
  rowPrimaryActionLabel,
} from '../../core/presence/presence-action.logic';
import type { PresenceSegment } from '../../core/presence/presence-attendance.model';
import {
  buildInitialStatusMap,
  filterPresenceBySegment,
  orgTogglePlayer,
  presenceCounts,
  resolveGuest,
  rowsFromRosterAndMap,
  segmentOptionsWithCounts,
  statusChipLabel,
  vacancyFillPercent,
  vacancySummary,
} from '../../core/presence/presence-list.logic';
import type { PlayerPresenceStatus, PresenceRow } from '../../core/presence/presence-attendance.model';
import { PresenceSessionService } from '../../core/presence/presence-session.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import {
  formatRosterRating,
  rosterPositionLabel,
} from '../../core/roster/roster-list.logic';
import { PeladaRosterService } from '../../core/roster/pelada-roster.service';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import { PeladaAvatarComponent } from '../../ui/avatar.component';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaCardComponent } from '../../ui/card.component';
import { PeladaProgressComponent } from '../../ui/progress.component';
import { PeladaSegmentComponent } from '../../ui/segment.component';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

@Component({
  selector: 'app-presenca-partida',
  standalone: true,
  imports: [
    RouterLink,
    ScreenHeaderComponent,
    PeladaCardComponent,
    PeladaProgressComponent,
    PeladaSegmentComponent,
    PeladaButtonComponent,
    PeladaAvatarComponent,
  ],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Partida"
        [title]="headerTitle()"
        subtitle="Lista de presença, fila e convidados (§3.4)."
      />

      <nav class="partida-tabs" aria-label="Abas da partida">
        <a routerLink="/partida/presenca" routerLinkActive="active">Presença</a>
        <a routerLink="/partida/sorteio" routerLinkActive="active">Sorteio</a>
        <a routerLink="/partida/campo" routerLinkActive="active">Em campo</a>
      </nav>

      @if (loading()) {
        <p class="pelada-muted">Carregando lista…</p>
      } @else if (!matchId()) {
        <pelada-card title="Nenhuma partida marcada">
          <p class="pelada-muted">
            Crie uma partida no Início para abrir a lista de presença.
          </p>
          <a routerLink="/inicio/criar-partida" peladaButton [peladaButtonBlock]="true">
            Criar partida
          </a>
        </pelada-card>
      } @else {
        <pelada-card [title]="vacancyTitle()">
          <div class="vacancy-row">
            <span class="vacancy-summary">{{ vacancySummaryText() }}</span>
            @if (counts().queue > 0) {
              <span class="queue-chip">{{ counts().queue }} na fila</span>
            }
            @if (listClosed()) {
              <span class="list-chip list-chip--closed">Lista fechada</span>
            } @else {
              <span class="list-chip list-chip--open">Lista aberta</span>
            }
          </div>
          <pelada-progress
            [value]="vacancyPercent()"
            [startLabel]="counts().confirmed + '/' + capacity() + ' confirmados'"
            [endLabel]="vacancyPercent() + '%'"
          />
          <p class="pelada-muted mode-hint">{{ modeHint() }}</p>
        </pelada-card>

        <pelada-segment [options]="segmentOptions()" [(value)]="segment" />

        @if (visibleRows().length === 0) {
          <p class="pelada-muted empty-hint">Ninguém neste filtro. A lista está atualizada!</p>
        } @else {
          <ul class="presence-list">
            @for (row of visibleRows(); track rowTrack(row)) {
              <li class="presence-row">
                @if (row.kind === 'player') {
                  <pelada-avatar [name]="row.player.displayName" size="small" tone="lime" />
                  <span class="presence-row__main">
                    <span class="presence-row__name">{{ row.player.displayName }}</span>
                    <span class="presence-row__meta pelada-muted">
                      {{ rosterPositionLabel(row.player) }}
                      · Nota {{ formatRosterRating(row.player.rating) }}
                    </span>
                  </span>
                  <span class="status-chip">{{ statusChipLabel(row) }}</span>
                  @if (showOrgActions(row)) {
                    <button
                      type="button"
                      peladaButton
                      variant="secondary"
                      (click)="onOrgToggle(row.player.id)"
                    >
                      {{ rowActionLabel(row) }}
                    </button>
                  }
                } @else {
                  <pelada-avatar [name]="row.displayName" size="small" tone="lime" />
                  <span class="presence-row__main">
                    <span class="presence-row__name">{{ row.displayName }}</span>
                    <span class="presence-row__meta pelada-muted">Pediu vaga na partida</span>
                  </span>
                  <span class="status-chip">{{ statusChipLabel(row) }}</span>
                  @if (canOrganizerEdit() && isOrganizador()) {
                    <button
                      type="button"
                      peladaButton
                      variant="lime"
                      (click)="onGuest(true, row.guestId)"
                    >
                      Aceitar
                    </button>
                    <button
                      type="button"
                      peladaButton
                      variant="secondary"
                      (click)="onGuest(false, row.guestId)"
                    >
                      Recusar
                    </button>
                  }
                }
              </li>
            }
          </ul>
        }

        @if (listClosed()) {
          @if (isOrganizador()) {
            <button
              type="button"
              peladaButton
              variant="secondary"
              [peladaButtonBlock]="true"
              (click)="reopenList()"
            >
              Reabrir lista
            </button>
          }
        } @else if (isOrganizador()) {
          <button
            type="button"
            peladaButton
            variant="lime"
            [peladaButtonBlock]="true"
            (click)="closeListAndDraw()"
          >
            Fechar lista e sortear
          </button>
        }
      }
    </section>
  `,
  styles: [
    `
      .partida-tabs {
        display: flex;
        gap: var(--pelada-space-2);
        margin-bottom: var(--pelada-space-4);
        overflow-x: auto;
      }
      .partida-tabs a {
        flex: 1;
        text-align: center;
        padding: var(--pelada-space-2) var(--pelada-space-3);
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
      pelada-segment {
        display: block;
        margin-bottom: var(--pelada-space-4);
      }
      .vacancy-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--pelada-space-2);
        margin-bottom: var(--pelada-space-3);
      }
      .vacancy-summary {
        font-weight: 700;
        font-size: 1.125rem;
      }
      .queue-chip,
      .list-chip {
        font-size: 0.6875rem;
        font-weight: 600;
        padding: 4px 8px;
        border-radius: 999px;
      }
      .queue-chip {
        background: #eef2ff;
        color: #4338ca;
      }
      .list-chip--open {
        background: #ecfdf5;
        color: #047857;
      }
      .list-chip--closed {
        background: #fff7ed;
        color: #c2410c;
      }
      .mode-hint {
        margin-top: var(--pelada-space-3);
        font-size: 0.8125rem;
      }
      .presence-list {
        list-style: none;
        margin: 0 0 var(--pelada-space-4);
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-3);
      }
      .presence-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--pelada-space-2);
        padding: var(--pelada-space-3);
        border: 1px solid var(--pelada-line);
        border-radius: var(--pelada-radius-md);
        background: var(--pelada-paper);
      }
      .presence-row__main {
        flex: 1;
        min-width: 120px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .presence-row__name {
        font-weight: 600;
      }
      .status-chip {
        font-size: 0.6875rem;
        font-weight: 600;
        padding: 4px 8px;
        border-radius: 6px;
        background: var(--pelada-bg);
        color: var(--pelada-muted);
      }
      .empty-hint {
        margin-bottom: var(--pelada-space-4);
      }
    `,
  ],
})
export class PresencaPartidaComponent implements OnInit {
  private readonly peladaContext = inject(PeladaContextService);
  private readonly dashboardService = inject(PeladaDashboardService);
  private readonly rosterService = inject(PeladaRosterService);
  private readonly orgContext = inject(PeladaOrganizadorContextService);
  private readonly session = inject(PresenceSessionService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly matchId = signal<string | null>(null);
  readonly capacity = signal(14);
  readonly listClosed = signal(false);
  readonly presenceMode = signal<MatchPresenceMode>('ORGANIZER_CLOSES');
  readonly roster = signal<RosterPlayer[]>([]);
  readonly rows = signal<PresenceRow[]>([]);
  readonly segment = model<PresenceSegment>('confirmed');

  readonly headerTitle = computed(() => {
    const pelada = this.peladaContext.getActivePelada();
    return pelada?.name ?? 'Presença';
  });

  readonly counts = computed(() => presenceCounts(this.rows()));
  readonly vacancyPercent = computed(() =>
    vacancyFillPercent(this.counts().confirmed, this.capacity()),
  );
  readonly vacancySummaryText = computed(() =>
    vacancySummary(this.counts().confirmed, this.capacity()),
  );
  readonly vacancyTitle = computed(() => 'Quem fecha com a gente?');
  readonly modeHint = computed(() => presenceModeHint(this.presenceMode()));
  readonly segmentOptions = computed(() => segmentOptionsWithCounts(this.counts()));
  readonly visibleRows = computed(() =>
    filterPresenceBySegment(this.rows(), this.segment()),
  );

  readonly isOrganizador = computed(() => {
    const pelada = this.peladaContext.getActivePelada();
    return pelada ? this.orgContext.isOrganizador(pelada.id) : false;
  });

  readonly canOrganizerEdit = computed(() =>
    canOrganizerEditPresence(this.listClosed()),
  );

  readonly formatRosterRating = formatRosterRating;
  readonly rosterPositionLabel = rosterPositionLabel;
  readonly statusChipLabel = statusChipLabel;

  ngOnInit(): void {
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada) {
      this.loading.set(false);
      return;
    }
    this.dashboardService.loadDashboard(pelada, (dash) => {
      this.rosterService.loadRoster(pelada, (players) => {
        this.applyLoadedState(dash, players);
        this.loading.set(false);
      });
    });
  }

  rowTrack(row: PresenceRow): string {
    return row.kind === 'player' ? row.player.id : row.guestId;
  }

  rowActionLabel(row: PresenceRow): string {
    if (row.kind !== 'player') {
      return '';
    }
    return rowPrimaryActionLabel(this.segment(), row);
  }

  showOrgActions(row: PresenceRow): boolean {
    if (row.kind !== 'player') {
      return false;
    }
    return this.isOrganizador() && this.canOrganizerEdit();
  }

  onOrgToggle(playerId: string): void {
    if (this.listClosed() || !this.isOrganizador()) {
      return;
    }
    this.updateRows(orgTogglePlayer(this.rows(), playerId, this.capacity()));
  }

  onGuest(accept: boolean, guestId: string): void {
    if (!this.isOrganizador() || this.listClosed()) {
      return;
    }
    this.updateRows(resolveGuest(this.rows(), guestId, accept, this.capacity()));
  }

  closeListAndDraw(): void {
    this.listClosed.set(true);
    this.persist();
    void this.router.navigate(['/partida/sorteio']);
  }

  reopenList(): void {
    this.listClosed.set(false);
    this.persist();
  }

  private applyLoadedState(dash: InicioDashboardView, players: RosterPlayer[]): void {
    this.roster.set(players);
    const match = dash.nextMatch;
    if (!match) {
      this.matchId.set(null);
      return;
    }
    this.matchId.set(match.matchId);
    this.capacity.set(match.capacity);

    const saved = this.session.load(match.matchId);
    const persisted = saved?.statusByPlayerId ?? null;
    if (saved?.presenceMode) {
      this.presenceMode.set(saved.presenceMode);
    }
    if (saved?.listClosed) {
      this.listClosed.set(saved.listClosed);
    }

    const apiConfirmed = match.confirmedPlayers.map((p) => p.id);
    const map = buildInitialStatusMap(
      players,
      match.capacity,
      apiConfirmed,
      persisted,
    );
    const guests =
      saved?.guests?.filter((g) => g.kind === 'guest') ??
      ([] as PresenceRow[]);
    this.rows.set(rowsFromRosterAndMap(players, map, guests));
    this.persist();
  }

  private updateRows(next: PresenceRow[]): void {
    this.rows.set(next);
    this.persist();
  }

  private persist(): void {
    const matchId = this.matchId();
    if (!matchId) {
      return;
    }
    const statusByPlayerId: Record<string, PlayerPresenceStatus> = {};
    for (const row of this.rows()) {
      if (row.kind === 'player') {
        statusByPlayerId[row.player.id] = row.status;
      }
    }
    const guests = this.rows().filter((r) => r.kind === 'guest');
    this.session.save({
      matchId,
      listClosed: this.listClosed(),
      statusByPlayerId,
      guests,
      presenceMode: this.presenceMode(),
    });
  }
}
