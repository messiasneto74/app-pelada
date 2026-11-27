import { CommonModule, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import type { MatchFieldSessionDto } from '../../core/match/match-field-session-api.model';
import { MatchFieldSessionService } from '../../core/match/match-field-session.service';
import { MatchDrawService } from '../../core/match/match-draw.service';
import { PeladaDashboardService } from '../../core/inicio/pelada-dashboard.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import { PARTIDA_PRESENCA_PATH } from '../../core/presence/partida-sorteio-route';
import { PresenceSessionService } from '../../core/presence/presence-session.service';
import {
  catchUpTickMsOnPageVisible,
  shouldResyncFieldSessionOnVisible,
} from './campo-timer-visibility.logic';
import {
  awayTeamName,
  DEFAULT_ROUND_LIMIT_MS,
  displayRoundMs,
  formatTimerLabel,
  goalScorerOptions,
  homeTeamName,
  rotationPolicyLabel,
} from './campo-view.logic';
import type { MatchDrawTeamDto } from '../../core/match/match-draw-api.model';
import { LiveRefreshService } from '../../core/live/live-refresh';
import { PeladaRosterService } from '../../core/roster/pelada-roster.service';
import type { ActivePelada } from '../../core/pelada/active-pelada.model';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaCardComponent } from '../../ui/card.component';
import { PeladaProgressComponent } from '../../ui/progress.component';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

const DEFAULT_ROUND_MS = 20 * 60 * 1000;

@Component({
  selector: 'app-campo-partida',
  standalone: true,
  imports: [
    CommonModule,
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
        [title]="headerTitle()"
        subtitle="Placar, cronômetro e rodízio."
      />

      <nav class="partida-tabs" aria-label="Abas da partida">
        <a [routerLink]="presencaPath" routerLinkActive="active">Presença</a>
        <a routerLink="/partida/sorteio" routerLinkActive="active">Sorteio</a>
        <a routerLink="/partida/campo" routerLinkActive="active">Em campo</a>
        <a routerLink="/partida/resumo" routerLinkActive="active">Resumo</a>
      </nav>

      @if (loading()) {
        <p class="pelada-muted">Carregando…</p>
      } @else if (!matchId()) {
        <pelada-card title="Nenhuma partida ativa">
          <p class="pelada-muted">Crie uma partida no Início para ir a campo.</p>
          <a routerLink="/inicio/criar-partida" peladaButton [peladaButtonBlock]="true">
            Criar partida
          </a>
        </pelada-card>
      } @else if (!listClosed()) {
        <pelada-card title="Lista ainda aberta">
          <p class="pelada-muted">Feche a lista e sorteie antes de entrar em campo.</p>
          <a [routerLink]="presencaPath" peladaButton variant="lime" [peladaButtonBlock]="true">
            Ir à presença
          </a>
        </pelada-card>
      } @else if (!hasDraw()) {
        <pelada-card title="Sorteio pendente">
          <p class="pelada-muted">Rode o sorteio para liberar o placar em campo.</p>
          <a routerLink="/partida/sorteio" peladaButton variant="lime" [peladaButtonBlock]="true">
            Ir ao sorteio
          </a>
        </pelada-card>
      } @else {
        @if (actionError()) {
          <p class="pelada-error" role="alert">{{ actionError() }}</p>
        }

        @if (fieldSession(); as s) {
          <p class="round-eyebrow pelada-muted">
            Rodada {{ s.roundNumber }} · {{ rotationLabel(s.rotationPolicy) }}
            @if (s.finishedAt) {
              · Encerrada
            }
          </p>

          <div class="scoreboard">
            <div class="score-team">
              <span class="team-name">{{ homeTeamName(s) }}</span>
              <span class="score-number">{{ s.scoreHome }}</span>
            </div>
            <span class="score-sep" aria-hidden="true">×</span>
            <div class="score-team">
              <span class="team-name">{{ awayTeamName(s) }}</span>
              <span class="score-number">{{ s.scoreAway }}</span>
            </div>
          </div>

          <p class="timer" aria-live="polite">{{ timerLabel() }}</p>
          <p class="pelada-muted timer-limit">
            de {{ limitLabel() }}
            @if (timeUp()) {
              · <strong class="time-up">Tempo esgotado — encerre a rodada</strong>
            }
          </p>
          <pelada-progress [value]="timerPercent()" />

          @if (s.restingTeams.length > 0) {
            <pelada-card title="Descansando">
              <ul class="rest-list">
                @for (t of s.restingTeams; track t.drawTeamId) {
                  <li>{{ t.name }}</li>
                }
              </ul>
            </pelada-card>
          }

          @if (gkHint()) {
            <p class="pelada-muted gk-hint" role="status">{{ gkHint() }}</p>
          }

          @if (isOrganizador() && !s.finishedAt) {
            <div class="campo-actions">
              <button
                type="button"
                peladaButton
                variant="lime"
                [peladaButtonBlock]="true"
                [disabled]="busy()"
                (click)="addGoal('HOME')"
              >
                +1 {{ homeTeamName(s) }}
              </button>
              <button
                type="button"
                peladaButton
                variant="lime"
                [peladaButtonBlock]="true"
                [disabled]="busy()"
                (click)="addGoal('AWAY')"
              >
                +1 {{ awayTeamName(s) }}
              </button>
              <button
                type="button"
                peladaButton
                variant="secondary"
                [peladaButtonBlock]="true"
                [disabled]="busy() || timeUp()"
                (click)="toggleTimer()"
              >
                {{
                  s.timerRunning && !timeUp() ? 'Pausar cronômetro' : 'Iniciar cronômetro'
                }}
              </button>
              <button
                type="button"
                peladaButton
                variant="secondary"
                [peladaButtonBlock]="true"
                [disabled]="busy()"
                (click)="undoGoal()"
              >
                Desfazer último gol
              </button>
              <button
                type="button"
                peladaButton
                variant="secondary"
                [peladaButtonBlock]="true"
                [disabled]="busy()"
                (click)="requestEndRound()"
              >
                Encerrar jogo e rodízio
              </button>
              <button
                type="button"
                peladaButton
                variant="secondary"
                [peladaButtonBlock]="true"
                [disabled]="busy()"
                (click)="requestFinishMatch()"
              >
                Encerrar partida
              </button>
            </div>
          } @else if (s.finishedAt) {
            <a
              routerLink="/partida/resumo"
              [queryParams]="{ matchId: matchId() }"
              peladaButton
              variant="lime"
              [peladaButtonBlock]="true"
            >
              Ver resumo do dia
            </a>
          } @else if (!isOrganizador()) {
            <p class="pelada-muted">Somente o organizador altera placar e cronômetro.</p>
          }
        } @else if (isOrganizador()) {
          <pelada-card title="Pronto para entrar em campo">
            <p class="pelada-muted">
              Inicia a sessão com os dois primeiros times do sorteio e a política de
              rodízio da pelada.
            </p>
            <button
              type="button"
              peladaButton
              variant="lime"
              [peladaButtonBlock]="true"
              [disabled]="busy()"
              (click)="startField()"
            >
              Iniciar jogo em campo
            </button>
          </pelada-card>
        } @else {
          <pelada-card title="Aguardando organizador">
            <p class="pelada-muted">
              O organizador ainda não iniciou o jogo em campo.
            </p>
          </pelada-card>
        }
      }

      @if (goalSide(); as side) {
        <div
          class="confirm-modal-backdrop"
          role="presentation"
          (click)="cancelGoal()"
        >
          <div
            class="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="goal-modal-title"
            (click)="$event.stopPropagation()"
            (keydown.escape)="cancelGoal()"
          >
            <h2 id="goal-modal-title" class="confirm-modal__title">
              Quem fez o gol do {{ goalTeamName() }}?
            </h2>
            <div class="confirm-modal__actions goal-scorers">
              @for (p of goalScorers(); track p.playerId) {
                <button
                  type="button"
                  peladaButton
                  variant="secondary"
                  [peladaButtonBlock]="true"
                  [disabled]="busy()"
                  (click)="confirmGoal(p.playerId)"
                >
                  {{ p.name }}
                </button>
              }
              <button
                type="button"
                peladaButton
                variant="ghost"
                [peladaButtonBlock]="true"
                [disabled]="busy()"
                (click)="confirmGoal(null)"
              >
                Gol contra / sem autor
              </button>
              <button
                type="button"
                peladaButton
                variant="ghost"
                [peladaButtonBlock]="true"
                (click)="cancelGoal()"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      }

      @if (confirmAction()) {
        <div
          class="confirm-modal-backdrop"
          role="presentation"
          (click)="cancelConfirm()"
        >
          <div
            class="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            (click)="$event.stopPropagation()"
            (keydown.escape)="cancelConfirm()"
          >
            <h2 id="confirm-modal-title" class="confirm-modal__title">
              {{ confirmModalTitle() }}
            </h2>
            <p class="confirm-modal__lead pelada-muted">
              {{ confirmModalMessage() }}
            </p>
            <div class="confirm-modal__actions">
              <button
                type="button"
                peladaButton
                variant="lime"
                [peladaButtonBlock]="true"
                (click)="confirmPendingAction()"
              >
                Confirmar
              </button>
              <button
                type="button"
                peladaButton
                variant="secondary"
                [peladaButtonBlock]="true"
                (click)="cancelConfirm()"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .confirm-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: var(--pelada-space-4);
        background: rgba(0, 0, 0, 0.45);
      }
      .confirm-modal {
        width: min(100%, 390px);
        padding: var(--pelada-space-4);
        border-radius: var(--pelada-radius-lg) var(--pelada-radius-lg) 0 0;
        background: var(--pelada-paper);
        box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.12);
      }
      .confirm-modal__title {
        margin: 0 0 var(--pelada-space-2);
        font-size: 1.125rem;
      }
      .confirm-modal__lead {
        margin: 0 0 var(--pelada-space-3);
        font-size: 0.875rem;
      }
      .confirm-modal__actions {
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-2);
      }
      .goal-scorers {
        max-height: 60vh;
        overflow-y: auto;
      }
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
      .round-eyebrow {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
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
        gap: var(--pelada-space-2);
      }
      .team-name {
        font-weight: 700;
        font-size: 0.9375rem;
      }
      .score-number {
        font-size: 2.5rem;
        font-weight: 800;
        line-height: 1;
      }
      .score-sep {
        font-size: 1.5rem;
        color: var(--pelada-muted);
      }
      .timer-limit {
        text-align: center;
        margin: 0 0 var(--pelada-space-2);
        font-size: 0.8125rem;
      }
      .time-up {
        color: #b91c1c;
      }
      .timer {
        text-align: center;
        font-size: 2rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
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
        margin: var(--pelada-space-2) 0 0;
        font-size: 0.8125rem;
      }
      .gk-hint {
        font-size: 0.8125rem;
        margin-bottom: var(--pelada-space-3);
      }
      .campo-actions {
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-2);
      }
      .pelada-error {
        color: #b91c1c;
        font-size: 0.875rem;
        margin-bottom: var(--pelada-space-3);
      }
    `,
  ],
})
export class CampoPartidaComponent implements OnInit {
  readonly presencaPath = PARTIDA_PRESENCA_PATH;

  private readonly peladaContext = inject(PeladaContextService);
  private readonly orgContext = inject(PeladaOrganizadorContextService);
  private readonly session = inject(PresenceSessionService);
  private readonly dashboardService = inject(PeladaDashboardService);
  private readonly fieldApi = inject(MatchFieldSessionService);
  private readonly drawApi = inject(MatchDrawService);
  private readonly live = inject(LiveRefreshService);
  private readonly rosterService = inject(PeladaRosterService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly matchId = signal<string | null>(null);
  readonly listClosed = signal(false);
  readonly hasDraw = signal(false);
  readonly fieldSession = signal<MatchFieldSessionDto | null>(null);
  readonly actionError = signal<string | null>(null);
  /** Issue #191 — confirmação antes de ação difícil de desfazer. */
  readonly confirmAction = signal<'endRound' | 'finishMatch' | null>(null);
  /** Issue #214 — lado do gol esperando a escolha do autor. */
  readonly goalSide = signal<'HOME' | 'AWAY' | null>(null);
  private readonly drawTeams = signal<MatchDrawTeamDto[]>([]);
  private readonly playerNames = signal<ReadonlyMap<string, string>>(new Map());

  readonly goalScorers = computed(() => {
    const s = this.fieldSession();
    const side = this.goalSide();
    if (!s || !side) {
      return [];
    }
    return goalScorerOptions(s, side, this.drawTeams(), this.playerNames());
  });

  readonly goalTeamName = computed(() => {
    const s = this.fieldSession();
    if (!s) {
      return '';
    }
    return this.goalSide() === 'AWAY' ? awayTeamName(s) : homeTeamName(s);
  });
  private readonly tickMs = signal(Date.now());
  /** Instante em que `fieldSession` foi recebido da API (anchor do cronômetro). */
  private readonly sessionElapsedAnchorMs = signal(Date.now());

  readonly headerTitle = computed(() => {
    const pelada = this.peladaContext.getActivePelada();
    return pelada?.name ?? 'Em campo';
  });

  readonly confirmModalTitle = computed(() =>
    this.confirmAction() === 'finishMatch'
      ? 'Encerrar partida?'
      : 'Encerrar jogo e rodízio?',
  );

  readonly confirmModalMessage = computed(() =>
    this.confirmAction() === 'finishMatch'
      ? 'A partida será encerrada e não dá para voltar atrás. Confirma?'
      : 'O jogo atual termina e o rodízio avança para as próximas duplas. Confirma?',
  );

  readonly isOrganizador = computed(() => {
    const pelada = this.peladaContext.getActivePelada();
    return pelada ? this.orgContext.isOrganizador(pelada.id) : false;
  });

  /** Issue #229 — cronômetro da rodada atual, parando no tempo das Regras. */
  private readonly roundMs = computed(() => {
    const s = this.fieldSession();
    return s ? displayRoundMs(s, this.tickMs(), this.sessionElapsedAnchorMs()) : 0;
  });

  private readonly roundLimitMs = computed(
    () => this.fieldSession()?.roundLimitMs ?? DEFAULT_ROUND_LIMIT_MS,
  );

  readonly timerLabel = computed(() => formatTimerLabel(this.roundMs()));

  readonly limitLabel = computed(() => formatTimerLabel(this.roundLimitMs()));

  readonly timeUp = computed(
    () => !!this.fieldSession() && this.roundMs() >= this.roundLimitMs(),
  );

  readonly timerPercent = computed(() =>
    Math.min(100, Math.round((this.roundMs() / this.roundLimitMs()) * 100)),
  );

  readonly gkHint = computed(() => {
    const meta = this.fieldSession()?.fixedGkMeta ?? {};
    const sort = meta['gkTeamSortOrder'];
    if (typeof sort !== 'number') {
      return null;
    }
    const team = this.fieldSession()?.teamsOnField.find(
      (t) => t.sortOrder === sort,
    );
    const name =
      team?.name ??
      this.fieldSession()?.restingTeams.find((t) => t.sortOrder === sort)?.name;
    return name
      ? `Goleiro fixo acompanha o resultado — lado atual: ${name}`
      : null;
  });

  readonly rotationLabel = rotationPolicyLabel;
  readonly homeTeamName = homeTeamName;
  readonly awayTeamName = awayTeamName;

  ngOnInit(): void {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.tickMs.set(Date.now()));

    // Issue #233 — placar, rodada e cronômetro se atualizam sozinhos pra todos.
    // Não atualiza no meio de uma ação nem com a pergunta/confirmação aberta.
    this.live.start(this.destroyRef, () => {
      if (!this.busy() && !this.goalSide() && !this.confirmAction()) {
        this.resyncFieldSessionQuietly();
      }
    });

    const onVisibility = () => {
      if (this.document.visibilityState === 'visible') {
        this.onPageBecameVisible();
      }
    };
    this.document.addEventListener('visibilitychange', onVisibility);
    this.destroyRef.onDestroy(() =>
      this.document.removeEventListener('visibilitychange', onVisibility),
    );

    const pelada = this.peladaContext.getActivePelada();
    if (!pelada) {
      this.loading.set(false);
      return;
    }
    this.orgContext.refreshMembership(pelada.id);
    this.loadPlayerNames(pelada);
    this.dashboardService.loadDashboard(pelada, (dash) => {
      const matchId =
        dash.nextMatch?.matchId ??
        this.session.resolveMatchIdWithClosedList() ??
        this.session.getActiveMatchId();
      if (!matchId) {
        this.matchId.set(null);
        this.loading.set(false);
        return;
      }
      this.matchId.set(matchId);
      this.session.setActiveMatchId(matchId);
      const snap = this.session.load(matchId);
      this.listClosed.set(snap?.listClosed ?? true);

      this.drawApi.getDraw(pelada.id, matchId).subscribe({
        next: (draw) => {
          this.drawTeams.set(draw?.teams ?? []);
          this.hasDraw.set(true);
          this.loadFieldSession();
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 404) {
            this.hasDraw.set(false);
          }
          this.loading.set(false);
        },
      });
    });
  }

  startField(): void {
    this.runMutation((peladaId, matchId) =>
      this.fieldApi.startSession(peladaId, matchId, {}),
    );
  }

  toggleTimer(): void {
    const s = this.fieldSession();
    if (!s) {
      return;
    }
    this.runMutation((peladaId, matchId) =>
      this.fieldApi.patchSession(peladaId, matchId, {
        timer: s.timerRunning ? 'pause' : 'start',
      }),
    );
  }

  /** Issue #214 — antes de marcar, pergunta quem fez o gol. */
  addGoal(side: 'HOME' | 'AWAY'): void {
    this.goalSide.set(side);
  }

  cancelGoal(): void {
    this.goalSide.set(null);
  }

  confirmGoal(playerId: string | null): void {
    const side = this.goalSide();
    if (!side) {
      return;
    }
    this.goalSide.set(null);
    this.runMutation((peladaId, matchId) =>
      this.fieldApi.patchSession(peladaId, matchId, {
        addGoal: side,
        ...(playerId ? { goalPlayerId: playerId } : {}),
      }),
    );
  }

  undoGoal(): void {
    this.runMutation((peladaId, matchId) =>
      this.fieldApi.patchSession(peladaId, matchId, { undoGoal: true }),
    );
  }

  requestEndRound(): void {
    this.confirmAction.set('endRound');
  }

  requestFinishMatch(): void {
    this.confirmAction.set('finishMatch');
  }

  cancelConfirm(): void {
    this.confirmAction.set(null);
  }

  confirmPendingAction(): void {
    const action = this.confirmAction();
    this.confirmAction.set(null);
    if (action === 'endRound') {
      this.endRound();
    } else if (action === 'finishMatch') {
      this.finishMatch();
    }
  }

  private endRound(): void {
    this.runMutation((peladaId, matchId) =>
      this.fieldApi.endRound(peladaId, matchId),
    );
  }

  private finishMatch(): void {
    this.runMutation((peladaId, matchId) =>
      this.fieldApi.finish(peladaId, matchId),
    );
  }

  /** Nomes do elenco + convidados, pra listar quem fez o gol (issue #214). */
  private loadPlayerNames(pelada: ActivePelada): void {
    this.rosterService.loadRoster(pelada, (players) => {
      this.rosterService.loadGuests(pelada, (guests) => {
        this.playerNames.set(
          new Map([...players, ...guests].map((p) => [p.id, p.displayName])),
        );
      });
    });
  }

  private applySessionFromApi(session: MatchFieldSessionDto): void {
    this.fieldSession.set(session);
    this.sessionElapsedAnchorMs.set(Date.now());
  }

  private onPageBecameVisible(): void {
    const now = Date.now();
    this.tickMs.set(catchUpTickMsOnPageVisible(now));
    if (shouldResyncFieldSessionOnVisible(this.fieldSession())) {
      this.resyncFieldSessionQuietly();
    }
  }

  private resyncFieldSessionQuietly(): void {
    const pelada = this.peladaContext.getActivePelada();
    const matchId = this.matchId();
    if (!pelada || !matchId) {
      return;
    }
    this.fieldApi.getSession(pelada.id, matchId).subscribe({
      next: (s) => this.applySessionFromApi(s),
      error: () => {
        /* mantém estado local; próximo tick já corrigiu o relógio */
      },
    });
  }

  private loadFieldSession(): void {
    const pelada = this.peladaContext.getActivePelada();
    const matchId = this.matchId();
    if (!pelada || !matchId) {
      this.loading.set(false);
      return;
    }
    this.fieldApi.getSession(pelada.id, matchId).subscribe({
      next: (s) => {
        this.applySessionFromApi(s);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status !== 404) {
          this.actionError.set('Não foi possível carregar o jogo em campo.');
        }
        this.loading.set(false);
      },
    });
  }

  private runMutation(
    call: (
      peladaId: string,
      matchId: string,
    ) => ReturnType<MatchFieldSessionService['patchSession']>,
  ): void {
    const pelada = this.peladaContext.getActivePelada();
    const matchId = this.matchId();
    if (!pelada || !matchId || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.actionError.set(null);
    call(pelada.id, matchId).subscribe({
      next: (s) => {
        this.applySessionFromApi(s);
        this.busy.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.actionError.set(apiErrorMessage(err));
      },
    });
  }
}

function apiErrorMessage(err: HttpErrorResponse): string {
  const body = err.error as { message?: string } | undefined;
  if (typeof body?.message === 'string' && body.message.length > 0) {
    return body.message;
  }
  return 'Ação não concluída. Tente novamente.';
}
