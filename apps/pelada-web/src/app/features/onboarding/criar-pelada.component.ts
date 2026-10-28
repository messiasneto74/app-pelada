import { Component, inject, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import {
  isCriarPeladaFormValid,
  PHOTO_ACCEPT,
  validateCriarPeladaForm,
  validatePeladaPhotoFile,
  WEEKDAY_OPTIONS,
} from '../../core/pelada/criar-pelada-form';
import { PeladaAvatarComponent } from '../../ui/avatar.component';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaFieldComponent } from '../../ui/field.component';
import { PeladaInputDirective } from '../../ui/input.directive';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

@Component({
  selector: 'app-criar-pelada',
  standalone: true,
  imports: [
    ScreenHeaderComponent,
    PeladaFieldComponent,
    PeladaInputDirective,
    PeladaButtonComponent,
    PeladaAvatarComponent,
  ],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Onboarding"
        title="Criar pelada"
        subtitle="Nome, foto, dia habitual e local — história 1 · L1-API persiste depois."
      />

      <div class="photo-block">
        @if (photoPreview()) {
          <img class="photo-preview" [src]="photoPreview()" alt="Prévia da foto da pelada" />
        } @else {
          <pelada-avatar [name]="name() || 'Pelada'" size="md" tone="lime" />
        }
        <button type="button" class="pelada-btn pelada-btn--secondary" peladaButton (click)="fileInput.click()">
          {{ photoPreview() ? 'Trocar foto' : 'Adicionar foto' }}
        </button>
        <input
          #fileInput
          type="file"
          class="sr-only"
          [accept]="photoAccept"
          (change)="onPhotoSelected($event)"
        />
        @if (photoError()) {
          <p class="pelada-field__error" role="alert">{{ photoError() }}</p>
        }
      </div>

      <form class="form" (submit)="onSubmit($event)">
        <pelada-field label="Nome da pelada" forId="pelada-nome" [error]="nameError()">
          <input
            id="pelada-nome"
            peladaInput
            [peladaInputInvalid]="!!nameError()"
            [value]="name()"
            (input)="onNameInput($event)"
            placeholder="Ex.: Pelada da Praça"
            autocomplete="organization"
          />
        </pelada-field>

        <pelada-field label="Dia habitual" forId="pelada-dia" hint="Opcional — ajuda no card do Início depois.">
          <select id="pelada-dia" peladaInput [value]="weekdayValue()" (change)="onWeekdayChange($event)">
            <option value="">Ainda não defini</option>
            @for (opt of weekdays; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        </pelada-field>

        <pelada-field label="Local padrão" forId="pelada-local" hint="Opcional — quadra, endereço ou apelido.">
          <input
            id="pelada-local"
            peladaInput
            [value]="location()"
            (input)="onLocationInput($event)"
            placeholder="Ex.: Society do Zé"
          />
        </pelada-field>

        <button type="submit" class="pelada-btn pelada-btn--block" peladaButton variant="lime" [disabled]="submitting()">
          Continuar para regras
        </button>
      </form>
    </section>
  `,
  styles: [
    `
      .photo-block {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--pelada-space-3);
        margin-bottom: var(--pelada-space-6);
      }
      .photo-preview {
        width: 96px;
        height: 96px;
        object-fit: cover;
        border-radius: var(--pelada-radius-lg);
        border: 2px solid var(--pelada-line);
      }
      .form {
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-4);
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        border: 0;
      }
    `,
  ],
})
export class CriarPeladaComponent implements OnDestroy {
  private readonly peladaContext = inject(PeladaContextService);
  private readonly router = inject(Router);

  readonly photoAccept = PHOTO_ACCEPT;
  readonly weekdays = WEEKDAY_OPTIONS;

  readonly name = signal('');
  readonly location = signal('');
  readonly weekdayValue = signal('');
  readonly photoPreview = signal<string | null>(null);
  readonly photoError = signal<string | null>(null);
  readonly nameError = signal<string | null>(null);
  readonly submitting = signal(false);

  private photoFile: File | null = null;
  private objectUrl: string | null = null;

  ngOnDestroy(): void {
    this.revokePreview();
  }

  onNameInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.name.set(value);
    this.nameError.set(null);
  }

  onLocationInput(event: Event): void {
    this.location.set((event.target as HTMLInputElement).value);
  }

  onWeekdayChange(event: Event): void {
    this.weekdayValue.set((event.target as HTMLSelectElement).value);
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.photoFile = file;
    const err = validatePeladaPhotoFile(file);
    this.photoError.set(err);
    this.revokePreview();
    if (file && !err) {
      this.objectUrl = URL.createObjectURL(file);
      this.photoPreview.set(this.objectUrl);
    } else {
      this.photoPreview.set(null);
    }
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.submitting()) {
      return;
    }

    const weekdayRaw = this.weekdayValue();
    const defaultWeekday =
      weekdayRaw === '' ? null : Number.parseInt(weekdayRaw, 10);

    const values = {
      name: this.name(),
      defaultWeekday: Number.isNaN(defaultWeekday as number) ? null : defaultWeekday,
      defaultLocation: this.location().trim(),
    };

    const photoErr = validatePeladaPhotoFile(this.photoFile);
    if (photoErr) {
      this.photoError.set(photoErr);
      return;
    }

    const errors = validateCriarPeladaForm(values);
    this.nameError.set(errors.name ?? null);
    if (!isCriarPeladaFormValid(values)) {
      return;
    }

    this.submitting.set(true);
    const id = crypto.randomUUID();
    const preview = this.photoPreview();
    this.objectUrl = null;
    this.peladaContext.setActivePelada({
      id,
      name: values.name.trim(),
      defaultWeekday: values.defaultWeekday,
      defaultLocation: values.defaultLocation,
      photoPreviewUrl: preview,
    });

    void this.router.navigate(['/inicio/regras']).finally(() => this.submitting.set(false));
  }

  private revokePreview(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
