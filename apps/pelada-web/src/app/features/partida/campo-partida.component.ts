import { CommonModule } from '@angular/common';
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
  awayTeamName,
  displayElapsedMs,
  formatTimerLabel,
  homeTeamName,
  rotationPolicyLabel,
} from './campo-view.logic';
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
        subtitle="Placar, cronômetro e rodízio (§3.6)."
      />

      <nav class="partida-tabs" aria-label="Abas da partida">
        <a [routerLink]="presencaPath" routerLinkActive="active">Presença</a>
        <a routerLink="/partida/sorteio" routerLinkActive="active">Sorteio</a>
        <a routerLink="/partida/campo" routerLinkActive="active">Em campo</a>
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
          <pelada-progress [value]="timerPercent()" />

          @if (s.restingTeams.length > 0) {
            <pelada-card title="Descansando">
              <ul class="rest-list">
                @for (t of s.restingTeams; track t.drawTeamId) {
                  <li>{{ t.name }}</li>
                }
              </ul>
              @if (nextRestHint()) {
                <p class="pelada-muted rest-hint">{{ nextRestHint() }}</p>
              }
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
                [disabled]="busy()"
                (click)="toggleTimer()"
              >
                {{
                  s.timerRunning ? 'Pausar cronômetro' : 'Iniciar cronômetro'
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
                (click)="endRound()"
              >
                Encerrar jogo e rodízio
              </button>
              <button
                type="button"
                peladaButton
                variant="secondary"
                [peladaButtonBlock]="true"
                [disabled]="busy()"
                (click)="finishMatch()"
              >
                Encerrar partida
              </button>
            </div>
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
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly matchId = signal<string | null>(null);
  readonly listClosed = signal(false);
  readonly hasDraw = signal(false);
  readonly fieldSession = signal<MatchFieldSessionDto | null>(null);
  readonly actionError = signal<string | null>(null);
  private readonly tickMs = signal(Date.now());

  readonly headerTitle = computed(() => {
    const pelada = this.peladaContext.getActivePelada();
    return pelada?.name ?? 'Em campo';
  });

  readonly isOrganizador = computed(() => {
    const pelada = this.peladaContext.getActivePelada();
    return pelada ? this.orgContext.isOrganizador(pelada.id) : false;
  });

  readonly timerLabel = computed(() => {
    const s = this.fieldSession();
    if (!s) {
      return '00:00';
    }
    return formatTimerLabel(displayElapsedMs(s, this.tickMs()));
  });

  readonly timerPercent = computed(() => {
    const s = this.fieldSession();
    if (!s) {
      return 0;
    }
    const ms = displayElapsedMs(s, this.tickMs());
    return Math.min(100, Math.round((ms / DEFAULT_ROUND_MS) * 100));
  });

  readonly nextRestHint = computed(() => {
    const s = this.fieldSession();
    if (!s || s.restingTeams.length === 0) {
      return null;
    }
    const first = s.restingTeams[0]?.name;
    return first ? `Próximo a entrar: ${first}` : null;
  });

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
      const snap = this.session.load(match.matchId);
      this.listClosed.set(snap?.listClosed ?? false);

      this.drawApi.getDraw(pelada.id, match.matchId).subscribe({
        next: () => {
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

  addGoal(side: 'HOME' | 'AWAY'): void {
    this.runMutation((peladaId, matchId) =>
      this.fieldApi.patchSession(peladaId, matchId, { addGoal: side }),
    );
  }

  undoGoal(): void {
    this.runMutation((peladaId, matchId) =>
      this.fieldApi.patchSession(peladaId, matchId, { undoGoal: true }),
    );
  }

  endRound(): void {
    this.runMutation((peladaId, matchId) =>
      this.fieldApi.endRound(peladaId, matchId),
    );
  }

  finishMatch(): void {
    this.runMutation((peladaId, matchId) =>
      this.fieldApi.finish(peladaId, matchId),
    );
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
        this.fieldSession.set(s);
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
        this.fieldSession.set(s);
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
