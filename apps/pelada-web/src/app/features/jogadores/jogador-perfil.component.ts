import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaRulesApiService } from '../../core/pelada/pelada-rules-api.service';
import type { PeladaPlayerProfileDto } from '../../core/roster/pelada-player-profile-api.model';
import { PeladaPlayerProfileService } from '../../core/roster/pelada-player-profile.service';
import {
  buildPatchFromForm,
  editProfileButtonLabel,
  profileToEditForm,
  type PlayerProfileEditForm,
} from '../../core/roster/player-profile-edit.logic';
import {
  attributeBarPercent,
  canShowEditProfile,
  paymentPlanLabel,
  PLAYER_PROFILE_ATTRIBUTES,
} from '../../core/roster/player-profile.logic';
import {
  formatRosterRating,
  rosterPositionLabel,
} from '../../core/roster/roster-list.logic';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import { PeladaAvatarComponent } from '../../ui/avatar.component';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaCardComponent } from '../../ui/card.component';
import { PeladaChipComponent } from '../../ui/chip.component';
import { PeladaFieldComponent } from '../../ui/field.component';
import { PeladaProgressComponent } from '../../ui/progress.component';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

@Component({
  selector: 'app-jogador-perfil',
  standalone: true,
  imports: [
    RouterLink,
    ScreenHeaderComponent,
    PeladaCardComponent,
    PeladaChipComponent,
    PeladaProgressComponent,
    PeladaButtonComponent,
    PeladaAvatarComponent,
    PeladaFieldComponent,
  ],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Elenco"
        [title]="editing() ? 'Editar perfil' : 'Perfil do jogador'"
        subtitle="Nota e atributos usados no sorteio (§3.8)."
      />

      @if (loading()) {
        <p class="pelada-muted">Carregando perfil…</p>
      } @else if (!profile()) {
        <pelada-card title="Jogador não encontrado">
          <p class="pelada-muted">Volte à lista e tente novamente.</p>
          <a routerLink="/jogadores" peladaButton variant="ghost">Voltar ao elenco</a>
        </pelada-card>
      } @else if (editing()) {
        <form class="edit-form" (submit)="onSave($event)">
          <pelada-card title="Nota e tags">
            <pelada-field label="Nota geral (1–10)" forId="profile-rating">
              <input
                id="profile-rating"
                class="pelada-input"
                type="number"
                min="1"
                max="10"
                step="1"
                [value]="editForm().rating"
                (input)="patchRating($event)"
                required
              />
            </pelada-field>
            <pelada-field
              label="Tags (separadas por vírgula)"
              forId="profile-tags"
              hint="Estilo de jogo — ex.: corredor, passe"
            >
              <input
                id="profile-tags"
                class="pelada-input"
                type="text"
                maxlength="120"
                [value]="editForm().tagsText"
                (input)="patchTagsText($event)"
              />
            </pelada-field>
            @if (isOrganizador()) {
              <pelada-field label="Plano de pagamento" forId="profile-plan">
                <select
                  id="profile-plan"
                  class="pelada-input"
                  [value]="editForm().paymentPlan"
                  (change)="patchPaymentPlan($event)"
                >
                  <option value="PER_MATCH">Por partida</option>
                  <option value="MONTHLY">Mensalista</option>
                </select>
              </pelada-field>
            }
          </pelada-card>

          <pelada-card title="Atributos">
            <ul class="attr-list">
              @for (attr of attributeDefs; track attr.key) {
                <li>
                  <div class="attr-row">
                    <label [attr.for]="'attr-' + attr.key">{{ attr.label }}</label>
                    <span class="attr-value">{{ editForm().attributes[attr.key] }}/10</span>
                  </div>
                  <input
                    [id]="'attr-' + attr.key"
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    class="attr-range"
                    [value]="editForm().attributes[attr.key]"
                    (input)="patchAttribute(attr.key, $event)"
                  />
                </li>
              }
            </ul>
          </pelada-card>

          @if (saveError()) {
            <p class="pelada-field__error" role="alert">{{ saveError() }}</p>
          }

          <div class="edit-actions">
            <button
              type="button"
              peladaButton
              variant="ghost"
              (click)="cancelEdit()"
            >
              Cancelar
            </button>
            <button
              type="submit"
              peladaButton
              variant="lime"
              [disabled]="saving()"
            >
              {{ saving() ? 'Salvando…' : 'Salvar perfil' }}
            </button>
          </div>
        </form>
      } @else {
        <div class="profile-hero">
          <pelada-avatar [name]="profile()!.displayName" tone="lime" />
          <h2 class="profile-name">{{ profile()!.displayName }}</h2>
          <p class="pelada-muted profile-meta">
            {{ positionLabel() }}
            · Nota {{ formatRosterRating(profile()!.rating) }}
          </p>
        </div>

        @if (profile()!.tags.length) {
          <div class="tag-row">
            @for (tag of profile()!.tags; track tag) {
              <pelada-chip variant="dark">{{ tag }}</pelada-chip>
            }
          </div>
        }

        <pelada-card title="Atributos">
          <ul class="attr-list">
            @for (attr of attributeRows(); track attr.key) {
              <li>
                <div class="attr-row">
                  <span>{{ attr.label }}</span>
                  <span class="attr-value">{{ attr.value }}/10</span>
                </div>
                <pelada-progress [value]="attr.barPercent" />
              </li>
            }
          </ul>
        </pelada-card>

        <pelada-card title="Pagamento">
          <p class="plan-label">{{ paymentLabel() }}</p>
          <p class="pelada-muted plan-hint">
            Modelo individual do jogador (caixa §3.9).
          </p>
        </pelada-card>

        @if (showEdit()) {
          <button
            type="button"
            peladaButton
            variant="lime"
            [peladaButtonBlock]="true"
            (click)="startEdit()"
          >
            {{ editButtonLabel() }}
          </button>
        }

        <a routerLink="/jogadores" class="back-link pelada-muted">← Voltar ao elenco</a>
      }
    </section>
  `,
  styles: [
    `
      .profile-hero {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: var(--pelada-space-2);
        margin-bottom: var(--pelada-space-4);
      }
      .profile-hero pelada-avatar {
        --pelada-avatar-size: 4.5rem;
        font-size: 1.5rem;
      }
      .profile-name {
        margin: 0;
        font-size: 1.375rem;
      }
      .profile-meta {
        margin: 0;
      }
      .tag-row {
        display: flex;
        flex-wrap: wrap;
        gap: var(--pelada-space-2);
        margin-bottom: var(--pelada-space-4);
      }
      .attr-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .attr-list li + li {
        margin-top: var(--pelada-space-3);
      }
      .attr-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: var(--pelada-space-1);
        font-size: 0.875rem;
      }
      .attr-value {
        font-weight: 600;
      }
      .attr-range {
        width: 100%;
        accent-color: var(--pelada-lime);
      }
      .plan-label {
        margin: 0 0 var(--pelada-space-1);
        font-weight: 600;
        font-size: 1.125rem;
      }
      .plan-hint {
        margin: var(--pelada-space-2) 0 0;
        font-size: 0.875rem;
      }
      [peladaButton] {
        margin-top: var(--pelada-space-3);
      }
      .edit-form pelada-card + pelada-card {
        margin-top: var(--pelada-space-3);
      }
      .edit-actions {
        display: flex;
        gap: var(--pelada-space-2);
        margin-top: var(--pelada-space-4);
      }
      .edit-actions [peladaButton] {
        flex: 1;
        margin-top: 0;
      }
      .back-link {
        display: inline-block;
        margin-top: var(--pelada-space-4);
        min-height: var(--pelada-touch-min);
        line-height: var(--pelada-touch-min);
      }
    `,
  ],
})
export class JogadorPerfilComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly peladaContext = inject(PeladaContextService);
  private readonly profileService = inject(PeladaPlayerProfileService);
  private readonly rulesApi = inject(PeladaRulesApiService);
  private readonly orgContext = inject(PeladaOrganizadorContextService);
  private readonly authService = inject(AuthService);

  readonly loading = signal(true);
  readonly profile = signal<PeladaPlayerProfileDto | null>(null);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly tagsDirty = signal(false);
  readonly editForm = signal<PlayerProfileEditForm>({
    rating: 5,
    tagsText: '',
    paymentPlan: 'PER_MATCH',
    attributes: {
      tecnica: 5,
      forca: 5,
      chute: 5,
      passe: 5,
      defesa: 5,
      velocidade: 5,
    },
  });
  readonly currentAppUserId = signal<string | null>(null);
  readonly allowPlayerSelfEdit = signal(false);

  readonly formatRosterRating = formatRosterRating;
  readonly attributeDefs = PLAYER_PROFILE_ATTRIBUTES;

  readonly positionLabel = computed(() => {
    const p = this.profile();
    if (!p) return '';
    const rosterLike: RosterPlayer = {
      id: p.id,
      displayName: p.displayName,
      isGoalkeeper: p.isGoalkeeper,
      position: p.position,
      rating: p.rating,
      tags: p.tags,
      isFixedList: p.isFixedList,
      userId: p.userId,
    };
    return rosterPositionLabel(rosterLike);
  });

  readonly attributeRows = computed(() => {
    const attrs = this.profile()?.attributes ?? {};
    return PLAYER_PROFILE_ATTRIBUTES.map(({ key, label }) => {
      const value = attrs[key] ?? 5;
      return {
        key,
        label,
        value,
        barPercent: attributeBarPercent(value),
      };
    });
  });

  readonly paymentLabel = computed(() => {
    const plan = this.profile()?.paymentPlan ?? 'PER_MATCH';
    return paymentPlanLabel(plan);
  });

  readonly isOrganizador = computed(() => {
    const pelada = this.peladaContext.getActivePelada();
    return pelada ? this.orgContext.isOrganizador(pelada.id) : false;
  });

  readonly editButtonLabel = computed(() =>
    editProfileButtonLabel(this.isOrganizador()),
  );

  readonly showEdit = computed(() => {
    const p = this.profile();
    const pelada = this.peladaContext.getActivePelada();
    if (!p || !pelada) return false;
    return canShowEditProfile({
      isOrganizador: this.isOrganizador(),
      allowPlayerSelfEdit: this.allowPlayerSelfEdit(),
      playerUserId: p.userId,
      currentAppUserId: this.currentAppUserId(),
    });
  });

  ngOnInit(): void {
    const playerId = this.route.snapshot.paramMap.get('playerId');
    const pelada = this.peladaContext.getActivePelada();
    if (!playerId || !pelada) {
      this.loading.set(false);
      return;
    }
    this.orgContext.refreshMembership(pelada.id);
    this.rulesApi.fetchRules(pelada.id).subscribe({
      next: (dto) => {
        this.allowPlayerSelfEdit.set(
          this.rulesApi.mapFromApi(dto).allowPlayerSelfEdit,
        );
      },
      error: () => this.allowPlayerSelfEdit.set(false),
    });
    void this.authService
      .getMe()
      .then((me) => this.currentAppUserId.set(me.id))
      .catch(() => this.currentAppUserId.set(null));
    this.profileService.loadProfile(pelada, playerId, (dto) => {
      this.profile.set(dto);
      this.loading.set(false);
    });
  }

  startEdit(): void {
    const p = this.profile();
    if (!p) return;
    this.saveError.set('');
    this.tagsDirty.set(false);
    this.editForm.set(profileToEditForm(p));
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
    this.saveError.set('');
    this.tagsDirty.set(false);
  }

  patchRating(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.editForm.update((f) => ({ ...f, rating: value }));
  }

  patchTagsText(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.tagsDirty.set(true);
    this.editForm.update((f) => ({ ...f, tagsText: value }));
  }

  patchPaymentPlan(event: Event): void {
    const value = (event.target as HTMLSelectElement)
      .value as PlayerProfileEditForm['paymentPlan'];
    this.editForm.update((f) => ({ ...f, paymentPlan: value }));
  }

  patchAttribute(
    key: keyof PlayerProfileEditForm['attributes'],
    event: Event,
  ): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.editForm.update((f) => ({
      ...f,
      attributes: { ...f.attributes, [key]: value },
    }));
  }

  onSave(event: Event): void {
    event.preventDefault();
    const p = this.profile();
    const pelada = this.peladaContext.getActivePelada();
    if (!p || !pelada || this.saving()) return;

    this.saving.set(true);
    this.saveError.set('');
    const body = buildPatchFromForm(this.editForm(), this.isOrganizador(), {
      includeTags: this.tagsDirty(),
    });
    this.profileService.updateProfile(pelada.id, p.id, body).subscribe({
      next: (updated) => {
        this.profile.set(updated);
        this.editing.set(false);
        this.saving.set(false);
      },
      error: () => {
        this.saveError.set(
          'Não foi possível salvar. Verifique permissão ou conexão.',
        );
        this.saving.set(false);
      },
    });
  }
}
