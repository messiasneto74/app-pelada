import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, DestroyRef, inject, model, OnInit, signal } from '@angular/core';
import { LiveRefreshService } from '../../core/live/live-refresh';
import { Router, RouterLink } from '@angular/router';
import type { SuggestFormatResult } from '@pelada/core';
import { PARTIDA_SORTEIO_PATH } from '../../core/presence/partida-sorteio-route';
import {
  normalizePresenceMode,
  type MatchPresenceMode,
} from '../../core/match/create-match-form.logic';
import type { InicioDashboardView } from '../../core/inicio/inicio-dashboard.model';
import { PeladaDashboardService } from '../../core/inicio/pelada-dashboard.service';
import { AuthService } from '../../auth/auth.service';
import {
  canOrganizerEditPresence,
  canPlayerSelfEdit,
  presenceModeHint,
  resolveSelfPlayerId,
  rowPrimaryActionLabel,
  selfActionLabels,
  selfFooterActions,
  selfStatusLine,
} from '../../core/presence/presence-action.logic';
import type { PresenceSegment } from '../../core/presence/presence-attendance.model';
import {
  assemblePresenceRows,
  buildInitialStatusMap,
  dashboardConfirmedIdsForSeed,
  extraPlayersFromRows,
  filterPresenceBySegment,
  orgTogglePlayer,
  presenceCounts,
  presenceFromAttendance,
  resolveGuest,
  selfSetPlayerStatus,
  segmentOptionsWithCounts,
  sortRowsByQueueOrder,
  buildPresenceSheet,
  playersOutOfList,
  statusChipLabel,
  vacancyFillPercent,
  vacancySummary,
} from '../../core/presence/presence-list.logic';
import type {
  PlayerPresenceStatus,
  PresenceRow,
} from '../../core/presence/presence-attendance.model';
import type { Observable } from 'rxjs';
import { catchError, concat, concatMap, defer, last, map, of, Subject, switchMap, tap } from 'rxjs';
import { PresenceSessionService } from '../../core/presence/presence-session.service';
import { evaluateFormatBeforeClose } from '../../core/presence/presence-format-suggest.logic';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import type { MatchAttendanceListApiDto } from '../../core/match/pelada-match-attendance.service';
import {
  DEFAULT_PELADA_RULES,
  type PeladaRulesFormValues,
} from '../../core/pelada/pelada-rules.model';
import { PeladaRulesApiService } from '../../core/pelada/pelada-rules-api.service';
import type { PeladaRulesApiDto } from '../../core/pelada/pelada-rules-api.mapper';
import { PeladaRulesService } from '../../core/pelada/pelada-rules.service';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import {
  formatRosterRating,
  rosterPositionLabel,
} from '../../core/roster/roster-list.logic';
import { PeladaRosterService } from '../../core/roster/pelada-roster.service';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import { PeladaMatchAttendanceService } from '../../core/match/pelada-match-attendance.service';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaCardComponent } from '../../ui/card.component';
import { PeladaProgressComponent } from '../../ui/progress.component';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

@Component({
  selector: 'app-presenca-partida',
  standalone: true,
  imports: [
    RouterLink,
    ScreenHeaderComponent,
    PeladaCardComponent,
    PeladaProgressComponent,
    PeladaButtonComponent,
    NgTemplateOutlet,
  ],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Partida"
        [title]="headerTitle()"
        subtitle="Lista de presença, fila e convidados."
      />

      <nav class="partida-tabs" aria-label="Abas da partida">
        <a routerLink="/partida/presenca" routerLinkActive="active">Presença</a>
        <a routerLink="/partida/sorteio" routerLinkActive="active">Sorteio</a>
        <a routerLink="/partida/campo" routerLinkActive="active">Em campo</a>
        <a routerLink="/partida/resumo" routerLinkActive="active">Resumo</a>
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

        <!-- Issue #234 — lista de presença numerada, igual no grupo do WhatsApp. -->
        @if (listError()) {
          <p class="list-error" role="alert">{{ listError() }}</p>
        }
        <section class="sheet" aria-label="Lista de presença">
          @if (sheet().goalkeepers.length > 0) {
            <h2 class="sheet__title">Goleiros</h2>
            <ol class="sheet__list">
              @for (slot of sheet().goalkeepers; track slot.label) {
                <ng-container *ngTemplateOutlet="slotTpl; context: { $implicit: slot }" />
              }
            </ol>
          }
          <h2 class="sheet__title">Jogadores de linha</h2>
          <ol class="sheet__list">
            @for (slot of sheet().field; track slot.label) {
              <ng-container *ngTemplateOutlet="slotTpl; context: { $implicit: slot }" />
            }
          </ol>
          @if (sheet().waitlist.length > 0) {
            <h2 class="sheet__title">Lista de espera</h2>
            <ol class="sheet__list">
              @for (slot of sheet().waitlist; track slot.label) {
                <ng-container *ngTemplateOutlet="slotTpl; context: { $implicit: slot }" />
              }
            </ol>
          }
        </section>

        <ng-template #slotTpl let-slot>
          <li class="slot" [class.slot--empty]="!slot.row">
            <span class="slot__n">{{ slot.label }}</span>
            @if (slot.row; as row) {
              @if (row.kind === 'player') {
                <span class="slot__name">
                  {{ row.player.displayName }}
                  @if (row.player.isGuest) {
                    <span class="pelada-muted slot__tag">convidado</span>
                  }
                  @if (row.player.id === selfPlayerId()) {
                    <span class="slot__me">você</span>
                  }
                </span>
                @if (showOrgActions(row)) {
                  <button
                    type="button"
                    class="slot__remove"
                    [attr.aria-label]="'Tirar ' + row.player.displayName + ' da lista'"
                    (click)="onOrgToggle(row.player.id)"
                  >
                    ✗
                  </button>
                }
              }
            }
          </li>
        </ng-template>

        @if (isOrganizador() && canOrganizerEdit()) {
          <button
            type="button"
            peladaButton
            variant="secondary"
            [peladaButtonBlock]="true"
            class="add-btn"
            (click)="addOpen.set(true)"
          >
            Colocar jogador na lista
          </button>
        }

        @if (addOpen()) {
          <div class="format-modal-backdrop" role="presentation" (click)="addOpen.set(false)">
            <div
              class="format-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-title"
              (click)="$event.stopPropagation()"
              (keydown.escape)="addOpen.set(false)"
            >
              <h2 id="add-title" class="format-modal__title">Colocar na lista</h2>
              @if (outOfList().length === 0) {
                <p class="pelada-muted">Todo mundo do elenco já está na lista.</p>
              } @else {
                <ul class="add-list">
                  @for (row of outOfList(); track rowTrack(row)) {
                    @if (row.kind === 'player') {
                      <li class="add-item">
                        <span>
                          {{ row.player.displayName }}
                          @if (openCharges().has(row.player.id)) {
                            <span class="lock-tag">🔒 cobrança em aberto</span>
                          }
                        </span>
                        <button
                          type="button"
                          peladaButton
                          variant="lime"
                          [disabled]="openCharges().has(row.player.id)"
                          (click)="onOrgToggle(row.player.id)"
                        >
                          Colocar
                        </button>
                      </li>
                    }
                  }
                </ul>
              }
              <button
                type="button"
                peladaButton
                variant="secondary"
                [peladaButtonBlock]="true"
                (click)="addOpen.set(false)"
              >
                Pronto
              </button>
            </div>
          </div>
        }

        @if (guestRequests().length > 0 && isOrganizador() && canOrganizerEdit()) {
          <pelada-card title="Pedidos de convidado">
            <ul class="add-list">
              @for (row of guestRequests(); track rowTrack(row)) {
                @if (row.kind === 'guest') {
                  <li class="add-item">
                    <span>{{ row.displayName }}</span>
                    <span class="guest-actions">
                      <button type="button" peladaButton variant="lime" (click)="onGuest(true, row.guestId)">Aceitar</button>
                      <button type="button" peladaButton variant="secondary" (click)="onGuest(false, row.guestId)">Recusar</button>
                    </span>
                  </li>
                }
              }
            </ul>
          </pelada-card>
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
            (click)="attemptCloseListAndDraw()"
          >
            Fechar lista e sortear
          </button>
        }

        <!-- Issue #263 — travado por cobrança em aberto. -->
        @if (selfLockMessage(); as lockMsg) {
          <div class="self-footer self-footer--locked" role="status">
            <p class="self-footer__status">🔒 {{ lockMsg }}</p>
          </div>
        }
        <!-- Issue #234 — botão do jogador fixo no rodapé. -->
        @if (footerActions().length > 0) {
          <div class="self-footer">
            <p class="self-footer__status">{{ footerStatus() }}</p>
            <div class="self-footer__actions">
              @for (a of footerActions(); track a.label) {
                <button
                  type="button"
                  peladaButton
                  [variant]="a.variant"
                  (click)="onSelfPresence(selfPlayerId()!, a.accept)"
                >
                  {{ a.label }}
                </button>
              }
            </div>
          </div>
        }

        @if (formatModalOpen() && formatSuggestion(); as hint) {
          <div
            class="format-modal-backdrop"
            role="presentation"
            (click)="cancelFormatModal()"
          >
            <div
              class="format-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="format-modal-title"
              (click)="$event.stopPropagation()"
              (keydown.escape)="cancelFormatModal()"
            >
              <h2 id="format-modal-title" class="format-modal__title">
                Confirmados ≠ capacidade ideal
              </h2>
              <p class="format-modal__lead pelada-muted">
                {{ hint.playerCount }} confirmados · ideal {{ hint.idealCapacity }} vagas.
                @if (hint.delta < 0) {
                  Faltam {{ absDelta(hint.delta) }} para a capacidade configurada.
                } @else {
                  {{ hint.delta }} acima da capacidade ideal.
                }
              </p>
              <ul class="format-modal__options">
                @for (opt of hint.options; track opt.id) {
                  <li>
                    <strong>{{ opt.title }}</strong>
                    <span class="pelada-muted">{{ opt.detail }}</span>
                  </li>
                }
              </ul>
              <div class="format-modal__actions">
                <button
                  type="button"
                  peladaButton
                  variant="lime"
                  [peladaButtonBlock]="true"
                  (click)="confirmCloseDespiteFormat()"
                >
                  Fechar lista e sortear assim
                </button>
                <a
                  routerLink="/inicio/regras"
                  peladaButton
                  variant="secondary"
                  [peladaButtonBlock]="true"
                  (click)="cancelFormatModal()"
                >
                  Ajustar regras
                </a>
                <button
                  type="button"
                  peladaButton
                  variant="secondary"
                  [peladaButtonBlock]="true"
                  (click)="cancelFormatModal()"
                >
                  Voltar à lista
                </button>
              </div>
            </div>
          </div>
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
      .sheet {
        margin-bottom: var(--pelada-space-4);
      }
      .sheet__title {
        margin: var(--pelada-space-4) 0 var(--pelada-space-2);
        font-size: 0.8125rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .sheet__list {
        list-style: none;
        margin: 0;
        padding: 0;
        border: 1px solid var(--pelada-line);
        border-radius: var(--pelada-radius-md);
        background: var(--pelada-paper);
      }
      .slot {
        display: flex;
        align-items: center;
        gap: var(--pelada-space-2);
        min-height: 40px;
        padding: 4px var(--pelada-space-3);
        border-bottom: 1px solid var(--pelada-line);
      }
      .slot:last-child {
        border-bottom: none;
      }
      .slot__n {
        width: 2.25rem;
        font-variant-numeric: tabular-nums;
        font-weight: 700;
        color: var(--pelada-muted);
      }
      .slot--empty .slot__n {
        opacity: 0.6;
      }
      .slot__name {
        flex: 1;
        font-weight: 600;
      }
      .slot__tag,
      .slot__me {
        margin-left: 6px;
        font-size: 0.6875rem;
        font-weight: 600;
      }
      .slot__me {
        color: #486f36;
      }
      .slot__remove {
        min-width: var(--pelada-touch-min);
        min-height: var(--pelada-touch-min);
        border: none;
        background: none;
        color: #b91c1c;
        font-size: 1.125rem;
        cursor: pointer;
      }
      .add-btn {
        margin-bottom: var(--pelada-space-3);
      }
      .add-list {
        list-style: none;
        margin: 0 0 var(--pelada-space-3);
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-2);
      }
      .add-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--pelada-space-2);
      }
      .guest-actions {
        display: flex;
        gap: var(--pelada-space-2);
      }
      .list-error {
        color: #b91c1c;
        font-size: 0.875rem;
        font-weight: 600;
      }
      .self-footer {
        position: sticky;
        bottom: calc(70px + env(safe-area-inset-bottom, 0px) + var(--pelada-space-2));
        z-index: 5;
        margin-top: var(--pelada-space-4);
        padding: var(--pelada-space-3);
        border: 1px solid #c5d9a8;
        border-radius: var(--pelada-radius-md);
        background: #f0f5e6;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      }
      .self-footer__status {
        margin: 0 0 var(--pelada-space-2);
        font-size: 0.875rem;
        font-weight: 600;
      }
      .self-footer--locked {
        background: #fff7ed;
        border-color: #fed7aa;
      }
      .lock-tag {
        margin-left: 6px;
        font-size: 0.75rem;
        font-weight: 600;
        color: #c2410c;
      }
      .self-footer__actions {
        display: flex;
        gap: var(--pelada-space-2);
      }
      .self-footer__actions button {
        flex: 1;
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
      .format-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: rgba(15, 35, 28, 0.55);
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: var(--pelada-space-4);
      }
      .format-modal {
        width: min(100%, 390px);
        max-height: min(85vh, 640px);
        overflow-y: auto;
        background: var(--pelada-paper);
        border-radius: var(--pelada-radius-lg) var(--pelada-radius-lg) 0 0;
        padding: var(--pelada-space-4);
        box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.12);
      }
      .format-modal__title {
        margin: 0 0 var(--pelada-space-2);
        font-size: 1.125rem;
      }
      .format-modal__lead {
        margin: 0 0 var(--pelada-space-3);
        font-size: 0.875rem;
      }
      .format-modal__options {
        list-style: none;
        margin: 0 0 var(--pelada-space-4);
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-3);
      }
      .format-modal__options li {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: var(--pelada-space-3);
        border: 1px solid var(--pelada-line);
        border-radius: var(--pelada-radius-md);
      }
      .format-modal__actions {
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-2);
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
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly rulesService = inject(PeladaRulesService);
  private readonly rulesApi = inject(PeladaRulesApiService);
  private readonly attendanceApi = inject(PeladaMatchAttendanceService);

  readonly loading = signal(true);
  readonly rosterLoadFailed = signal(false);
  readonly currentAppUserId = signal<string | null>(null);
  readonly matchId = signal<string | null>(null);
  readonly capacity = signal(14);
  readonly listClosed = signal(false);
  readonly presenceMode = signal<MatchPresenceMode>('ORGANIZER_CLOSES');
  readonly roster = signal<RosterPlayer[]>([]);
  readonly rows = signal<PresenceRow[]>([]);
  readonly queueOrder = signal<string[]>([]);
  readonly segment = model<PresenceSegment>('confirmed');
  readonly formatRules = signal<PeladaRulesFormValues>({ ...DEFAULT_PELADA_RULES });
  readonly formatModalOpen = signal(false);
  readonly formatSuggestion = signal<SuggestFormatResult | null>(null);

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

  /** Issue #234 — quando cada jogador entrou (ordem da lista numerada). */
  readonly changedAt = signal<Map<string, string>>(new Map());
  readonly addOpen = signal(false);
  readonly listError = signal<string | null>(null);
  /** Issue #234 — regras da partida vindas da lista (a API aplica essas). */
  private readonly matchSlots = signal<{ goalkeeperSlots: number; waitlistSlots: number } | null>(null);
  readonly goalkeeperSlots = computed(
    () =>
      this.matchSlots()?.goalkeeperSlots ??
      (this.formatRules().goalkeeperPerTeam ? this.formatRules().teamCount : 0),
  );
  readonly waitlistSlots = computed(
    () => this.matchSlots()?.waitlistSlots ?? this.formatRules().waitlistSlots,
  );
  readonly sheet = computed(() =>
    buildPresenceSheet({
      rows: this.rows(),
      queueOrder: this.queueOrder(),
      changedAtByPlayerId: this.changedAt(),
      capacity: this.capacity(),
      goalkeeperSlots: this.goalkeeperSlots(),
      waitlistSlots: this.waitlistSlots(),
    }),
  );
  readonly outOfList = computed(() => playersOutOfList(this.rows()));
  readonly guestRequests = computed(() =>
    this.rows().filter((r) => r.kind === 'guest' && r.status === 'guest_pending'),
  );
  private readonly selfRow = computed(() =>
    this.rows().find((r) => r.kind === 'player' && r.player.id === this.selfPlayerId()) ?? null,
  );
  /** Issue #263 — jogadores travados por cobrança em aberto (Regras → "Trava"). */
  readonly openCharges = signal<Set<string>>(new Set());
  private readonly selfLocked = computed(() => {
    const me = this.selfRow();
    return (
      !!me &&
      me.kind === 'player' &&
      me.status !== 'confirmed' &&
      me.status !== 'queue' &&
      this.openCharges().has(me.player.id)
    );
  });
  readonly footerActions = computed(() => {
    const me = this.selfRow();
    if (!me || me.kind !== 'player' || !canPlayerSelfEdit(this.listClosed(), this.presenceMode())) {
      return [];
    }
    if (this.selfLocked()) {
      return [];
    }
    return selfFooterActions(this.presenceMode(), me.status);
  });
  /** Issue #263 — aviso no rodapé pra quem está travado. */
  readonly selfLockMessage = computed(() =>
    this.selfLocked()
      ? 'Você tem cobrança em aberto. Só entra na lista depois que o adm confirmar o pagamento.'
      : null,
  );
  readonly footerStatus = computed(() => {
    const me = this.selfRow();
    if (!me || me.kind !== 'player') return '';
    const idx = this.queueOrder().indexOf(me.player.id);
    return selfStatusLine(me.status, idx >= 0 ? idx + 1 : null);
  });
  readonly visibleRows = computed(() => {
    const rows = filterPresenceBySegment(this.rows(), this.segment());
    return this.segment() === 'queue'
      ? sortRowsByQueueOrder(rows, this.queueOrder())
      : rows;
  });

  readonly isOrganizador = computed(() => {
    const pelada = this.peladaContext.getActivePelada();
    return pelada ? this.orgContext.isOrganizador(pelada.id) : false;
  });

  readonly canOrganizerEdit = computed(() =>
    canOrganizerEditPresence(this.listClosed()),
  );

  readonly selfPlayerId = computed(() =>
    resolveSelfPlayerId(this.roster(), this.currentAppUserId()),
  );

  readonly formatRosterRating = formatRosterRating;
  readonly rosterPositionLabel = rosterPositionLabel;
  statusChipLabel(row: PresenceRow): string {
    return statusChipLabel(row, this.queueOrder());
  }

  private readonly liveDestroyRef = inject(DestroyRef);
  private readonly live = inject(LiveRefreshService);

  ngOnInit(): void {
    // Issue #233 — a lista se atualiza sozinha pra todos (sem precisar sair e voltar).
    this.live.start(this.liveDestroyRef, () => this.refreshQuietly());
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada) {
      this.loading.set(false);
      return;
    }
    this.orgContext.refreshMembership(pelada.id);
    this.formatRules.set(this.rulesService.getDefaultRules(pelada.id));
    this.rulesApi.fetchRules(pelada.id).subscribe({
      next: (dto: PeladaRulesApiDto) =>
        this.formatRules.set(this.rulesApi.mapFromApi(dto)),
      error: () => {
        /* mantém regras locais */
      },
    });
    void this.authService
      .getMe()
      .then((me) => this.currentAppUserId.set(me.id))
      .catch(() => this.currentAppUserId.set(null));
    this.dashboardService.loadDashboard(pelada, (dash) => {
      this.rosterService.loadRoster(pelada, (players, outcome) => {
        // Convidado vinculado a conta (issue #172) também pode se autoconfirmar
        // em modo "Jogador confirma" — ver isGuest em RosterPlayer. Ele entra
        // na mesma lista do elenco pra ganhar linha própria, ações de
        // autoconfirmação e prioridade de fila (fixo sempre antes).
        // `loadGuests` também devolve convidado avulso de partida (requestGuest,
        // sem conta) — esse fica de fora (igual ensureAttendanceRows no backend),
        // senão sobra como linha fantasma pendente em partidas futuras.
        this.rosterService.loadGuests(pelada, (guests, guestsOutcome) => {
          const linkedGuests = guests.filter((g) => g.userId != null);
          const rosterOk = outcome === 'api' && guestsOutcome === 'api';
          this.rosterLoadFailed.set(!rosterOk);
          this.applyLoadedState(dash, [...players, ...linkedGuests], rosterOk);
          this.loading.set(false);
        });
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

  showSelfActions(row: PresenceRow): boolean {
    if (row.kind !== 'player') {
      return false;
    }
    if (!canPlayerSelfEdit(this.listClosed(), this.presenceMode())) {
      return false;
    }
    return row.player.id === this.selfPlayerId();
  }

  selfLabels(row: PresenceRow) {
    if (row.kind !== 'player') {
      return null;
    }
    return selfActionLabels(row.status);
  }

  onSelfPresence(playerId: string, accept: boolean): void {
    if (!canPlayerSelfEdit(this.listClosed(), this.presenceMode())) {
      return;
    }
    if (playerId !== this.selfPlayerId()) {
      return;
    }
    const result = selfSetPlayerStatus(
      this.rows(),
      this.queueOrder(),
      playerId,
      accept,
      this.capacity(),
    );
    this.applyPresenceState(result.rows, result.queueOrder);
    const pelada = this.peladaContext.getActivePelada();
    const mid = this.matchId();
    if (pelada && mid) {
      this.syncWithApi(`self:${playerId}`, () =>
        this.attendanceApi.setSelf(pelada.id, mid, accept ? 'confirm' : 'decline'),
      );
    }
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
    const result = orgTogglePlayer(
      this.rows(),
      this.queueOrder(),
      playerId,
      this.capacity(),
    );
    this.applyPresenceState(result.rows, result.queueOrder);
    const next = result.rows.find(
      (r) => r.kind === 'player' && r.player.id === playerId,
    );
    const pelada = this.peladaContext.getActivePelada();
    const mid = this.matchId();
    if (pelada && mid && next?.kind === 'player') {
      const status = this.presenceStatusToApi(next.status);
      this.syncWithApi(`org:${playerId}`, () =>
        this.attendanceApi.patchPlayer(pelada.id, mid, playerId, { status }),
      );
    }
  }

  /**
   * Grava a mudança na API (otimista) e adota a lista devolvida como verdade —
   * a fila/promoção é decidida no servidor. Sem isso a lista só existia no
   * sessionStorage e se perdia ao fechar o app ou entrar de novo.
   *
   * A gravação fica em `unsaved` até dar certo (ou até a lista do servidor ser
   * recarregada no lugar dela), pra ser reenviada antes do close-list se a
   * conexão caiu no meio.
   */
  private syncWithApi(
    key: string,
    write: () => Observable<MatchAttendanceListApiDto>,
  ): void {
    this.listError.set(null);
    this.unsaved.set(key, write);
    this.mutationSeq++;
    this.pendingWrites++;
    this.syncQueue.next(
      defer(write).pipe(
        map((dto) => ({ ok: true as const, dto })),
        catchError((err: { status?: number; error?: { message?: string } }) => {
          // Issue #234 — ex.: 409 "A lista está cheia…": mostra o motivo.
          if (err?.status === 409 && typeof err.error?.message === 'string') {
            this.listError.set(err.error.message);
          }
          return of({ ok: false as const, dto: null });
        }),
        map((res) => {
          if (res.ok) {
            this.clearUnsaved(key, write);
          }
          // Com outra gravação ainda na fila, esta resposta (ou uma recarga
          // agora) não sabe dela e desfaria o toque otimista seguinte: só a
          // última da fila reconcilia com o servidor.
          if (--this.pendingWrites > 0) {
            return null;
          }
          if (res.ok) {
            // A lista do servidor passa a ser a da tela: o que falhou antes
            // aparece desfeito, então não há mais nada pra reenviar.
            this.unsaved.clear();
            return res.dto;
          }
          this.refreshFromApi(() => this.unsaved.clear());
          return null;
        }),
      ),
    );
  }

  private clearUnsaved(
    key: string,
    write: () => Observable<MatchAttendanceListApiDto>,
  ): void {
    if (this.unsaved.get(key) === write) {
      this.unsaved.delete(key);
    }
  }

  /** Gravações que falharam e ainda aparecem na tela (por jogador). */
  private readonly unsaved = new Map<string, () => Observable<MatchAttendanceListApiDto>>();

  /** Sobe a cada gravação: leitura iniciada antes dela é descartada (resposta velha). */
  private mutationSeq = 0;

  /** Gravações na fila ainda sem resposta. */
  private pendingWrites = 0;

  /** Organizador já fechou a lista: resposta de gravação anterior não reabre o snapshot. */
  private closing = false;

  /** Toques rápidos: uma gravação por vez, na ordem, pra resposta velha não sobrescrever a nova. */
  private readonly syncQueue = new Subject<Observable<MatchAttendanceListApiDto | null>>();
  private readonly syncSubscription = this.syncQueue
    .pipe(concatMap((req) => req))
    .subscribe((dto) => {
      if (dto) {
        this.applyServerAttendance(dto);
      }
    });

  /**
   * Issue #233 — atualização automática. Não busca enquanto há toque do
   * usuário gravando (ou que falhou e ainda vai ser reenviado), fechando a
   * lista ou com a pergunta de formato aberta: a lista do servidor ainda não
   * tem essa mudança e desfaria o que a pessoa acabou de tocar.
   */
  refreshQuietly(): void {
    if (this.pendingWrites > 0 || this.unsaved.size > 0 || this.closing || this.formatModalOpen()) {
      return;
    }
    this.refreshFromApi();
  }

  private refreshFromApi(onApplied?: () => void): void {
    const pelada = this.peladaContext.getActivePelada();
    const mid = this.matchId();
    if (!pelada || !mid) {
      return;
    }
    const seq = this.mutationSeq;
    this.attendanceApi.getList(pelada.id, mid).subscribe({
      next: (dto) => {
        if (seq !== this.mutationSeq) {
          return; // uma gravação começou depois desta leitura: a resposta dela manda
        }
        this.applyServerAttendance(dto);
        onApplied?.();
      },
      error: () => {
        /* API fora: mantém a lista local (sessionStorage) */
      },
    });
  }

  private applyServerAttendance(dto: MatchAttendanceListApiDto): void {
    if (dto.matchId !== this.matchId()) {
      return;
    }
    const { statusByPlayerId, queueOrder, changedAtByPlayerId } = presenceFromAttendance(dto.entries);
    this.changedAt.set(changedAtByPlayerId);
    this.openCharges.set(new Set(dto.entries.filter((e) => e.openCharge).map((e) => e.playerId)));
    if (typeof dto.goalkeeperSlots === 'number' && typeof dto.waitlistSlots === 'number') {
      this.matchSlots.set({ goalkeeperSlots: dto.goalkeeperSlots, waitlistSlots: dto.waitlistSlots });
    }
    this.capacity.set(dto.capacity);
    this.listClosed.set(dto.listClosed || this.closing);
    this.presenceMode.set(normalizePresenceMode(dto.presenceMode));
    this.rows.update((rows) =>
      rows.map((r) =>
        r.kind === 'player' && statusByPlayerId.has(r.player.id)
          ? { ...r, status: statusByPlayerId.get(r.player.id)! }
          : r,
      ),
    );
    this.queueOrder.set(queueOrder);
    this.persist();
  }

  onGuest(accept: boolean, guestId: string): void {
    if (!this.isOrganizador() || this.listClosed()) {
      return;
    }
    const result = resolveGuest(
      this.rows(),
      this.queueOrder(),
      guestId,
      accept,
      this.capacity(),
    );
    this.applyPresenceState(result.rows, result.queueOrder, result.extraPlayer);
  }

  absDelta(delta: number): number {
    return Math.abs(delta);
  }

  attemptCloseListAndDraw(): void {
    const hint = evaluateFormatBeforeClose(
      this.counts().confirmed,
      this.formatRules(),
      this.capacity(),
    );
    if (hint.mismatch) {
      this.formatSuggestion.set(hint);
      this.formatModalOpen.set(true);
      return;
    }
    this.finishCloseListAndDraw();
  }

  cancelFormatModal(): void {
    this.formatModalOpen.set(false);
  }

  confirmCloseDespiteFormat(): void {
    this.formatModalOpen.set(false);
    this.finishCloseListAndDraw();
  }

  private presenceStatusToApi(
    status: PlayerPresenceStatus,
  ): 'CONFIRMED' | 'PENDING' | 'QUEUE' {
    switch (status) {
      case 'confirmed':
        return 'CONFIRMED';
      case 'queue':
        return 'QUEUE';
      default:
        return 'PENDING';
    }
  }

  private finishCloseListAndDraw(): void {
    this.closing = true;
    this.listClosed.set(true);
    this.persist();
    const pelada = this.peladaContext.getActivePelada();
    const mid = this.matchId();
    const goSorteio = () => {
      void this.router.navigate([PARTIDA_SORTEIO_PATH]);
    };
    goSorteio();
    if (!pelada || !mid || !this.isOrganizador()) {
      return;
    }
    // Cada toque já foi gravado na hora (syncWithApi). Reenviar todos os status
    // aqui não é idempotente com a lista cheia (o servidor reordenava a fila),
    // então só reenvia o que falhou e fecha — na mesma fila, depois das
    // gravações pendentes. Se algum reenvio falhar, não fecha no servidor (o
    // Sorteio reenvia close-list).
    this.syncQueue.next(
      defer(() => {
        const retries = [...this.unsaved.entries()].map(([key, write]) =>
          defer(write).pipe(tap(() => this.clearUnsaved(key, write))),
        );
        this.mutationSeq++;
        // Não aplica a lista dos reenvios: ela ainda vem com listClosed=false.
        return concat(...retries, of(null)).pipe(
          last(),
          switchMap(() => this.attendanceApi.closeList(pelada.id, mid)),
          map(() => null),
        );
      }).pipe(
        catchError(() => {
          /* §3.4: já na tela Sorteio; sorteio pode reenviar close-list se draw falhar */
          return of(null);
        }),
      ),
    );
  }

  reopenList(): void {
    this.closing = false;
    this.listClosed.set(false);
    this.persist();
    const pelada = this.peladaContext.getActivePelada();
    const mid = this.matchId();
    if (pelada && mid && this.isOrganizador()) {
      this.attendanceApi.reopenList(pelada.id, mid).subscribe({
        error: () => {
          /* mantém estado local */
        },
      });
    }
  }

  private applyLoadedState(
    dash: InicioDashboardView,
    players: RosterPlayer[],
    rosterOk: boolean,
  ): void {
    this.roster.set(players);
    const match = dash.nextMatch;
    if (!match) {
      this.matchId.set(null);
      this.session.setActiveMatchId(null);
      return;
    }
    this.matchId.set(match.matchId);
    this.session.setActiveMatchId(match.matchId);
    this.capacity.set(match.capacity);

    const saved = this.session.load(match.matchId);
    if (!rosterOk) {
      if (saved) {
        const map = new Map(Object.entries(saved.statusByPlayerId));
        const guests =
          saved.guests?.filter((g) => g.kind === 'guest') ??
          ([] as PresenceRow[]);
        this.queueOrder.set(saved.queueOrder ?? []);
        if (saved.presenceMode) {
          this.presenceMode.set(saved.presenceMode);
        }
        if (saved.listClosed) {
          this.listClosed.set(saved.listClosed);
        }
        this.rows.set(
          assemblePresenceRows(
            players,
            map,
            guests,
            saved.extraPlayers ?? [],
          ),
        );
      }
      return;
    }

    const persisted = saved?.statusByPlayerId ?? null;
    if (saved?.presenceMode) {
      this.presenceMode.set(saved.presenceMode);
    }
    if (saved?.listClosed) {
      this.listClosed.set(saved.listClosed);
    }

    const apiConfirmed = dashboardConfirmedIdsForSeed(
      match.confirmedCount,
      match.confirmedPlayers,
    );
    const map = buildInitialStatusMap(
      players,
      match.capacity,
      apiConfirmed,
      persisted,
    );
    const guests =
      saved?.guests?.filter((g) => g.kind === 'guest') ??
      ([] as PresenceRow[]);
    const extraPlayers = saved?.extraPlayers ?? [];
    const order = saved?.queueOrder ?? [];
    this.queueOrder.set(order);
    this.rows.set(
      assemblePresenceRows(players, map, guests, extraPlayers),
    );
    this.persist();
    this.refreshFromApi();
  }

  private applyPresenceState(
    nextRows: PresenceRow[],
    order: string[],
    extraAdded?: RosterPlayer,
  ): void {
    this.rows.set(nextRows);
    this.queueOrder.set(order);
    if (extraAdded) {
      const saved = this.session.load(this.matchId() ?? '') ?? null;
      const extras = saved?.extraPlayers ?? [];
      if (!extras.some((p) => p.id === extraAdded.id)) {
        this.persist([...extras, extraAdded]);
        return;
      }
    }
    this.persist();
  }

  private updateRows(next: PresenceRow[]): void {
    this.rows.set(next);
    this.persist();
  }

  private persist(extraPlayersOverride?: RosterPlayer[]): void {
    const matchId = this.matchId() ?? this.session.getActiveMatchId();
    if (!matchId) {
      return;
    }
    const rosterIds = new Set(this.roster().map((p) => p.id));
    const statusByPlayerId: Record<string, PlayerPresenceStatus> = {};
    for (const row of this.rows()) {
      if (row.kind === 'player') {
        statusByPlayerId[row.player.id] = row.status;
      }
    }
    const guests = this.rows().filter((r) => r.kind === 'guest');
    const extraPlayers =
      extraPlayersOverride ??
      extraPlayersFromRows(this.rows(), rosterIds);
    this.session.save({
      matchId,
      listClosed: this.listClosed(),
      statusByPlayerId,
      guests,
      extraPlayers,
      queueOrder: this.queueOrder(),
      presenceMode: this.presenceMode(),
    });
  }
}
