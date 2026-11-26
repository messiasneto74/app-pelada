import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import type { MatchDaySummaryDto } from '../../core/match/match-field-session-api.model';
import { MatchFieldSessionService } from '../../core/match/match-field-session.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaDashboardService } from '../../core/inicio/pelada-dashboard.service';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import {
  mapPeladaRulesApiError,
  type PeladaRulesFormValues,
} from '../../core/pelada/pelada-rules.model';
import { PeladaRulesApiService } from '../../core/pelada/pelada-rules-api.service';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaCardComponent } from '../../ui/card.component';
import { PeladaFieldComponent } from '../../ui/field.component';
import { PeladaInputDirective } from '../../ui/input.directive';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

/** Tela de resumo "do dia" (por time), a partir do histórico de rodadas (épico #156, etapa 5). */
@Component({
  selector: 'app-resumo-partida',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    ScreenHeaderComponent,
    PeladaCardComponent,
    PeladaFieldComponent,
    PeladaInputDirective,
    PeladaButtonComponent,
  ],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Partida"
        title="Resumo do dia"
        subtitle="Vitórias, goleadas e artilheiro a partir do histórico de rodadas."
      />

      <nav class="partida-tabs" aria-label="Abas da partida">
        <a routerLink="/partida/presenca" routerLinkActive="active">Presença</a>
        <a routerLink="/partida/sorteio" routerLinkActive="active">Sorteio</a>
        <a routerLink="/partida/campo" routerLinkActive="active">Em campo</a>
        <a routerLink="/partida/resumo" routerLinkActive="active">Resumo</a>
      </nav>

      @if (loading()) {
        <p class="pelada-muted">Carregando…</p>
      } @else if (error()) {
        <p class="pelada-error" role="alert">{{ error() }}</p>
      } @else if (noRecentSummary()) {
        <pelada-card title="Nenhum resumo disponível">
          <p class="pelada-muted">
            Nenhuma partida foi encerrada nas últimas 48 horas. O resumo do dia aparece aqui
            assim que o organizador encerrar a partida.
          </p>
        </pelada-card>
      } @else if (summary(); as s) {
        <pelada-card title="Texto do resumo">
          <p class="summary-text">{{ s.text }}</p>
          @if (!isOrganizador()) {
            <!-- Issue #215: só o organizador edita o modelo do texto. -->
          } @else if (rulesLoadError()) {
            <p class="pelada-field__error" role="alert">{{ rulesLoadError() }}</p>
          } @else if (!rulesReady()) {
            <p class="pelada-muted">Carregando regras…</p>
          } @else if (!editingTemplate()) {
            <button
              type="button"
              class="pelada-btn"
              peladaButton
              variant="ghost"
              (click)="startEditingTemplate()"
            >
              Editar texto do resumo
            </button>
          } @else {
            @if (templateError()) {
              <p class="pelada-field__error" role="alert">{{ templateError() }}</p>
            }
            @if (templateSavedMessage()) {
              <p class="pelada-text-ok" role="status">{{ templateSavedMessage() }}</p>
            }
            <pelada-field
              label="Modelo do texto"
              forId="summary-template"
              hint="Livre — pode ser bem-humorado. Vazio usa o padrão. Variáveis: {{ summaryVariablesHint }}"
            >
              <textarea
                id="summary-template"
                peladaInput
                rows="4"
                placeholder="Deixe em branco pra usar o texto padrão"
                [value]="templateDraft()"
                (input)="patchTemplateDraft($event)"
              ></textarea>
            </pelada-field>
            <button
              type="button"
              class="pelada-btn"
              peladaButton
              variant="lime"
              [disabled]="savingTemplate()"
              (click)="saveTemplate()"
            >
              {{ savingTemplate() ? 'Salvando…' : 'Salvar' }}
            </button>
            <button
              type="button"
              class="pelada-btn"
              peladaButton
              variant="ghost"
              [disabled]="savingTemplate()"
              (click)="cancelEditingTemplate()"
            >
              Cancelar
            </button>
          }
        </pelada-card>

        <pelada-card title="Times">
          <table class="teams-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>V</th>
                <th>E</th>
                <th>D</th>
                <th>GP</th>
                <th>GC</th>
              </tr>
            </thead>
            <tbody>
              @for (t of s.teams; track t.drawTeamId) {
                <tr>
                  <td>{{ t.name }}</td>
                  <td>{{ t.wins }}</td>
                  <td>{{ t.draws }}</td>
                  <td>{{ t.losses }}</td>
                  <td>{{ t.goalsFor }}</td>
                  <td>{{ t.goalsAgainst }}</td>
                </tr>
              }
            </tbody>
          </table>
        </pelada-card>

        @if (s.topScorer; as top) {
          <pelada-card title="Artilheiro do dia">
            <p>{{ top.displayName }} — {{ top.goals }} gol(s)</p>
          </pelada-card>
        }

        @if (s.biggestWin; as win) {
          <pelada-card title="Maior goleada">
            <p>
              {{ win.winnerName }} {{ win.scoreWinner }}x{{ win.scoreLoser }}
              {{ win.loserName }}
            </p>
          </pelada-card>
        }

        @if (s.mostLosses; as ml) {
          <pelada-card title="Time que mais perdeu">
            <p>{{ ml.name }} — {{ ml.losses }} derrota(s)</p>
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
      pelada-card {
        display: block;
        margin-bottom: var(--pelada-space-4);
      }
      .summary-text {
        white-space: pre-wrap;
      }
      .teams-table {
        width: 100%;
        border-collapse: collapse;
      }
      .teams-table th,
      .teams-table td {
        text-align: center;
        padding: var(--pelada-space-2);
      }
      .teams-table th:first-child,
      .teams-table td:first-child {
        text-align: left;
      }
      .back-link {
        display: inline-block;
        margin-top: var(--pelada-space-4);
        font-size: 0.875rem;
      }
    `,
  ],
})
export class ResumoPartidaComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly peladaContext = inject(PeladaContextService);
  private readonly fieldApi = inject(MatchFieldSessionService);
  private readonly rulesApi = inject(PeladaRulesApiService);
  private readonly dashboardService = inject(PeladaDashboardService);
  private readonly orgContext = inject(PeladaOrganizadorContextService);

  /** Issue #215 — sem partida encerrada nas últimas 48h. */
  readonly noRecentSummary = signal(false);

  readonly isOrganizador = computed(() => {
    const pelada = this.peladaContext.getActivePelada();
    return pelada ? this.orgContext.isOrganizador(pelada.id) : false;
  });

  readonly summary = signal<MatchDaySummaryDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private loadedRules: PeladaRulesFormValues | null = null;
  readonly rulesReady = signal(false);
  readonly rulesLoadError = signal<string | null>(null);
  readonly editingTemplate = signal(false);
  readonly templateDraft = signal('');
  readonly savingTemplate = signal(false);
  readonly templateError = signal<string | null>(null);
  readonly templateSavedMessage = signal<string | null>(null);

  readonly summaryVariablesHint =
    '{artilheiro}, {golsArtilheiro}, {timeGoleou}, {timeGoleado}, {margemGol}, {placarGoleada}, {timeQueMaisPerdeu}, {rodadas}';

  ngOnInit(): void {
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada) {
      this.loading.set(false);
      this.error.set('Nenhuma pelada selecionada.');
      return;
    }
    this.orgContext.refreshMembership(pelada.id);
    const matchId = this.route.snapshot.queryParamMap.get('matchId');
    if (matchId) {
      this.loadSummary(pelada.id, matchId);
      return;
    }
    // Issue #215 — pelo menu (sem matchId): resumo da partida encerrada nas últimas 48h.
    this.dashboardService.loadDashboard(pelada, (dash) => {
      const recent = dash.recentSummary?.matchId;
      if (!recent) {
        this.noRecentSummary.set(true);
        this.loading.set(false);
        return;
      }
      this.loadSummary(pelada.id, recent);
    });
  }

  private loadSummary(peladaId: string, matchId: string): void {
    this.fieldApi.getDaySummary(peladaId, matchId).subscribe({
      next: (dto) => {
        this.summary.set(dto);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar o resumo do dia.');
        this.loading.set(false);
      },
    });
    this.rulesApi.fetchRules(peladaId).subscribe({
      next: (dto) => {
        this.loadedRules = this.rulesApi.mapFromApi(dto);
        this.rulesReady.set(true);
      },
      error: () => {
        this.rulesLoadError.set(
          'Não foi possível carregar as regras da pelada. Edição do texto do resumo fica indisponível por enquanto.',
        );
      },
    });
  }

  startEditingTemplate(): void {
    if (!this.loadedRules) {
      return;
    }
    this.templateDraft.set(this.loadedRules.summaryTemplate);
    this.templateError.set(null);
    this.templateSavedMessage.set(null);
    this.editingTemplate.set(true);
  }

  cancelEditingTemplate(): void {
    this.editingTemplate.set(false);
  }

  patchTemplateDraft(event: Event): void {
    this.templateDraft.set((event.target as HTMLTextAreaElement).value);
  }

  saveTemplate(): void {
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada) {
      this.templateError.set('Nenhuma pelada ativa.');
      return;
    }
    if (!this.loadedRules) {
      this.templateError.set(
        'As regras da pelada ainda não foram carregadas. Tente de novo em instantes.',
      );
      return;
    }
    const merged: PeladaRulesFormValues = {
      ...this.loadedRules,
      summaryTemplate: this.templateDraft(),
    };
    this.savingTemplate.set(true);
    this.templateError.set(null);
    this.rulesApi.saveRules(pelada.id, merged).subscribe({
      next: () => {
        this.loadedRules = merged;
        this.savingTemplate.set(false);
        this.templateSavedMessage.set('Texto do resumo salvo.');
        this.editingTemplate.set(false);
      },
      error: (httpErr: HttpErrorResponse) => {
        this.templateError.set(mapPeladaRulesApiError(httpErr));
        this.savingTemplate.set(false);
      },
    });
  }
}
