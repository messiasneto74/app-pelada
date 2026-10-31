import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaRulesService } from '../../core/pelada/pelada-rules.service';
import type { PeladaPlayerProfileDto } from '../../core/roster/pelada-player-profile-api.model';
import { PeladaPlayerProfileService } from '../../core/roster/pelada-player-profile.service';
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
  ],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Elenco"
        title="Perfil do jogador"
        subtitle="Nota e atributos usados no sorteio (§3.8)."
      />

      @if (loading()) {
        <p class="pelada-muted">Carregando perfil…</p>
      } @else if (!profile()) {
        <pelada-card title="Jogador não encontrado">
          <p class="pelada-muted">Volte à lista e tente novamente.</p>
          <a routerLink="/jogadores" peladaButton variant="ghost">Voltar ao elenco</a>
        </pelada-card>
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
            (click)="onEditProfile()"
          >
            Editar perfil (adm)
          </button>
          @if (editHint()) {
            <p class="pelada-muted edit-hint" role="status">{{ editHint() }}</p>
          }
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
      .plan-label {
        margin: 0 0 var(--pelada-space-1);
        font-weight: 600;
        font-size: 1.125rem;
      }
      .plan-hint,
      .edit-hint {
        margin: var(--pelada-space-2) 0 0;
        font-size: 0.875rem;
      }
      [peladaButton] {
        margin-top: var(--pelada-space-3);
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
  private readonly rulesService = inject(PeladaRulesService);
  private readonly orgContext = inject(PeladaOrganizadorContextService);
  private readonly authService = inject(AuthService);

  readonly loading = signal(true);
  readonly profile = signal<PeladaPlayerProfileDto | null>(null);
  readonly editHint = signal('');
  readonly currentAppUserId = signal<string | null>(null);

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

  readonly showEdit = computed(() => {
    const p = this.profile();
    const pelada = this.peladaContext.getActivePelada();
    if (!p || !pelada) return false;
    const rules = this.rulesService.getDefaultRules(pelada.id);
    return canShowEditProfile({
      isOrganizador: this.orgContext.isOrganizador(pelada.id),
      allowPlayerSelfEdit: rules.allowPlayerSelfEdit,
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
    void this.authService
      .getMe()
      .then((me) => this.currentAppUserId.set(me.id))
      .catch(() => this.currentAppUserId.set(null));
    this.profileService.loadProfile(pelada, playerId, (dto) => {
      this.profile.set(dto);
      this.loading.set(false);
    });
  }

  onEditProfile(): void {
    this.editHint.set(
      'Formulário de edição entra na issue 3.8-EDIT (modo adm + regra 27).',
    );
  }
}
