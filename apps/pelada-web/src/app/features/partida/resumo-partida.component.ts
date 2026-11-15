import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { MatchDaySummaryDto } from '../../core/match/match-field-session-api.model';
import { MatchFieldSessionService } from '../../core/match/match-field-session.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaCardComponent } from '../../ui/card.component';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

/** Tela de resumo "do dia" (por time), a partir do histórico de rodadas (épico #156, etapa 5). */
@Component({
  selector: 'app-resumo-partida',
  standalone: true,
  imports: [RouterLink, ScreenHeaderComponent, PeladaCardComponent],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Partida"
        title="Resumo do dia"
        subtitle="Vitórias, goleadas e artilheiro a partir do histórico de rodadas."
      />

      @if (loading()) {
        <p class="pelada-muted">Carregando…</p>
      } @else if (error()) {
        <p class="pelada-error" role="alert">{{ error() }}</p>
      } @else if (summary(); as s) {
        <pelada-card title="Texto do resumo">
          <p class="summary-text">{{ s.text }}</p>
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

      <a routerLink="/partida/campo" class="back-link">Voltar pra Em campo</a>
    </section>
  `,
  styles: [
    `
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

  readonly summary = signal<MatchDaySummaryDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const pelada = this.peladaContext.getActivePelada();
    const matchId = this.route.snapshot.queryParamMap.get('matchId');
    if (!pelada || !matchId) {
      this.loading.set(false);
      this.error.set('Partida não encontrada. Volte pra "Em campo" e tente de novo.');
      return;
    }
    this.fieldApi.getDaySummary(pelada.id, matchId).subscribe({
      next: (dto) => {
        this.summary.set(dto);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar o resumo do dia.');
        this.loading.set(false);
      },
    });
  }
}
