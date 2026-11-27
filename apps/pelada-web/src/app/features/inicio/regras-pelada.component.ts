import { PRESENCE_MODE_OPTIONS } from '../../core/match/create-match-form.logic';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, model, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import {
  DEFAULT_PELADA_RULES,
  type FixedGkRotation,
  type Modality,
  type PaymentModel,
  type ScoringMode,
  mapPeladaRulesApiError,
  scoringModeFromFlags,
  scoringModeToFlags,
  validatePeladaRulesForm,
  type PeladaRulesFormValues,
  UNPAID_POLICY_OPTIONS,
} from '../../core/pelada/pelada-rules.model';
import { PeladaRulesService } from '../../core/pelada/pelada-rules.service';
import { PeladaRulesApiService } from '../../core/pelada/pelada-rules-api.service';
import { STYLE_TAG_CATALOG_NAMES } from '../../core/roster/player-profile-tag-suggestions.logic';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaCardComponent } from '../../ui/card.component';
import { PeladaFieldComponent } from '../../ui/field.component';
import { PeladaInputDirective } from '../../ui/input.directive';
import { PeladaSegmentComponent } from '../../ui/segment.component';
import { PeladaSwitchComponent } from '../../ui/switch.component';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

@Component({
  selector: 'app-regras-pelada',
  standalone: true,
  imports: [
    RouterLink,
    ScreenHeaderComponent,
    PeladaCardComponent,
    PeladaFieldComponent,
    PeladaInputDirective,
    PeladaSwitchComponent,
    PeladaSegmentComponent,
    PeladaButtonComponent,
  ],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Início"
        title="Regras da pelada"
        [subtitle]="peladaName() + ' — padrão do grupo. Pode ser trocado por partida na criação.'"
      />

      @if (formError()) {
        <p class="pelada-field__error" role="alert">{{ formError() }}</p>
      }
      @if (savedMessage()) {
        <p class="pelada-text-ok" role="status">{{ savedMessage() }}</p>
      }

      @if (!rulesReady()) {
        <p class="pelada-muted">Carregando regras…</p>
      } @else {
      <pelada-card title="Formato">
        <pelada-field label="Jogadores de linha por time" forId="players-per-team">
          <input
            id="players-per-team"
            type="number"
            min="4"
            max="11"
            peladaInput
            [value]="values().playersPerTeam"
            (input)="patchNumber('playersPerTeam', $event)"
          />
        </pelada-field>
        <pelada-field label="Times no sorteio" forId="team-count" hint="Entre 2 e 6.">
          <input
            id="team-count"
            type="number"
            min="2"
            max="6"
            peladaInput
            [value]="values().teamCount"
            (input)="patchNumber('teamCount', $event)"
          />
        </pelada-field>
        <pelada-field
          label="Tempo de cada partida (minutos)"
          forId="round-minutes"
          hint="O cronômetro em campo para nesse tempo e zera a cada rodada. Entre 1 e 120."
        >
          <input
            id="round-minutes"
            type="number"
            min="1"
            max="120"
            peladaInput
            [value]="values().roundMinutes"
            (input)="patchNumber('roundMinutes', $event)"
          />
        </pelada-field>
        <pelada-field label="Modalidade" forId="modality">
          <select
            id="modality"
            peladaInput
            [value]="values().modality"
            (change)="patchModality($event)"
          >
            <option value="futsal">Futsal</option>
            <option value="society">Society</option>
            <option value="campo">Campo</option>
          </select>
        </pelada-field>
      </pelada-card>

      <pelada-card title="Goleiro">
        <pelada-switch
          [checked]="values().goalkeeperPerTeam"
          (checkedChange)="patchGkPerTeam($event)"
        >
          Um goleiro por time
        </pelada-switch>
        <pelada-switch
          [checked]="values().fixedGoalkeeper"
          (checkedChange)="patchFixedGk($event)"
        >
          Goleiro fixo no gol
        </pelada-switch>
        @if (values().fixedGoalkeeper) {
          <pelada-field label="Troca de time do goleiro fixo" forId="gk-rotation">
            <select
              id="gk-rotation"
              peladaInput
              [value]="values().fixedGkRotation"
              (change)="patchGkRotation($event)"
            >
              <option value="RESULT">Por resultado</option>
              <option value="SIDE">Por lado</option>
              <option value="MANUAL_ONLY">Só manual pelo adm</option>
            </select>
          </pelada-field>
        }
      </pelada-card>

      <pelada-card title="Presença e pagamento">
        <!-- Issue #234 — o adm escolhe como a presença é marcada. -->
        <p class="presence-mode__title">Como marcar presença</p>
        @for (opt of presenceOptions; track opt.value) {
          <label class="presence-option">
            <input
              type="radio"
              name="rules-presence-mode"
              [value]="opt.value"
              [checked]="values().presenceMode === opt.value"
              (change)="patchPresenceMode(opt.value)"
            />
            <span class="presence-option__main">
              <span class="presence-option__label">{{ opt.label }}</span>
              <span class="pelada-muted presence-option__hint">{{ opt.hint }}</span>
            </span>
          </label>
        }
        <pelada-field
          label="Vagas na lista de espera"
          forId="waitlist-slots"
          hint="0 = sem limite. Com a lista cheia, ninguém mais entra."
        >
          <input
            id="waitlist-slots"
            type="number"
            min="0"
            max="50"
            peladaInput
            [value]="values().waitlistSlots"
            (input)="patchNumber('waitlistSlots', $event)"
          />
        </pelada-field>
        <pelada-switch [(checked)]="fixedListOnly">
          Jogadores fixos na lista
        </pelada-switch>
        <p class="pelada-muted hint">
          Marcar jogadores como fixos no elenco só fica disponível com esta opção ligada.
        </p>
        <pelada-switch [(checked)]="autoFillQueueOnCapacityIncrease">
          Puxar a fila ao aumentar as vagas
        </pelada-switch>
        <p class="pelada-muted hint">
          Ligado: se as vagas de uma partida aumentarem antes do sorteio, os primeiros da fila
          entram automaticamente.
        </p>
        <pelada-switch [(checked)]="allowPlayerSelfEdit">
          Jogador edita o próprio perfil
        </pelada-switch>
        <p class="pelada-muted hint">
          Desligado: só o organizador altera nota, atributos e tags no elenco.
        </p>
        <pelada-field label="Modelo de pagamento">
          <pelada-segment [options]="paymentOptions" [(value)]="paymentSegment" />
        </pelada-field>
        <!-- Issue #263 — o que fazer com quem não pagou. -->
        <p class="unpaid-title">Quem não pagou</p>
        @for (opt of unpaidOptions; track opt.value) {
          <label class="unpaid-option">
            <input
              type="radio"
              name="rules-unpaid-policy"
              [value]="opt.value"
              [checked]="values().unpaidPolicy === opt.value"
              (change)="patchUnpaidPolicy(opt.value)"
            />
            <span class="unpaid-option__main">
              <span class="unpaid-option__label">{{ opt.label }}</span>
              <span class="pelada-muted unpaid-option__hint">{{ opt.hint }}</span>
            </span>
          </label>
        }
        <p class="pelada-muted hint">
          Em qualquer opção, a cobrança só entra como recebida no Caixa depois que o adm marca como paga.
        </p>
        <pelada-field
          label="Valor da contribuição por partida (R$)"
          forId="fee-reais"
          hint="Usado como sugestão ao lançar cobrança no Caixa. 0 = sem valor padrão."
        >
          <input
            id="fee-reais"
            type="number"
            min="0"
            step="0.01"
            peladaInput
            [value]="feeReais()"
            (input)="patchFeeReais($event)"
          />
        </pelada-field>
      </pelada-card>

      <pelada-card title="Sorteio">
        <pelada-field label="Modo">
          <pelada-segment [options]="drawOptions" [(value)]="drawSegment" />
        </pelada-field>
        <pelada-field label="Pontuação do sorteio">
          <pelada-segment [options]="scoringOptions" [(value)]="scoringSegment" />
        </pelada-field>
        <p class="pelada-muted hint">
          Nota geral ou atributos — só um dos dois entra no cálculo do sorteio.
        </p>
        <pelada-switch [(checked)]="drawUseStyleTags">Usar tags de estilo</pelada-switch>
      </pelada-card>

      <pelada-card title="Convidados">
        <pelada-field
          label="Promover Convidado a Jogador após nº de presenças"
          forId="auto-promote-presences"
          hint="0 desativa a promoção automática. Vale só para convidados que entraram por convite (vinculados a uma conta); convidado avulso de uma partida não é afetado."
        >
          <input
            id="auto-promote-presences"
            type="number"
            min="0"
            peladaInput
            [value]="values().autoPromoteAfterPresences"
            (input)="patchAutoPromoteAfterPresences($event)"
          />
        </pelada-field>
      </pelada-card>

      <pelada-card title="Tags de estilo">
        <p class="pelada-muted hint">
          Sugeridas no perfil do jogador: catálogo padrão ({{ catalogTagsPreview }}) + tags já usadas na pelada.
        </p>
        <pelada-field
          label="Tags extras do grupo (separadas por vírgula)"
          forId="custom-style-tags"
          hint="Somadas ao catálogo padrão nas sugestões de Editar perfil."
        >
          <input
            id="custom-style-tags"
            type="text"
            maxlength="300"
            peladaInput
            [value]="values().customStyleTagsText"
            (input)="patchCustomStyleTags($event)"
          />
        </pelada-field>
      </pelada-card>

      <button
        type="button"
        class="pelada-btn pelada-btn--block"
        peladaButton
        variant="lime"
        [disabled]="saving()"
        (click)="saveDefault()"
      >
        {{ saving() ? 'Salvando…' : 'Salvar como padrão' }}
      </button>
      }
      <a routerLink="/inicio" class="back-link">Voltar ao Início</a>
    </section>
  `,
  styles: [
    `
      .unpaid-title {
        margin: var(--pelada-space-3) 0 var(--pelada-space-2);
        font-weight: 700;
      }
      .unpaid-option {
        display: flex;
        gap: var(--pelada-space-2);
        align-items: flex-start;
        padding: var(--pelada-space-2) 0;
      }
      .unpaid-option__main {
        display: flex;
        flex-direction: column;
      }
      .unpaid-option__label {
        font-weight: 600;
      }
      .unpaid-option__hint {
        font-size: 0.8125rem;
      }
      .presence-mode__title {
        margin: 0 0 var(--pelada-space-2);
        font-weight: 700;
      }
      .presence-option {
        display: flex;
        gap: var(--pelada-space-2);
        align-items: flex-start;
        padding: var(--pelada-space-2) 0;
      }
      .presence-option__main {
        display: flex;
        flex-direction: column;
      }
      .presence-option__label {
        font-weight: 600;
      }
      .presence-option__hint {
        font-size: 0.8125rem;
      }
      pelada-card {
        display: block;
        margin-bottom: var(--pelada-space-4);
      }
      pelada-card pelada-switch {
        display: block;
        margin-bottom: var(--pelada-space-3);
      }
      .hint {
        font-size: 0.75rem;
        margin: 0 0 var(--pelada-space-3);
      }
      .back-link {
        display: inline-block;
        margin-top: var(--pelada-space-4);
        font-size: 0.875rem;
      }
    `,
  ],
})
export class RegrasPeladaComponent implements OnInit {
  private readonly peladaContext = inject(PeladaContextService);
  private readonly rulesService = inject(PeladaRulesService);
  private readonly rulesApi = inject(PeladaRulesApiService);
  private readonly router = inject(Router);

  readonly values = signal<PeladaRulesFormValues>({ ...DEFAULT_PELADA_RULES });
  readonly formError = signal<string | null>(null);
  readonly savedMessage = signal<string | null>(null);
  readonly saving = signal(false);
  readonly peladaName = signal('Pelada');
  /**
   * Só mostra o formulário depois do GET das regras: antes, o que a pessoa
   * mexia era sobrescrito em silêncio quando a resposta chegava (rede lenta).
   */
  readonly rulesReady = signal(false);

  readonly catalogTagsPreview = STYLE_TAG_CATALOG_NAMES.slice(0, 6).join(', ') + '…';

  /** Issue #190 — feeCents (API) exibido em reais no formulário. */
  readonly feeReais = computed(() => (this.values().feeCents / 100).toFixed(2));

  readonly paymentOptions = [
    { value: 'PER_MATCH', label: 'Por jogo' },
    { value: 'WEEKLY', label: 'Semanal' },
    { value: 'BIWEEKLY', label: 'Quinzenal' },
    { value: 'MONTHLY', label: 'Mensal' },
  ];

  readonly drawOptions = [
    { value: 'BALANCED', label: 'Equilibrado' },
    { value: 'RANDOM', label: 'Aleatório' },
    { value: 'MANUAL', label: 'Manual' },
  ];

  readonly scoringOptions = [
    { value: 'rating', label: 'Nota' },
    { value: 'attributes', label: 'Atributos' },
  ];

  readonly paymentSegment = model('PER_MATCH');
  readonly drawSegment = model('BALANCED');
  readonly fixedListOnly = model(false);
  /** Issue #230 */
  readonly autoFillQueueOnCapacityIncrease = model(false);
  readonly allowPlayerSelfEdit = model(false);
  readonly scoringSegment = model<ScoringMode>('rating');
  readonly drawUseStyleTags = model(true);

  ngOnInit(): void {
    this.peladaContext.refreshFromStorage();
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada) {
      void this.router.navigate(['/onboarding/pelada']);
      return;
    }
    this.peladaName.set(pelada.name);
    this.rulesApi.fetchRules(pelada.id).subscribe({
      next: (dto) => {
        const loaded = this.rulesApi.mapFromApi(dto);
        this.applyLoadedRules(loaded);
      },
      error: () => {
        this.applyLoadedRules(this.rulesService.getDefaultRules(pelada.id));
      },
    });
  }

  private applyLoadedRules(loaded: PeladaRulesFormValues): void {
    this.values.set(loaded);
    this.syncSegmentsFromValues(loaded);
    this.rulesReady.set(true);
  }

  readonly unpaidOptions = UNPAID_POLICY_OPTIONS;

  patchUnpaidPolicy(policy: PeladaRulesFormValues['unpaidPolicy']): void {
    this.values.update((v) => ({ ...v, unpaidPolicy: policy }));
  }

  readonly presenceOptions = PRESENCE_MODE_OPTIONS;

  patchPresenceMode(mode: PeladaRulesFormValues['presenceMode']): void {
    this.values.update((v) => ({ ...v, presenceMode: mode }));
  }

  patchNumber(
    field: 'playersPerTeam' | 'teamCount' | 'roundMinutes' | 'waitlistSlots',
    event: Event,
  ): void {
    const raw = (event.target as HTMLInputElement).value;
    const n = Number.parseInt(raw, 10);
    this.values.update((v) => ({ ...v, [field]: Number.isNaN(n) ? v[field] : n }));
    this.formError.set(null);
  }

  patchModality(event: Event): void {
    const modality = (event.target as HTMLSelectElement).value as Modality;
    this.values.update((v) => ({ ...v, modality }));
  }

  patchGkPerTeam(checked: boolean): void {
    this.values.update((v) => ({ ...v, goalkeeperPerTeam: checked }));
    this.formError.set(null);
  }

  patchFixedGk(checked: boolean): void {
    this.values.update((v) => ({ ...v, fixedGoalkeeper: checked }));
    this.formError.set(null);
  }

  patchGkRotation(event: Event): void {
    const fixedGkRotation = (event.target as HTMLSelectElement)
      .value as FixedGkRotation;
    this.values.update((v) => ({ ...v, fixedGkRotation }));
  }

  patchCustomStyleTags(event: Event): void {
    const customStyleTagsText = (event.target as HTMLInputElement).value;
    this.values.update((v) => ({ ...v, customStyleTagsText }));
  }

  patchAutoPromoteAfterPresences(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const n = Number.parseInt(raw, 10);
    this.values.update((v) => ({
      ...v,
      autoPromoteAfterPresences: Number.isNaN(n) || n < 0 ? v.autoPromoteAfterPresences : n,
    }));
    this.formError.set(null);
  }

  patchFeeReais(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const reais = Number.parseFloat(raw);
    this.values.update((v) => ({
      ...v,
      feeCents:
        Number.isNaN(reais) || reais < 0 ? v.feeCents : Math.round(reais * 100),
    }));
    this.formError.set(null);
  }

  saveDefault(): void {
    this.peladaContext.refreshFromStorage();
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada) {
      this.formError.set(
        'Nenhuma pelada ativa. Crie ou selecione uma pelada para salvar as regras.',
      );
      this.savedMessage.set(null);
      void this.router.navigate(['/onboarding/pelada']);
      return;
    }
    const merged = this.mergeSegmentsIntoValues();
    const err = validatePeladaRulesForm(merged);
    if (err) {
      this.formError.set(err);
      this.savedMessage.set(null);
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    this.rulesApi.saveRules(pelada.id, merged).subscribe({
      next: () => {
        this.rulesService.saveDefaultRules(pelada.id, merged);
        this.values.set(merged);
        this.formError.set(null);
        this.savedMessage.set('Regras salvas como padrão do grupo.');
        this.saving.set(false);
        void this.router.navigate(['/inicio']);
      },
      error: (httpErr: HttpErrorResponse) => {
        this.formError.set(mapPeladaRulesApiError(httpErr));
        this.savedMessage.set(null);
        this.saving.set(false);
      },
    });
  }

  private mergeSegmentsIntoValues(): PeladaRulesFormValues {
    return {
      ...this.values(),
      fixedListOnly: this.fixedListOnly(),
      autoFillQueueOnCapacityIncrease: this.autoFillQueueOnCapacityIncrease(),
      allowPlayerSelfEdit: this.allowPlayerSelfEdit(),
      paymentModel: this.paymentSegment() as PaymentModel,
      drawMode: this.drawSegment() as PeladaRulesFormValues['drawMode'],
      ...scoringModeToFlags(this.scoringSegment()),
      drawUseStyleTags: this.drawUseStyleTags(),
    };
  }

  private syncSegmentsFromValues(v: PeladaRulesFormValues): void {
    this.fixedListOnly.set(v.fixedListOnly);
    this.autoFillQueueOnCapacityIncrease.set(v.autoFillQueueOnCapacityIncrease);
    this.allowPlayerSelfEdit.set(v.allowPlayerSelfEdit);
    this.paymentSegment.set(v.paymentModel);
    this.drawSegment.set(v.drawMode);
    this.scoringSegment.set(
      scoringModeFromFlags(v.drawUseRating, v.drawUseAttributes ?? true),
    );
    this.drawUseStyleTags.set(v.drawUseStyleTags);
  }
}
