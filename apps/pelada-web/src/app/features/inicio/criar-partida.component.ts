import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { peladaRulesFromApi } from '../../core/pelada/pelada-rules-api.mapper';
import { PeladaRulesApiService } from '../../core/pelada/pelada-rules-api.service';
import {
  buildCreateMatchRequest,
  defaultCreateMatchForm,
  PRESENCE_MODE_OPTIONS,
  rulesSummaryLine,
  validateCreateMatchForm,
  type CreateMatchFormValues,
} from '../../core/match/create-match-form.logic';
import { PeladaMatchCreateService } from '../../core/match/pelada-match-create.service';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaCardComponent } from '../../ui/card.component';
import { PeladaFieldComponent } from '../../ui/field.component';
import { PeladaInputDirective } from '../../ui/input.directive';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

@Component({
  selector: 'app-criar-partida',
  standalone: true,
  imports: [
    RouterLink,
    ScreenHeaderComponent,
    PeladaCardComponent,
    PeladaFieldComponent,
    PeladaInputDirective,
    PeladaButtonComponent,
  ],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Início"
        title="Criar partida"
        subtitle="Marca data, local e como a galera confirma presença (§3.3)."
      />

      @if (formError()) {
        <p class="pelada-field__error" role="alert">{{ formError() }}</p>
      }
      @if (submitError()) {
        <p class="pelada-field__error" role="alert">{{ submitError() }}</p>
      }

      <pelada-card title="Regras padrão desta pelada">
        @if (rulesSummary()) {
          <p class="rules-line">{{ rulesSummary() }}</p>
          <p class="pelada-muted rules-hint">
            Herdadas de Configurações → Regras. Exceções por partida entram depois (3.2-EXC).
          </p>
        } @else {
          <p class="pelada-muted">Carregando regras…</p>
        }
      </pelada-card>

      <form class="form" (submit)="onSubmit($event)">
        <pelada-card title="Quando e onde">
          <div class="row-2">
            <pelada-field label="Data" forId="match-date" [error]="fieldErrors().date">
              <input
                id="match-date"
                type="date"
                peladaInput
                [peladaInputInvalid]="!!fieldErrors().date"
                [value]="values().date"
                (input)="patchField('date', $event)"
                required
              />
            </pelada-field>
            <pelada-field label="Hora" forId="match-time" [error]="fieldErrors().time">
              <input
                id="match-time"
                type="time"
                peladaInput
                [peladaInputInvalid]="!!fieldErrors().time"
                [value]="values().time"
                (input)="patchField('time', $event)"
                required
              />
            </pelada-field>
          </div>
          <pelada-field label="Local" forId="match-location" [error]="fieldErrors().location">
            <input
              id="match-location"
              peladaInput
              maxlength="200"
              [value]="values().location"
              (input)="patchField('location', $event)"
              placeholder="Quadra, society ou endereço"
            />
          </pelada-field>
          <pelada-field
            label="Recado para a galera"
            forId="match-notes"
            hint="Opcional — lembrete de colete, chuva, etc."
          >
            <textarea
              id="match-notes"
              class="pelada-input notes"
              maxlength="500"
              rows="3"
              [value]="values().notes"
              (input)="patchField('notes', $event)"
            ></textarea>
          </pelada-field>
        </pelada-card>

        <pelada-card title="Modo de presença">
          @for (opt of presenceOptions; track opt.value) {
            <label class="presence-option">
              <input
                type="radio"
                name="presenceMode"
                [value]="opt.value"
                [checked]="values().presenceMode === opt.value"
                (change)="patchPresence(opt.value)"
              />
              <span class="presence-option__main">
                <span class="presence-option__label">{{ opt.label }}</span>
                <span class="pelada-muted presence-option__hint">{{ opt.hint }}</span>
              </span>
            </label>
          }
        </pelada-card>

        <button
          type="submit"
          peladaButton
          variant="lime"
          [peladaButtonBlock]="true"
          [disabled]="submitting()"
        >
          {{ submitting() ? 'Criando…' : 'Criar partida' }}
        </button>
        <a routerLink="/inicio" class="back-link pelada-muted">← Voltar ao início</a>
      </form>
    </section>
  `,
  styles: [
    `
      .form {
        margin-top: var(--pelada-space-3);
      }
      .row-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--pelada-space-3);
      }
      .rules-line {
        margin: 0;
        font-weight: 600;
      }
      .rules-hint {
        margin: var(--pelada-space-2) 0 0;
        font-size: 0.875rem;
      }
      textarea.notes {
        width: 100%;
        resize: vertical;
        min-height: 4.5rem;
      }
      .presence-option {
        display: flex;
        gap: var(--pelada-space-3);
        align-items: flex-start;
        padding: var(--pelada-space-2) 0;
        cursor: pointer;
      }
      .presence-option + .presence-option {
        border-top: 1px solid var(--pelada-line);
      }
      .presence-option input {
        margin-top: 0.25rem;
        min-width: 1.125rem;
        min-height: 1.125rem;
      }
      .presence-option__main {
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-1);
      }
      .presence-option__label {
        font-weight: 600;
      }
      .presence-option__hint {
        font-size: 0.8125rem;
        line-height: 1.35;
      }
      [peladaButton] {
        margin-top: var(--pelada-space-4);
      }
      .back-link {
        display: inline-block;
        margin-top: var(--pelada-space-3);
        min-height: var(--pelada-touch-min);
        line-height: var(--pelada-touch-min);
      }
    `,
  ],
})
export class CriarPartidaComponent implements OnInit {
  private readonly peladaContext = inject(PeladaContextService);
  private readonly rulesApi = inject(PeladaRulesApiService);
  private readonly matchCreate = inject(PeladaMatchCreateService);
  private readonly router = inject(Router);

  readonly presenceOptions = PRESENCE_MODE_OPTIONS;
  readonly values = signal<CreateMatchFormValues>(defaultCreateMatchForm());
  readonly fieldErrors = signal<ReturnType<typeof validateCreateMatchForm>>({});
  readonly formError = signal('');
  readonly submitError = signal('');
  readonly submitting = signal(false);
  readonly rulesSummary = signal('');

  ngOnInit(): void {
    const pelada = this.peladaContext.getActivePelada();
    if (pelada) {
      this.values.set(
        defaultCreateMatchForm(pelada.defaultLocation ?? ''),
      );
      this.rulesApi.fetchRules(pelada.id).subscribe({
        next: (dto) => {
          const rules = peladaRulesFromApi(dto);
          this.rulesSummary.set(
            rulesSummaryLine({
              playersPerTeam: rules.playersPerTeam,
              teamCount: rules.teamCount,
              modality: rules.modality,
            }),
          );
        },
        error: () => this.rulesSummary.set('Regras indisponíveis'),
      });
    }
  }

  patchField(
    field: keyof Pick<
      CreateMatchFormValues,
      'date' | 'time' | 'location' | 'notes'
    >,
    event: Event,
  ): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.values.update((v) => ({ ...v, [field]: value }));
    this.fieldErrors.set({});
    this.formError.set('');
  }

  patchPresence(value: CreateMatchFormValues['presenceMode']): void {
    this.values.update((v) => ({ ...v, presenceMode: value }));
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    const pelada = this.peladaContext.getActivePelada();
    if (!pelada || this.submitting()) {
      return;
    }

    const errors = validateCreateMatchForm(this.values());
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      this.formError.set('Revise os campos destacados.');
      return;
    }

    const body = buildCreateMatchRequest(this.values());
    if (!body) {
      this.formError.set('Não foi possível montar a partida.');
      return;
    }

    this.submitting.set(true);
    this.submitError.set('');
    this.matchCreate.createMatch(pelada.id, body).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigate(['/partida/presenca']);
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set(
          'Não foi possível criar a partida. A API POST (issue 3.3-API) pode ainda não estar disponível.',
        );
      },
    });
  }
}
