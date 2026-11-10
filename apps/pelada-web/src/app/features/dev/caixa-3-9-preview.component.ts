import { Component, model } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatMoneyBrl } from '../../core/inicio/inicio-dashboard.model';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaCardComponent } from '../../ui/card.component';
import { PeladaProgressComponent } from '../../ui/progress.component';
import { PeladaSegmentComponent } from '../../ui/segment.component';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

/** Prévia §3.9 — evidência 390px (issue #46), rota `/dev/caixa-3-9`. */
@Component({
  selector: 'app-caixa-3-9-preview',
  standalone: true,
  imports: [
    RouterLink,
    ScreenHeaderComponent,
    PeladaCardComponent,
    PeladaProgressComponent,
    PeladaSegmentComponent,
    PeladaButtonComponent,
  ],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Caixa"
        title="Pelada Resenha"
        subtitle="Recebido, devedores e marcar pago (§3.9)."
      />

      <pelada-card title="Recebido no período">
        <p class="cash-line">
          {{ formatMoney(12000) }}
          <span class="pelada-muted">de {{ formatMoney(20000) }}</span>
        </p>
        <p class="pelada-muted cash-remaining">Faltam {{ formatMoney(8000) }}</p>
        <pelada-progress [value]="60" startLabel="Recebido" endLabel="60%" />
        <p class="pelada-muted model-line">Modelo da pelada: Por partida · Contribuição padrão {{ formatMoney(2000) }}</p>
      </pelada-card>

      <pelada-segment
        [options]="[
          { value: 'player', label: 'Por jogador' },
          { value: 'match', label: 'Por partida' },
        ]"
        [(value)]="segment"
      />

      <pelada-card title="Bruno">
        <p class="group-meta pelada-muted">{{ formatMoney(0) }} de {{ formatMoney(4000) }}</p>
        <ul class="ledger-list">
          <li class="ledger-row">
            <div class="ledger-main">
              <span class="ledger-sub pelada-muted">05 nov., 19:30</span>
              <span class="status-chip status-chip--pending">Devendo</span>
              <span class="plan-chip pelada-muted">Por partida</span>
            </div>
            <div class="ledger-side">
              <span class="amount">{{ formatMoney(2000) }}</span>
              <button type="button" class="mark-btn">Marcar pago</button>
            </div>
          </li>
          <li class="ledger-row">
            <div class="ledger-main">
              <span class="ledger-sub pelada-muted">12 nov., 19:30</span>
              <span class="status-chip status-chip--paid">Pago</span>
              <span class="plan-chip pelada-muted">Mensalista</span>
            </div>
            <div class="ledger-side">
              <span class="amount">{{ formatMoney(2000) }}</span>
            </div>
          </li>
        </ul>
      </pelada-card>

      <button type="button" peladaButton variant="secondary" [peladaButtonBlock]="true" disabled>
        Cobrança Zap (em breve)
      </button>

      <a routerLink="/caixa" class="pelada-muted dev-link">Abrir /caixa (API)</a>
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
      }
      .ledger-main {
        display: flex;
        flex-wrap: wrap;
        gap: var(--pelada-space-2);
        align-items: center;
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
        border-radius: 999px;
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
      }
      .dev-link {
        display: block;
        margin-top: var(--pelada-space-4);
        font-size: 0.8125rem;
      }
    `,
  ],
})
export class Caixa39PreviewComponent {
  readonly formatMoney = formatMoneyBrl;
  readonly segment = model('player');
}
