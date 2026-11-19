import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, model, signal } from '@angular/core';
import type {
  LedgerGroupBy,
  PaymentLedgerEntryDto,
  PaymentLedgerResponse,
} from '../../core/payments/payment-ledger-api.model';
import { PeladaPaymentsService } from '../../core/payments/pelada-payments.service';
import { PeladaDashboardRefreshService } from '../../core/inicio/pelada-dashboard-refresh.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import { PeladaRosterService } from '../../core/roster/pelada-roster.service';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import { paymentPlanLabel } from '../../core/roster/player-profile.logic';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaCardComponent } from '../../ui/card.component';
import { PeladaFieldComponent } from '../../ui/field.component';
import { PeladaInputDirective } from '../../ui/input.directive';
import { PeladaProgressComponent } from '../../ui/progress.component';
import { PeladaSegmentComponent } from '../../ui/segment.component';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';
import {
  entryContextLabel,
  formatCashSummary,
  isPendingEntry,
  paymentStatusChipLabel,
  peladaPaymentModelLabel,
} from './caixa-view.logic';
import {
  ZAP_CHARGE_BUTTON_LABEL,
  ZAP_CHARGE_BUTTON_TITLE,
  showZapChargeButton,
  zapChargeButtonDisabled,
} from './caixa-zap-charge.policy';
import { formatMoneyBrl } from '../../core/inicio/inicio-dashboard.model';

@Component({
  selector: 'app-caixa-pelada',
  standalone: true,
  imports: [
    CommonModule,
    ScreenHeaderComponent,
    PeladaCardComponent,
    PeladaFieldComponent,
    PeladaInputDirective,
    PeladaProgressComponent,
    PeladaSegmentComponent,
    PeladaButtonComponent,
  ],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Caixa"
        [title]="headerTitle()"
        subtitle="Recebido, devedores e marcar pago."
      />

      @if (loading()) {
        <p class="pelada-muted">Carregando…</p>
      } @else if (error()) {
        <p class="pelada-error" role="alert">{{ error() }}</p>
      } @else if (ledger(); as l) {
        <pelada-card title="Recebido no período">
          <p class="cash-line">
            {{ cashDisplay().receivedLabel }}
            <span class="pelada-muted">de {{ cashDisplay().expectedLabel }}</span>
          </p>
          <p class="pelada-muted cash-remaining">
            Faltam {{ cashDisplay().remainingLabel }}
          </p>
          <pelada-progress
            [value]="cashDisplay().percent"
            startLabel="Recebido"
            [endLabel]="cashDisplay().percent + '%'"
          />
          <p class="pelada-muted model-line">
            Modelo da pelada: {{ paymentModelLabel(l.paymentModel) }}
            @if (l.feeCents > 0) {
              · Contribuição padrão {{ formatMoney(l.feeCents) }}
            }
          </p>
        </pelada-card>

        @if (isOrganizador()) {
          @if (!showChargeForm()) {
            <button
              type="button"
              class="pelada-btn pelada-btn--block"
              peladaButton
              variant="lime"
              (click)="openChargeForm()"
            >
              + Lançar cobrança
            </button>
          } @else {
            <pelada-card title="Lançar cobrança">
              @if (chargeError()) {
                <p class="pelada-error" role="alert">{{ chargeError() }}</p>
              }
              <pelada-field label="Jogador" forId="charge-player">
                <select
                  id="charge-player"
                  peladaInput
                  [value]="chargePlayerId()"
                  (change)="patchChargePlayer($event)"
                >
                  <option value="">Selecione…</option>
                  @for (p of players(); track p.id) {
                    <option [value]="p.id">{{ p.displayName }}</option>
                  }
                </select>
              </pelada-field>
              <pelada-field label="Valor (R$)" forId="charge-amount">
                <input
                  id="charge-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  peladaInput
                  [value]="chargeAmountReais()"
                  (input)="patchChargeAmount($event)"
                />
              </pelada-field>
              <button
                type="button"
                class="pelada-btn pelada-btn--block"
                peladaButton
                variant="lime"
                [disabled]="chargingBusy()"
                (click)="submitCharge()"
              >
                {{ chargingBusy() ? 'Lançando…' : 'Lançar' }}
              </button>
              <button
                type="button"
                class="pelada-btn pelada-btn--block"
                peladaButton
                variant="secondary"
                [disabled]="chargingBusy()"
                (click)="closeChargeForm()"
              >
                Cancelar
              </button>
            </pelada-card>
          }
        }

        <pelada-segment [options]="segmentOptions" [(value)]="groupBy" />

        @if (l.groups.length === 0) {
          <pelada-card title="Nenhum lançamento">
            <p class="pelada-muted">
              Ainda não há cobranças neste período.
            </p>
          </pelada-card>
        } @else {
          @for (group of l.groups; track group.key) {
            <pelada-card [title]="group.label">
              <p class="group-meta pelada-muted">
                {{ formatMoney(group.receivedCents) }} de
                {{ formatMoney(group.expectedCents) }}
              </p>
              <ul class="ledger-list">
                @for (entry of group.entries; track entry.id) {
                  <li class="ledger-row">
                    <div class="ledger-main">
                      @if (groupBy() === 'match') {
                        <span class="ledger-name">{{ entry.playerName }}</span>
                      } @else if (entryContext(entry); as ctx) {
                        <span class="ledger-sub pelada-muted">{{ ctx }}</span>
                      }
                      <span
                        class="status-chip"
                        [class.status-chip--paid]="entry.status === 'PAID'"
                        [class.status-chip--pending]="entry.status === 'PENDING'"
                      >
                        {{ statusLabel(entry.status) }}
                      </span>
                      <span class="plan-chip pelada-muted">
                        {{ planLabel(entry.playerPaymentPlan) }}
                      </span>
                    </div>
                    <div class="ledger-side">
                      <span class="amount">{{ formatMoney(entry.amountCents) }}</span>
                      @if (isOrganizador() && isPending(entry)) {
                        <button
                          type="button"
                          class="mark-btn"
                          [disabled]="busyId() === entry.id"
                          (click)="markPaid(entry)"
                        >
                          Marcar pago
                        </button>
                      }
                    </div>
                  </li>
                }
              </ul>
            </pelada-card>
          }
        }

        @if (showZapCharge()) {
          <button
            type="button"
            class="zap-charge-btn"
            peladaButton
            variant="secondary"
            [peladaButtonBlock]="true"
            [disabled]="zapChargeDisabled()"
            [title]="zapChargeTitle"
          >
            {{ zapChargeLabel }}
          </button>
        }
      }
    </section>
  `,
  styles: [
    `
      pelada-card {
        display: block;
        margin-bottom: var(--pelada-space-4);
      }
      pelada-segment {
        display: block;
        margin-bottom: var(--pelada-space-4);
      }
      .cash-line {
        font-weight: 600;
        margin: 0 0 var(--pelada-space-2);
      }
      .cash-remaining {
        margin: 0 0 var(--pelada-space-3);
        font-size: 0.875rem;
      }
      .model-line {
        margin: var(--pelada-space-3) 0 0;
        font-size: 0.8125rem;
      }
      .group-meta {
        margin: 0 0 var(--pelada-space-3);
        font-size: 0.8125rem;
      }
      .ledger-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-3);
      }
      .ledger-row {
        display: flex;
        justify-content: space-between;
        gap: var(--pelada-space-3);
        align-items: flex-start;
      }
      .ledger-main {
        display: flex;
        flex-wrap: wrap;
        gap: var(--pelada-space-2);
        align-items: center;
      }
      .ledger-name {
        font-weight: 600;
        width: 100%;
      }
      .ledger-sub {
        font-size: 0.8125rem;
        width: 100%;
      }
      .status-chip {
        font-size: 0.6875rem;
        font-weight: 700;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: var(--pelada-radius-pill, 999px);
        background: var(--pelada-surface-3, #e8ece9);
      }
      .status-chip--paid {
        background: #d1fae5;
        color: #065f46;
      }
      .status-chip--pending {
        background: #fef3c7;
        color: #92400e;
      }
      .plan-chip {
        font-size: 0.75rem;
      }
      .ledger-side {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: var(--pelada-space-2);
        flex-shrink: 0;
      }
      .amount {
        font-weight: 700;
      }
      .mark-btn {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 6px 10px;
        border-radius: var(--pelada-radius-md);
        border: 1px solid var(--pelada-border, #c5cfc9);
        background: var(--pelada-lime, #84cc16);
        color: #0f172a;
        cursor: pointer;
      }
      .mark-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .pelada-error {
        color: #b91c1c;
        font-size: 0.875rem;
      }
    `,
  ],
})
export class CaixaPeladaComponent {
  private readonly peladaContext = inject(PeladaContextService);
  private readonly orgContext = inject(PeladaOrganizadorContextService);
  private readonly paymentsApi = inject(PeladaPaymentsService);
  private readonly dashboardRefresh = inject(PeladaDashboardRefreshService);
  private readonly rosterService = inject(PeladaRosterService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly ledger = signal<PaymentLedgerResponse | null>(null);
  readonly groupBy = model<LedgerGroupBy>('player');
  readonly busyId = signal<string | null>(null);

  /** Issue #190 — lançar cobrança (Caixa). */
  readonly showChargeForm = signal(false);
  readonly players = signal<RosterPlayer[]>([]);
  readonly chargePlayerId = signal('');
  readonly chargeAmountReais = signal('');
  readonly chargeError = signal<string | null>(null);
  readonly chargingBusy = signal(false);

  readonly segmentOptions = [
    { value: 'player', label: 'Por jogador' },
    { value: 'match', label: 'Por partida' },
  ];

  readonly headerTitle = computed(() => {
    const pelada = this.peladaContext.getActivePelada();
    return pelada?.name ?? 'Caixa';
  });

  readonly isOrganizador = computed(() => {
    const pelada = this.peladaContext.getActivePelada();
    return pelada ? this.orgContext.isOrganizador(pelada.id) : false;
  });

  readonly showZapCharge = computed(() =>
    showZapChargeButton(this.isOrganizador()),
  );
  readonly zapChargeDisabled = zapChargeButtonDisabled;
  readonly zapChargeLabel = ZAP_CHARGE_BUTTON_LABEL;
  readonly zapChargeTitle = ZAP_CHARGE_BUTTON_TITLE;

  readonly cashDisplay = computed(() => {
    const l = this.ledger();
    if (!l) {
      return formatCashSummary(0, 0);
    }
    return formatCashSummary(
      l.summary.receivedCents,
      l.summary.expectedCents,
    );
  });

  readonly formatMoney = formatMoneyBrl;
  readonly paymentModelLabel = peladaPaymentModelLabel;
  readonly statusLabel = paymentStatusChipLabel;
  readonly planLabel = paymentPlanLabel;
  readonly entryContext = entryContextLabel;
  readonly isPending = isPendingEntry;

  constructor() {
    effect(() => {
      const pelada = this.peladaContext.getActivePelada();
      const groupBy = this.groupBy();
      if (!pelada) {
        this.loading.set(false);
        this.error.set('Selecione uma pelada no Início.');
        return;
      }
      this.orgContext.refreshMembership(pelada.id);
      this.loadLedger(pelada.id, groupBy);
    });
  }

  markPaid(entry: PaymentLedgerEntryDto): void {
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada || !this.isOrganizador()) {
      return;
    }
    this.busyId.set(entry.id);
    this.error.set(null);
    this.paymentsApi.markPaid(pelada.id, entry.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.dashboardRefresh.notifyCashSummaryChanged();
        this.loadLedger(pelada.id, this.groupBy());
      },
      error: (err: HttpErrorResponse) => {
        this.busyId.set(null);
        this.error.set(apiErrorMessage(err));
      },
    });
  }

  openChargeForm(): void {
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada) {
      return;
    }
    this.chargeError.set(null);
    this.chargePlayerId.set('');
    const feeCents = this.ledger()?.feeCents ?? 0;
    this.chargeAmountReais.set(feeCents > 0 ? (feeCents / 100).toFixed(2) : '');
    this.showChargeForm.set(true);
    this.rosterService.loadRoster(pelada, (players) => this.players.set(players));
  }

  closeChargeForm(): void {
    this.showChargeForm.set(false);
    this.chargeError.set(null);
  }

  patchChargePlayer(event: Event): void {
    this.chargePlayerId.set((event.target as HTMLSelectElement).value);
  }

  patchChargeAmount(event: Event): void {
    this.chargeAmountReais.set((event.target as HTMLInputElement).value);
  }

  submitCharge(): void {
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada || !this.isOrganizador()) {
      return;
    }
    const playerId = this.chargePlayerId();
    if (!playerId) {
      this.chargeError.set('Selecione um jogador.');
      return;
    }
    const amountCents = Math.round(Number.parseFloat(this.chargeAmountReais()) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      this.chargeError.set('Informe um valor válido para a cobrança.');
      return;
    }
    this.chargingBusy.set(true);
    this.chargeError.set(null);
    this.paymentsApi
      .createLedgerEntry(pelada.id, { playerId, amountCents })
      .subscribe({
        next: () => {
          this.chargingBusy.set(false);
          this.showChargeForm.set(false);
          this.dashboardRefresh.notifyCashSummaryChanged();
          this.loadLedger(pelada.id, this.groupBy());
        },
        error: (err: HttpErrorResponse) => {
          this.chargingBusy.set(false);
          this.chargeError.set(apiErrorMessage(err));
        },
      });
  }

  private loadLedger(peladaId: string, groupBy: LedgerGroupBy): void {
    this.loading.set(true);
    this.paymentsApi.getLedger(peladaId, groupBy).subscribe({
      next: (body) => {
        this.ledger.set(body);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.ledger.set(null);
        this.error.set(apiErrorMessage(err));
      },
    });
  }
}

function apiErrorMessage(err: HttpErrorResponse): string {
  const body = err.error as { message?: string } | undefined;
  if (typeof body?.message === 'string' && body.message.length > 0) {
    return body.message;
  }
  return 'Não foi possível carregar o caixa.';
}
