import { CdkDragDrop, DragDropModule, transferArrayItem } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PARTIDA_PRESENCA_PATH } from '../../core/presence/partida-sorteio-route';
import { PresenceSessionService } from '../../core/presence/presence-session.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import { PeladaDashboardService } from '../../core/inicio/pelada-dashboard.service';
import { PeladaRosterService } from '../../core/roster/pelada-roster.service';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import {
  formatRosterRating,
  rosterPositionLabel,
} from '../../core/roster/roster-list.logic';
import { PeladaMatchAttendanceService } from '../../core/match/pelada-match-attendance.service';
import { MatchDrawService } from '../../core/match/match-draw.service';
import type { MatchDrawDetailDto } from '../../core/match/match-draw-api.model';
import {
  buildDrawShareText,
  mapDrawToSorteioTeams,
  type SorteioTeamView,
} from './sorteio-view.logic';
import { resolveSwapPairAfterCrossListDrop } from './sorteio-drag.logic';
import { PeladaAvatarComponent } from '../../ui/avatar.component';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaCardComponent } from '../../ui/card.component';
import { PeladaProgressComponent } from '../../ui/progress.component';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

type TeamListState = { sortOrder: number; players: RosterPlayer[] };

@Component({
  selector: 'app-sorteio-partida',
  standalone: true,
  imports: [
    CommonModule,
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
        [title]="headerTitle()"
        subtitle="Sorteio equilibrado, trocas e compartilhamento (§3.5)."
      />

      <nav class="partida-tabs" aria-label="Abas da partida">
        <a [routerLink]="presencaPath" routerLinkActive="active">Presença</a>
        <a routerLink="/partida/sorteio" routerLinkActive="active">Sorteio</a>
        <a routerLink="/partida/campo" routerLinkActive="active">Em campo</a>
      </nav>

      @if (loading()) {
        <p class="pelada-muted">Carregando sorteio…</p>
      } @else if (!matchId()) {
        <pelada-card title="Nenhuma partida ativa">
          <p class="pelada-muted">
            Crie uma partida no Início para liberar o sorteio.
          </p>
          <a routerLink="/inicio/criar-partida" peladaButton [peladaButtonBlock]="true">
            Criar partida
          </a>
        </pelada-card>
      } @else if (!listClosed()) {
        <pelada-card title="Lista ainda aberta">
          <p class="pelada-muted">
            Feche a lista de presença antes de sortear (§3.4).
          </p>
          <a [routerLink]="presencaPath" peladaButton [peladaButtonBlock]="true">
            Ir para presença
          </a>
        </pelada-card>
      } @else {
        @if (drawError()) {
          <p class="pelada-error" role="alert">{{ drawError() }}</p>
        }

        @if (draw(); as d) {
          <pelada-card title="Equilíbrio">
            <p class="balance-lead">
              <strong>{{ d.metrics.balanceScore }}%</strong>
              · {{ d.metrics.summaryText }}
            </p>
            <pelada-progress
              [value]="d.metrics.balanceScore"
              [startLabel]="'Dif. médias ' + formatDiff(d.metrics.maxAverageDiff)"
              [endLabel]="d.metrics.balanceScore + '%'"
            />
          </pelada-card>

          @if (shareHint()) {
            <p class="pelada-muted share-hint" role="status">{{ shareHint() }}</p>
          }

          <p class="pelada-muted drag-hint">Segure e arraste um jogador para trocar de time.</p>

          <div cdkDropListGroup class="teams-grid">
            @for (meta of teamMeta(); track meta.sortOrder) {
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
            @if (isOrganizador()) {
              <button
                type="button"
                peladaButton
                variant="lime"
                [peladaButtonBlock]="true"
                [disabled]="drawBusy()"
                (click)="redrawBalanced()"
              >
                Sortear de novo (equilibrado)
              </button>
              <button
                type="button"
                peladaButton
                variant="secondary"
                [peladaButtonBlock]="true"
                [disabled]="drawBusy()"
                (click)="redrawRandom()"
              >
                Sortear de novo (aleatório)
              </button>
            }
            <label class="share-toggle pelada-muted">
              <input type="checkbox" [checked]="hideRatingsForShare()" (change)="toggleHideNotes($event)" />
              Ocultar notas ao compartilhar
            </label>
            <button
              type="button"
              peladaButton
              variant="secondary"
              [peladaButtonBlock]="true"
              (click)="shareDraw()"
            >
              Compartilhar
            </button>
          </div>
        } @else {
          <pelada-card title="Ainda não há sorteio">
            @if (isOrganizador()) {
              <p class="pelada-muted">
                Toque para gerar times com base nos confirmados e na fila (conforme regras da pelada).
              </p>
              <button
                type="button"
                peladaButton
                variant="lime"
                [peladaButtonBlock]="true"
                [disabled]="drawBusy()"
                (click)="firstDrawBalanced()"
              >
                Sortear agora
              </button>
            } @else {
              <p class="pelada-muted">
                O organizador ainda não rodou o sorteio desta partida.
              </p>
            }
          </pelada-card>
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
      .balance-lead {
        margin: 0 0 var(--pelada-space-3);
        font-size: 0.9375rem;
      }
      .drag-hint {
        font-size: 0.8125rem;
        margin-bottom: var(--pelada-space-3);
      }
      .share-hint {
        font-size: 0.8125rem;
        margin-bottom: var(--pelada-space-2);
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
        min-height: 48px;
      }
      .player-pill {
        display: flex;
        align-items: center;
        gap: var(--pelada-space-2);
        padding: var(--pelada-space-2) var(--pelada-space-3);
        border: 1px solid var(--pelada-line);
        border-radius: var(--pelada-radius-md);
        background: var(--pelada-paper);
        touch-action: none;
      }
      .cdk-drag-preview {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        border-radius: var(--pelada-radius-md);
      }
      .cdk-drag-placeholder {
        opacity: 0.35;
      }
      .drag-handle {
        cursor: grab;
        color: var(--pelada-muted);
        font-size: 0.75rem;
        padding: 4px;
        user-select: none;
      }
      .player-pill__main {
        flex: 1;
        min-width: 0;
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
      }
      .share-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.8125rem;
      }
      .pelada-error {
        color: #b91c1c;
        font-size: 0.875rem;
        margin-bottom: var(--pelada-space-3);
      }
    `,
  ],
})
export class SorteioPartidaComponent implements OnInit {
  readonly presencaPath = PARTIDA_PRESENCA_PATH;

  private readonly peladaContext = inject(PeladaContextService);
  private readonly orgContext = inject(PeladaOrganizadorContextService);
  private readonly session = inject(PresenceSessionService);
  private readonly dashboardService = inject(PeladaDashboardService);
  private readonly rosterService = inject(PeladaRosterService);
  private readonly attendanceApi = inject(PeladaMatchAttendanceService);
  private readonly matchDrawApi = inject(MatchDrawService);

  readonly loading = signal(true);
  readonly drawLoading = signal(false);
  readonly drawBusy = computed(() => this.drawLoading());
  readonly matchId = signal<string | null>(null);
  readonly listClosed = signal(false);
  readonly draw = signal<MatchDrawDetailDto | null>(null);
  readonly drawError = signal<string | null>(null);
  readonly rosterById = signal(new Map<string, RosterPlayer>());
  /** Ordem editável para CDK; espelha o último draw carregado da API. */
  readonly teamsState = signal<TeamListState[]>([]);
  readonly hideRatingsForShare = signal(false);
  readonly shareHint = signal<string | null>(null);

  readonly headerTitle = computed(() => {
    const pelada = this.peladaContext.getActivePelada();
    return pelada?.name ?? 'Sorteio';
  });

  readonly isOrganizador = computed(() => {
    const pelada = this.peladaContext.getActivePelada();
    return pelada ? this.orgContext.isOrganizador(pelada.id) : false;
  });

  readonly teamMeta = computed((): SorteioTeamView[] => {
    const d = this.draw();
    const map = this.rosterById();
    if (!d) {
      return [];
    }
    return mapDrawToSorteioTeams(d, map).map((t) => ({
      ...t,
      players: [],
    }));
  });

  readonly rosterPositionLabel = rosterPositionLabel;
  readonly formatRosterRating = formatRosterRating;

  ngOnInit(): void {
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada) {
      this.loading.set(false);
      return;
    }
    this.orgContext.refreshMembership(pelada.id);
    this.dashboardService.loadDashboard(pelada, (dash) => {
      const match = dash.nextMatch;
      if (!match) {
        this.matchId.set(null);
        this.loading.set(false);
        return;
      }
      this.matchId.set(match.matchId);
      this.session.setActiveMatchId(match.matchId);
      const snap = this.session.load(match.matchId);
      this.listClosed.set(snap?.listClosed ?? false);

      this.rosterService.loadRoster(pelada, (players) => {
        this.rosterById.set(new Map(players.map((p) => [p.id, p])));
        this.loading.set(false);
        this.loadDrawFromApi();
      });
    });
  }

  playersForTeam(sortOrder: number): RosterPlayer[] {
    return this.teamsState().find((t) => t.sortOrder === sortOrder)?.players ?? [];
  }

  formatDiff(maxDiff: number): string {
    if (Number.isNaN(maxDiff)) {
      return '—';
    }
    return maxDiff.toFixed(1).replace('.', ',');
  }

  onTeamDrop(event: CdkDragDrop<RosterPlayer[]>, targetSortOrder: number): void {
    if (!this.isOrganizador()) {
      return;
    }
    if (event.previousContainer === event.container) {
      return;
    }
    const pelada = this.peladaContext.getActivePelada();
    const mid = this.matchId();
    if (!pelada || !mid) {
      return;
    }
    const dragged = event.item.data as RosterPlayer;
    const state = this.teamsState().map((t) => ({
      sortOrder: t.sortOrder,
      players: [...t.players],
    }));
    const src = state.find((t) => `sorteio-team-${t.sortOrder}` === event.previousContainer.id);
    const tgt = state.find((t) => t.sortOrder === targetSortOrder);
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
    this.teamsState.set(state);
    if (!pair) {
      this.loadDrawFromApi();
      return;
    }
    this.drawLoading.set(true);
    this.matchDrawApi.patchSwap(pelada.id, mid, pair).subscribe({
      next: (d) => {
        this.draw.set(d);
        this.syncTeamsFromDraw(d);
        this.drawLoading.set(false);
        this.drawError.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.drawLoading.set(false);
        this.drawError.set(swapErrorMessage(err));
        this.loadDrawFromApi();
      },
    });
  }

  firstDrawBalanced(): void {
    this.runPostDraw({ mode: 'BALANCED' });
  }

  redrawBalanced(): void {
    this.runPostDraw({ mode: 'BALANCED' });
  }

  redrawRandom(): void {
    this.runPostDraw({ mode: 'RANDOM' });
  }

  private runPostDraw(body: { mode: 'BALANCED' | 'RANDOM'; seed?: number }): void {
    const pelada = this.peladaContext.getActivePelada();
    const mid = this.matchId();
    if (!pelada || !mid || !this.isOrganizador()) {
      return;
    }
    this.drawLoading.set(true);
    this.drawError.set(null);
    this.matchDrawApi.postDraw(pelada.id, mid, body).subscribe({
      next: (d) => {
        this.draw.set(d);
        this.syncTeamsFromDraw(d);
        this.drawLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const msg = postDrawErrorMessage(err);
        if (shouldRetryCloseList(err, msg) && this.listClosed()) {
          this.attendanceApi.closeList(pelada.id, mid).subscribe({
            next: () =>
              this.matchDrawApi.postDraw(pelada.id, mid, body).subscribe({
                next: (d) => {
                  this.draw.set(d);
                  this.syncTeamsFromDraw(d);
                  this.drawLoading.set(false);
                  this.drawError.set(null);
                },
                error: (e2: HttpErrorResponse) => {
                  this.drawLoading.set(false);
                  this.drawError.set(postDrawErrorMessage(e2));
                },
              }),
            error: () => {
              this.drawLoading.set(false);
              this.drawError.set(msg);
            },
          });
          return;
        }
        this.drawLoading.set(false);
        this.drawError.set(msg);
      },
    });
  }

  private loadDrawFromApi(): void {
    const pelada = this.peladaContext.getActivePelada();
    const mid = this.matchId();
    if (!pelada || !mid) {
      return;
    }
    this.drawLoading.set(true);
    this.matchDrawApi.getDraw(pelada.id, mid).subscribe({
      next: (d) => {
        this.draw.set(d);
        this.syncTeamsFromDraw(d);
        this.drawLoading.set(false);
        this.drawError.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.drawLoading.set(false);
        if (err.status === 404) {
          this.draw.set(null);
          this.teamsState.set([]);
          this.drawError.set(null);
        } else {
          this.drawError.set('Não foi possível carregar o sorteio.');
        }
      },
    });
  }

  private syncTeamsFromDraw(d: MatchDrawDetailDto): void {
    const map = this.rosterById();
    const views = mapDrawToSorteioTeams(d, map);
    this.teamsState.set(
      views.map((v) => ({ sortOrder: v.sortOrder, players: [...v.players] })),
    );
  }

  toggleHideNotes(ev: Event): void {
    const t = ev.target as HTMLInputElement | null;
    this.hideRatingsForShare.set(!!t?.checked);
  }

  shareDraw(): void {
    const d = this.draw();
    const map = this.rosterById();
    if (!d || map.size === 0) {
      return;
    }
    const text = buildDrawShareText(d, map, {
      hideRatings: this.hideRatingsForShare(),
    });
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      this.shareHint.set('Copie manualmente o texto dos times na tela.');
      return;
    }
    void navigator.clipboard.writeText(text).then(
      () => {
        this.shareHint.set('Texto copiado. Cole no WhatsApp ou onde quiser.');
        window.setTimeout(() => this.shareHint.set(null), 4000);
      },
      () => this.shareHint.set('Não foi possível copiar. Tente de novo.'),
    );
  }
}

function postDrawErrorMessage(err: HttpErrorResponse): string {
  const body = err.error as { message?: string } | undefined;
  if (typeof body?.message === 'string' && body.message.length > 0) {
    return body.message;
  }
  if (err.status === 400) {
    return 'Não foi possível sortear. Verifique se a lista foi fechada na API.';
  }
  if (err.status === 403) {
    return 'Somente o organizador pode sortear.';
  }
  return 'Erro ao sortear. Tente novamente.';
}

function swapErrorMessage(err: HttpErrorResponse): string {
  const body = err.error as { message?: string } | undefined;
  if (typeof body?.message === 'string' && body.message.length > 0) {
    return body.message;
  }
  return 'Troca não aplicada.';
}

function shouldRetryCloseList(err: HttpErrorResponse, message: string): boolean {
  if (err.status !== 400) {
    return false;
  }
  const m = message.toLowerCase();
  return m.includes('feche a lista') || m.includes('lista de presença');
}
