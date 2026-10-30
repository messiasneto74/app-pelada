import { Component, computed, inject, model, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaRulesService } from '../../core/pelada/pelada-rules.service';
import { PeladaRosterService } from '../../core/roster/pelada-roster.service';
import {
  filterRosterList,
  formatRosterRating,
  rosterPositionLabel,
} from '../../core/roster/roster-list.logic';
import {
  ROSTER_SEGMENT_OPTIONS,
  type RosterPlayer,
  type RosterSegment,
} from '../../core/roster/roster-player.model';
import { PeladaAvatarComponent } from '../../ui/avatar.component';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaCardComponent } from '../../ui/card.component';
import { PeladaFieldComponent } from '../../ui/field.component';
import { PeladaInputDirective } from '../../ui/input.directive';
import { PeladaSegmentComponent } from '../../ui/segment.component';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

@Component({
  selector: 'app-jogadores-lista',
  standalone: true,
  imports: [
    RouterLink,
    ScreenHeaderComponent,
    PeladaCardComponent,
    PeladaFieldComponent,
    PeladaInputDirective,
    PeladaSegmentComponent,
    PeladaButtonComponent,
    PeladaAvatarComponent,
  ],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Elenco"
        [title]="headerTitle()"
        subtitle="Busca, filtros e acesso ao perfil (§3.7)."
      />

      @if (loading()) {
        <p class="pelada-muted">Carregando elenco…</p>
      } @else {
        <pelada-field label="Buscar jogador" forId="roster-search">
          <input
            id="roster-search"
            type="search"
            peladaInput
            placeholder="Quem você procura?"
            [value]="searchQuery()"
            (input)="onSearch($event)"
            autocomplete="off"
          />
        </pelada-field>

        <pelada-segment
          [options]="segmentOptions"
          [(value)]="segment"
        />

        @if (players().length === 0) {
          <pelada-card title="Elenco vazio">
            <p class="pelada-muted">
              Adicione jogadores para confirmar presença, sortear times e usar o caixa.
            </p>
          </pelada-card>
        } @else if (visiblePlayers().length === 0) {
          <p class="pelada-muted empty-hint">Nenhum jogador encontrado. Tente outro nome ou filtro.</p>
        } @else {
          <ul class="roster-list">
            @for (p of visiblePlayers(); track p.id) {
              <li>
                <a [routerLink]="['/jogadores', p.id]" class="roster-row">
                  <pelada-avatar [name]="p.displayName" size="small" tone="lime" />
                  <span class="roster-row__main">
                    <span class="roster-row__name">{{ p.displayName }}</span>
                    <span class="roster-row__meta pelada-muted">
                      {{ rosterPositionLabel(p) }}
                      @if (p.tags.length) {
                        · {{ p.tags.join(', ') }}
                      }
                      @if (showFixedChip() && p.isFixedList) {
                        · <span class="chip-fixed">Fixo</span>
                      }
                    </span>
                  </span>
                  <span class="roster-row__rating" aria-label="Nota geral">
                    {{ formatRosterRating(p.rating) }}
                  </span>
                </a>
              </li>
            }
          </ul>
        }

        <button
          type="button"
          peladaButton
          variant="lime"
          [peladaButtonBlock]="true"
          (click)="onAddPlayer()"
        >
          + Adicionar jogador
        </button>
        @if (addHint()) {
          <p class="pelada-muted add-hint" role="status">{{ addHint() }}</p>
        }
      }
    </section>
  `,
  styles: [
    `
      pelada-segment,
      pelada-field {
        display: block;
        margin-bottom: var(--pelada-space-4);
      }
      .roster-list {
        list-style: none;
        margin: 0 0 var(--pelada-space-4);
        padding: 0;
      }
      .roster-row {
        display: flex;
        align-items: center;
        gap: var(--pelada-space-3);
        min-height: var(--pelada-touch-min);
        padding: var(--pelada-space-3) 0;
        border-bottom: 1px solid var(--pelada-line);
        text-decoration: none;
        color: inherit;
      }
      .roster-row__main {
        flex: 1;
        min-width: 0;
      }
      .roster-row__name {
        display: block;
        font-weight: 600;
      }
      .roster-row__meta {
        display: block;
        font-size: 0.875rem;
      }
      .roster-row__rating {
        font-weight: 700;
        font-size: 1.125rem;
        min-width: 2rem;
        text-align: right;
      }
      .chip-fixed {
        font-weight: 600;
        color: var(--pelada-accent);
      }
      .empty-hint,
      .add-hint {
        margin: 0 0 var(--pelada-space-3);
        font-size: 0.875rem;
      }
      [peladaButton] {
        margin-top: var(--pelada-space-2);
      }
    `,
  ],
})
export class JogadoresListaComponent implements OnInit {
  private readonly peladaContext = inject(PeladaContextService);
  private readonly rosterService = inject(PeladaRosterService);
  private readonly rulesService = inject(PeladaRulesService);

  readonly segmentOptions = ROSTER_SEGMENT_OPTIONS;
  readonly segment = model<RosterSegment>('all');
  readonly searchQuery = signal('');
  readonly players = signal<RosterPlayer[]>([]);
  readonly loading = signal(true);
  readonly addHint = signal('');
  readonly showFixedChip = signal(false);

  readonly rosterPositionLabel = rosterPositionLabel;
  readonly formatRosterRating = formatRosterRating;

  readonly visiblePlayers = computed(() =>
    filterRosterList(this.players(), this.segment(), this.searchQuery()),
  );

  readonly headerTitle = computed(() => {
    const n = this.players().length;
    return n === 1 ? '1 jogador no elenco' : `${n} jogadores no elenco`;
  });

  ngOnInit(): void {
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada) {
      this.loading.set(false);
      return;
    }
    const rules = this.rulesService.getDefaultRules(pelada.id);
    this.showFixedChip.set(rules.fixedListOnly);
    this.rosterService.loadRoster(pelada, (list) => {
      this.players.set(list);
      this.loading.set(false);
    });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  onAddPlayer(): void {
    this.addHint.set(
      'Cadastro e edição completos entram com a API 3.7-API (#25).',
    );
  }
}
