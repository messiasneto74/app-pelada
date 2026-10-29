import { Component, inject, model, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import {
  DEFAULT_PELADA_RULES,
  type FixedGkRotation,
  type Modality,
  type PaymentModel,
  validatePeladaRulesForm,
  type PeladaRulesFormValues,
} from '../../core/pelada/pelada-rules.model';
import { PeladaRulesService } from '../../core/pelada/pelada-rules.service';
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
        [subtitle]="peladaName() + ' — padrão do grupo (história 3.2). Exceção por partida na criação (3.3).'"
      />

      @if (formError()) {
        <p class="pelada-field__error" role="alert">{{ formError() }}</p>
      }
      @if (savedMessage()) {
        <p class="pelada-text-ok" role="status">{{ savedMessage() }}</p>
      }

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
        <pelada-switch [(checked)]="fixedListOnly">
          Jogadores fixos na lista
        </pelada-switch>
        <p class="pelada-muted hint">
          Marcar jogadores como fixos no elenco só fica disponível com esta opção ligada.
        </p>
        <pelada-field label="Modelo de pagamento">
          <pelada-segment [options]="paymentOptions" [(value)]="paymentSegment" />
        </pelada-field>
      </pelada-card>

      <pelada-card title="Sorteio">
        <pelada-field label="Modo">
          <pelada-segment [options]="drawOptions" [(value)]="drawSegment" />
        </pelada-field>
        <pelada-switch [(checked)]="drawUseRating">Usar nota</pelada-switch>
        <pelada-switch [(checked)]="drawUseAttributes">Usar atributos</pelada-switch>
        <pelada-switch [(checked)]="drawUseStyleTags">Usar tags de estilo</pelada-switch>
      </pelada-card>

      <button
        type="button"
        class="pelada-btn pelada-btn--block"
        peladaButton
        variant="lime"
        (click)="saveDefault()"
      >
        Salvar como padrão
      </button>
      <a routerLink="/inicio" class="back-link">Voltar ao Início</a>
    </section>
  `,
  styles: [
    `
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
  private readonly router = inject(Router);

  readonly values = signal<PeladaRulesFormValues>({ ...DEFAULT_PELADA_RULES });
  readonly formError = signal<string | null>(null);
  readonly savedMessage = signal<string | null>(null);
  readonly peladaName = signal('Pelada');

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

  readonly paymentSegment = model('PER_MATCH');
  readonly drawSegment = model('BALANCED');
  readonly fixedListOnly = model(false);
  readonly drawUseRating = model(true);
  readonly drawUseAttributes = model(true);
  readonly drawUseStyleTags = model(true);

  ngOnInit(): void {
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada) {
      void this.router.navigate(['/onboarding/pelada']);
      return;
    }
    this.peladaName.set(pelada.name);
    const loaded = this.rulesService.getDefaultRules(pelada.id);
    this.values.set(loaded);
    this.syncSegmentsFromValues(loaded);
  }

  patchNumber(field: 'playersPerTeam' | 'teamCount', event: Event): void {
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

  saveDefault(): void {
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada) {
      return;
    }
    const merged = this.mergeSegmentsIntoValues();
    const err = validatePeladaRulesForm(merged);
    if (err) {
      this.formError.set(err);
      this.savedMessage.set(null);
      return;
    }
    this.rulesService.saveDefaultRules(pelada.id, merged);
    this.values.set(merged);
    this.formError.set(null);
    this.savedMessage.set('Regras salvas como padrão do grupo.');
  }

  private mergeSegmentsIntoValues(): PeladaRulesFormValues {
    return {
      ...this.values(),
      fixedListOnly: this.fixedListOnly(),
      paymentModel: this.paymentSegment() as PaymentModel,
      drawMode: this.drawSegment() as PeladaRulesFormValues['drawMode'],
      drawUseRating: this.drawUseRating(),
      drawUseAttributes: this.drawUseAttributes(),
      drawUseStyleTags: this.drawUseStyleTags(),
    };
  }

  private syncSegmentsFromValues(v: PeladaRulesFormValues): void {
    this.fixedListOnly.set(v.fixedListOnly);
    this.paymentSegment.set(v.paymentModel);
    this.drawSegment.set(v.drawMode);
    this.drawUseRating.set(v.drawUseRating);
    this.drawUseAttributes.set(v.drawUseAttributes ?? true);
    this.drawUseStyleTags.set(v.drawUseStyleTags);
  }
}
