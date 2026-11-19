import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, model, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PeladaApiService } from '../../core/pelada/pelada-api.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import { PeladaRulesApiService } from '../../core/pelada/pelada-rules-api.service';
import { PeladaRulesService } from '../../core/pelada/pelada-rules.service';
import { PeladaRosterService } from '../../core/roster/pelada-roster.service';
import {
  normalizeCreatePlayerName,
  rosterCreateErrorMessage,
  validateCreatePlayerName,
} from '../../core/roster/roster-create.logic';
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
import { PeladaQrCodeComponent } from '../../ui/qr-code.component';
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
    PeladaQrCodeComponent,
  ],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Elenco"
        [title]="headerTitle()"
        subtitle="Busca, filtros e acesso ao perfil."
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

        @if (isOrganizador()) {
          <button
            type="button"
            peladaButton
            variant="lime"
            [peladaButtonBlock]="true"
            (click)="openAddPlayerModal()"
          >
            + Adicionar jogador
          </button>
          <button
            type="button"
            peladaButton
            variant="secondary"
            [peladaButtonBlock]="true"
            (click)="openInviteModal()"
          >
            Convidar jogador (link/QR)
          </button>
        }
        @if (addHint()) {
          <p class="pelada-muted add-hint" role="status">{{ addHint() }}</p>
        }

        @if (isOrganizador() && guests().length > 0) {
          <pelada-card title="Convidados" class="guests-card">
            <p class="pelada-muted hint">
              Entraram por convite. Promova pra Jogador quando fizer sentido pro grupo.
            </p>
            <ul class="roster-list">
              @for (g of guests(); track g.id) {
                <li class="guest-row">
                  <pelada-avatar [name]="g.displayName" size="small" tone="lime" />
                  <span class="roster-row__main">
                    <span class="roster-row__name">{{ g.displayName }}</span>
                  </span>
                  <button
                    type="button"
                    peladaButton
                    variant="ghost"
                    [disabled]="promotingId() === g.id"
                    (click)="promoteGuest(g.id)"
                  >
                    {{ promotingId() === g.id ? 'Promovendo…' : 'Promover' }}
                  </button>
                </li>
              }
            </ul>
          </pelada-card>
        }
      }

      @if (addModalOpen()) {
        <div
          class="add-modal-backdrop"
          role="presentation"
          (click)="cancelAddPlayerModal()"
        >
          <div
            class="add-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-player-title"
            (click)="$event.stopPropagation()"
            (keydown.escape)="cancelAddPlayerModal()"
          >
            <h2 id="add-player-title" class="add-modal__title">Novo jogador</h2>
            <form class="add-modal__form" (submit)="submitNewPlayer($event)">
              <pelada-field label="Nome do jogador" forId="new-player-name">
                <input
                  id="new-player-name"
                  type="text"
                  peladaInput
                  name="displayName"
                  [value]="newPlayerName()"
                  (input)="onNewPlayerNameInput($event)"
                  maxlength="60"
                  autocomplete="name"
                  required
                />
              </pelada-field>
              <label class="add-modal__check">
                <input
                  type="checkbox"
                  [checked]="newPlayerGoalkeeper()"
                  (change)="onNewPlayerGoalkeeper($event)"
                />
                Goleiro
              </label>
              @if (showFixedChip()) {
                <label class="add-modal__check">
                  <input
                    type="checkbox"
                    [checked]="newPlayerFixedList()"
                    (change)="onNewPlayerFixedList($event)"
                  />
                  Fixo na lista
                </label>
              }
              @if (addModalError()) {
                <p class="add-modal__error" role="alert">{{ addModalError() }}</p>
              }
              <div class="add-modal__actions">
                <button
                  type="submit"
                  peladaButton
                  variant="lime"
                  [peladaButtonBlock]="true"
                  [disabled]="savingPlayer()"
                >
                  {{ savingPlayer() ? 'Salvando…' : 'Adicionar jogador' }}
                </button>
                <button
                  type="button"
                  peladaButton
                  variant="secondary"
                  [peladaButtonBlock]="true"
                  (click)="cancelAddPlayerModal()"
                  [disabled]="savingPlayer()"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (inviteModalOpen()) {
        <div
          class="add-modal-backdrop"
          role="presentation"
          (click)="closeInviteModal()"
        >
          <div
            class="add-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-title"
            (click)="$event.stopPropagation()"
            (keydown.escape)="closeInviteModal()"
          >
            <h2 id="invite-title" class="add-modal__title">Convidar jogador</h2>
            @if (inviteLoading()) {
              <p class="pelada-muted">Gerando convite…</p>
            } @else if (inviteError()) {
              <p class="add-modal__error" role="alert">{{ inviteError() }}</p>
            } @else if (inviteLink()) {
              <p class="pelada-muted hint">
                Válido por 5 horas, uso único. Compartilhe o link ou mostre o QR code.
              </p>
              <pelada-qr-code [value]="inviteLink()!" [pixelSize]="200" />
              <pelada-field label="Link do convite" forId="invite-link">
                <input
                  id="invite-link"
                  type="text"
                  peladaInput
                  readonly
                  [value]="inviteLink()!"
                  (click)="copyInviteLink()"
                />
              </pelada-field>
              @if (inviteCopied()) {
                <p class="pelada-text-ok" role="status">Link copiado!</p>
              }
              <button
                type="button"
                peladaButton
                variant="lime"
                [peladaButtonBlock]="true"
                (click)="copyInviteLink()"
              >
                Copiar link
              </button>

              <pelada-field label="Ou envie por e-mail (opcional)" forId="invite-email">
                <input
                  id="invite-email"
                  type="email"
                  peladaInput
                  placeholder="jogador@example.com"
                  [value]="inviteEmail()"
                  (input)="patchInviteEmail($event)"
                />
              </pelada-field>
              @if (emailSendMessage()) {
                <p class="pelada-muted hint" role="status">{{ emailSendMessage() }}</p>
              }
              <button
                type="button"
                peladaButton
                variant="secondary"
                [peladaButtonBlock]="true"
                [disabled]="sendingEmailInvite() || !inviteEmail()"
                (click)="sendInviteByEmail()"
              >
                {{ sendingEmailInvite() ? 'Enviando…' : 'Enviar convite por e-mail' }}
              </button>
            }
            <button
              type="button"
              peladaButton
              variant="secondary"
              [peladaButtonBlock]="true"
              (click)="closeInviteModal()"
            >
              Fechar
            </button>
          </div>
        </div>
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
      .add-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: var(--pelada-space-4);
        background: rgba(0, 0, 0, 0.55);
      }
      .add-modal {
        width: min(100%, 24rem);
        max-height: min(90vh, 32rem);
        overflow-y: auto;
        padding: var(--pelada-space-4);
        border-radius: var(--pelada-radius-lg);
        background: var(--pelada-paper, #ffffff);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
      }
      .add-modal__title {
        margin: 0 0 var(--pelada-space-4);
        font-size: 1.125rem;
      }
      .add-modal__form pelada-field {
        margin-bottom: var(--pelada-space-3);
      }
      .add-modal__check {
        display: flex;
        align-items: center;
        gap: var(--pelada-space-2);
        margin: 0 0 var(--pelada-space-3);
        font-size: 0.9375rem;
        cursor: pointer;
      }
      .add-modal__error {
        margin: 0 0 var(--pelada-space-3);
        font-size: 0.875rem;
        color: var(--pelada-danger, #e85d5d);
      }
      .add-modal__actions {
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-2);
        margin-top: var(--pelada-space-4);
      }
      .guests-card {
        display: block;
        margin-top: var(--pelada-space-4);
      }
      .guest-row {
        display: flex;
        align-items: center;
        gap: var(--pelada-space-3);
        padding: var(--pelada-space-2) 0;
        border-bottom: 1px solid var(--pelada-line);
      }
      pelada-qr-code {
        display: block;
        text-align: center;
        margin: 0 0 var(--pelada-space-4);
      }
    `,
  ],
})
export class JogadoresListaComponent implements OnInit {
  private readonly peladaContext = inject(PeladaContextService);
  private readonly rosterService = inject(PeladaRosterService);
  private readonly rulesService = inject(PeladaRulesService);
  private readonly rulesApi = inject(PeladaRulesApiService);
  private readonly orgContext = inject(PeladaOrganizadorContextService);
  private readonly peladaApi = inject(PeladaApiService);

  readonly segmentOptions = ROSTER_SEGMENT_OPTIONS;
  readonly segment = model<RosterSegment>('all');
  readonly searchQuery = signal('');
  readonly players = signal<RosterPlayer[]>([]);
  readonly loading = signal(true);
  readonly addHint = signal('');
  readonly showFixedChip = signal(false);
  readonly addModalOpen = signal(false);
  readonly newPlayerName = signal('');
  readonly newPlayerGoalkeeper = signal(false);
  readonly newPlayerFixedList = signal(false);
  readonly addModalError = signal('');
  readonly savingPlayer = signal(false);

  readonly guests = signal<RosterPlayer[]>([]);
  readonly promotingId = signal<string | null>(null);

  readonly inviteModalOpen = signal(false);
  readonly inviteLoading = signal(false);
  readonly inviteToken = signal<string | null>(null);
  readonly inviteLink = signal<string | null>(null);
  readonly inviteError = signal('');
  readonly inviteCopied = signal(false);
  /** Issue #179b — mesmo convite (token) também reenviado por e-mail. */
  readonly inviteEmail = signal('');
  readonly sendingEmailInvite = signal(false);
  readonly emailSendMessage = signal<string | null>(null);

  readonly rosterPositionLabel = rosterPositionLabel;
  readonly formatRosterRating = formatRosterRating;

  readonly visiblePlayers = computed(() =>
    filterRosterList(this.players(), this.segment(), this.searchQuery()),
  );

  readonly headerTitle = computed(() => {
    const n = this.players().length;
    return n === 1 ? '1 jogador no elenco' : `${n} jogadores no elenco`;
  });

  readonly isOrganizador = computed(() => {
    const pelada = this.peladaContext.activePelada();
    return pelada ? this.orgContext.isOrganizador(pelada.id) : false;
  });

  ngOnInit(): void {
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada) {
      this.loading.set(false);
      return;
    }
    this.orgContext.refreshMembership(pelada.id);
    this.syncRulesFromApi(pelada.id);
    this.rosterService.loadRoster(pelada, (list, _outcome) => {
      this.players.set(list);
      this.loading.set(false);
    });
    this.rosterService.loadGuests(pelada, (list, _outcome) => {
      this.guests.set(list);
    });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  openAddPlayerModal(): void {
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada) {
      return;
    }
    this.addHint.set('');
    this.addModalError.set('');
    this.newPlayerName.set('');
    this.newPlayerGoalkeeper.set(false);
    this.newPlayerFixedList.set(false);
    this.syncRulesFromApi(pelada.id, () => this.addModalOpen.set(true));
  }

  private syncRulesFromApi(peladaId: string, onReady?: () => void): void {
    this.rulesApi.fetchRules(peladaId).subscribe({
      next: (dto) => {
        this.showFixedChip.set(this.rulesApi.mapFromApi(dto).fixedListOnly);
        onReady?.();
      },
      error: () => {
        const rules = this.rulesService.getDefaultRules(peladaId);
        this.showFixedChip.set(rules.fixedListOnly);
        onReady?.();
      },
    });
  }

  cancelAddPlayerModal(): void {
    if (this.savingPlayer()) {
      return;
    }
    this.addModalOpen.set(false);
    this.addModalError.set('');
  }

  onNewPlayerNameInput(event: Event): void {
    this.newPlayerName.set((event.target as HTMLInputElement).value);
    this.addModalError.set('');
  }

  onNewPlayerGoalkeeper(event: Event): void {
    this.newPlayerGoalkeeper.set(
      (event.target as HTMLInputElement).checked,
    );
  }

  onNewPlayerFixedList(event: Event): void {
    this.newPlayerFixedList.set((event.target as HTMLInputElement).checked);
  }

  submitNewPlayer(event: Event): void {
    event.preventDefault();
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada || this.savingPlayer()) {
      return;
    }

    const validation = validateCreatePlayerName(this.newPlayerName());
    if (validation) {
      this.addModalError.set(validation);
      return;
    }

    const displayName = normalizeCreatePlayerName(this.newPlayerName());
    const body: {
      displayName: string;
      isGoalkeeper?: boolean;
      isFixedList?: boolean;
    } = {
      displayName,
      isGoalkeeper: this.newPlayerGoalkeeper() || undefined,
    };
    if (this.showFixedChip() && this.newPlayerFixedList()) {
      body.isFixedList = true;
    }

    this.savingPlayer.set(true);
    this.addModalError.set('');

    this.rosterService.createPlayer(pelada, body).subscribe({
      next: (created) => {
        this.players.update((list) =>
          [...list, created].sort((a, b) =>
            a.displayName.localeCompare(b.displayName, 'pt-BR'),
          ),
        );
        this.savingPlayer.set(false);
        this.addModalOpen.set(false);
        this.addHint.set('');
      },
      error: (err: HttpErrorResponse) => {
        this.savingPlayer.set(false);
        const apiMsg =
          typeof err.error === 'object' &&
          err.error !== null &&
          'message' in err.error
            ? String((err.error as { message: unknown }).message)
            : undefined;
        this.addModalError.set(
          rosterCreateErrorMessage(err.status, apiMsg),
        );
      },
    });
  }

  promoteGuest(playerId: string): void {
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada || this.promotingId()) {
      return;
    }
    this.promotingId.set(playerId);
    this.rosterService.promoteGuest(pelada, playerId).subscribe({
      next: () => {
        this.guests.update((list) => list.filter((g) => g.id !== playerId));
        this.promotingId.set(null);
        this.rosterService.loadRoster(pelada, (list) => this.players.set(list));
      },
      error: () => {
        this.promotingId.set(null);
      },
    });
  }

  openInviteModal(): void {
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada) {
      return;
    }
    this.inviteModalOpen.set(true);
    this.inviteLoading.set(true);
    this.inviteError.set('');
    this.inviteToken.set(null);
    this.inviteLink.set(null);
    this.inviteCopied.set(false);
    this.inviteEmail.set('');
    this.emailSendMessage.set(null);

    this.peladaApi
      .createInvite(pelada.id)
      .then((created) => {
        this.inviteToken.set(created.token);
        this.inviteLink.set(`${window.location.origin}/convite/${created.token}`);
        this.inviteLoading.set(false);
      })
      .catch(() => {
        this.inviteError.set('Não foi possível gerar o convite. Tente de novo.');
        this.inviteLoading.set(false);
      });
  }

  closeInviteModal(): void {
    this.inviteModalOpen.set(false);
  }

  patchInviteEmail(event: Event): void {
    this.inviteEmail.set((event.target as HTMLInputElement).value);
    this.emailSendMessage.set(null);
  }

  /** Issue #179b — reenvia o MESMO convite (token já gerado por `openInviteModal`) por e-mail. */
  sendInviteByEmail(): void {
    const token = this.inviteToken();
    const email = this.inviteEmail().trim();
    if (!token || !email) {
      return;
    }
    this.sendingEmailInvite.set(true);
    this.emailSendMessage.set(null);

    this.peladaApi
      .sendInviteEmail(token, email)
      .then((result) => {
        this.sendingEmailInvite.set(false);
        this.emailSendMessage.set(
          result.emailSent
            ? `Convite enviado para ${email}.`
            : 'Não foi possível enviar o e-mail agora — use o link ou o QR code.',
        );
      })
      .catch(() => {
        this.sendingEmailInvite.set(false);
        this.emailSendMessage.set('Não foi possível enviar o convite. Tente de novo.');
      });
  }

  copyInviteLink(): void {
    const link = this.inviteLink();
    if (!link || !navigator.clipboard) {
      return;
    }
    navigator.clipboard
      .writeText(link)
      .then(() => {
        this.inviteCopied.set(true);
      })
      .catch(() => {
        /* clipboard indisponível (ex.: contexto não seguro) — link já está visível no campo */
      });
  }
}