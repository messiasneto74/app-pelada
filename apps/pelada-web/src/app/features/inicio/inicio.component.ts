import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  INICIO_SHORTCUTS,
  type InicioDashboardView,
} from '../../core/inicio/inicio-dashboard.model';
import { PeladaDashboardService } from '../../core/inicio/pelada-dashboard.service';
import { resolveInicioEmptyStates } from '../../core/inicio/inicio-empty-states';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaAvatarComponent } from '../../ui/avatar.component';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaCardComponent } from '../../ui/card.component';
import { PeladaProgressComponent } from '../../ui/progress.component';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    RouterLink,
    ScreenHeaderComponent,
    PeladaCardComponent,
    PeladaProgressComponent,
    PeladaAvatarComponent,
    PeladaButtonComponent,
  ],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Início"
        [title]="dashboard()?.peladaName ?? 'Bora jogar'"
        subtitle="Próxima partida, atalhos e caixa do mês (§3.1)."
      />

      @if (loading()) {
        <p class="pelada-muted">Carregando…</p>
      } @else {
        @if (dashboard(); as dash) {
        @if (dash.nextMatch; as match) {
          <pelada-card title="Próxima partida">
            <p class="match-when">
              {{ match.dateLabel }}
              @if (match.timeLabel) {
                · {{ match.timeLabel }}
              }
            </p>
            <p class="match-meta">
              {{ match.locationLabel }} · {{ match.modalityLabel }}
            </p>
            <div class="avatar-row">
              @for (p of match.confirmedPlayers.slice(0, 5); track p.id) {
                <pelada-avatar [name]="p.displayName" size="small" tone="lime" />
              }
            </div>
            <pelada-progress
              [value]="match.vacancyPercent"
              [startLabel]="match.confirmedCount + '/' + match.capacity + ' confirmados'"
              [endLabel]="match.vacancyPercent + '%'"
            />
            <a
              [routerLink]="match.presenceLink"
              peladaButton
              variant="lime"
              [peladaButtonBlock]="true"
            >
              Abrir lista de presença
            </a>
          </pelada-card>
        } @else {
          <pelada-card title="Nenhuma partida marcada">
            <p class="pelada-muted">
              Crie a primeira partida para ver dia, hora, vagas e confirmados aqui.
            </p>
            <a
              routerLink="/inicio/criar-partida"
              peladaButton
              [peladaButtonBlock]="true"
            >
              Criar partida
            </a>
          </pelada-card>
        }

        @if (resolveInicioEmptyStates(dash).showNoRoster) {
          <pelada-card title="Elenco vazio">
            <p class="pelada-muted">
              Adicione jogadores para confirmar presença, sortear times e usar o caixa.
            </p>
            <a
              routerLink="/jogadores"
              peladaButton
              variant="secondary"
              [peladaButtonBlock]="true"
            >
              Ir para o elenco
            </a>
          </pelada-card>
        }

        <div class="shortcut-grid">
          @for (s of shortcuts; track s.id) {
            <a [routerLink]="s.route" class="shortcut" peladaButton variant="secondary">
              {{ s.label }}
            </a>
          }
        </div>

        <pelada-card title="Caixa do mês">
          <p class="cash-line">
            {{ dash.cashReceivedLabel }}
            <span class="pelada-muted">de {{ dash.cashExpectedLabel }}</span>
          </p>
          <pelada-progress
            [value]="dash.cashPercent"
            startLabel="Recebido no período"
            [endLabel]="dash.cashPercent + '% do total'"
          />
        </pelada-card>
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
      .match-when {
        font-weight: 600;
        margin: 0 0 var(--pelada-space-2);
      }
      .match-meta {
        margin: 0 0 var(--pelada-space-3);
        color: var(--pelada-muted, #5a6b63);
      }
      .avatar-row {
        display: flex;
        gap: var(--pelada-space-2);
        margin-bottom: var(--pelada-space-3);
      }
      .shortcut-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--pelada-space-3);
        margin-bottom: var(--pelada-space-4);
      }
      .shortcut {
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        text-decoration: none;
      }
      .cash-line {
        margin: 0 0 var(--pelada-space-3);
        font-size: 1.125rem;
      }
    `,
  ],
})
export class InicioComponent implements OnInit {
  private readonly peladaContext = inject(PeladaContextService);
  private readonly dashboardService = inject(PeladaDashboardService);
  private readonly router = inject(Router);

  readonly shortcuts = INICIO_SHORTCUTS;
  readonly dashboard = signal<InicioDashboardView | null>(null);
  readonly loading = signal(true);
  readonly resolveInicioEmptyStates = resolveInicioEmptyStates;

  ngOnInit(): void {
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada) {
      void this.router.navigate(['/onboarding/pelada']);
      return;
    }
    this.dashboardService.loadDashboard(pelada, (view) => {
      this.dashboard.set(view);
      this.loading.set(false);
    });
  }
}
