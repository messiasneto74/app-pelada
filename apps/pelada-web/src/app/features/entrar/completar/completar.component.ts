import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-completar-telefone',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="shell">
      <h1>Completar cadastro</h1>
      <p class="muted">Informe seu telefone para confirmar presença nas peladas.</p>
      <form (ngSubmit)="submit()" class="form">
        <label>
          Telefone
          <input
            name="phone"
            type="tel"
            [(ngModel)]="phone"
            required
            minlength="8"
            maxlength="20"
            placeholder="11999990000"
          />
        </label>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <button type="submit" [disabled]="saving()">Salvar</button>
      </form>
      <button type="button" class="link-btn" (click)="logout()">Sair</button>
    </main>
  `,
  styles: [
    `
      .shell {
        max-width: 24rem;
        margin: 2rem auto;
        padding: 1rem;
        font-family: system-ui, sans-serif;
      }
      .muted {
        color: #5c665f;
      }
      .form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin: 1rem 0;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-weight: 600;
      }
      input {
        padding: 0.5rem;
        border: 1px solid #c5d0c8;
        border-radius: 6px;
      }
      button[type='submit'] {
        background: #173d32;
        color: #fff;
        border: none;
        padding: 0.6rem 1rem;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.6;
      }
      .error {
        color: #b94848;
        font-size: 0.9rem;
      }
      .link-btn {
        background: none;
        border: none;
        color: #173d32;
        font-weight: 600;
        cursor: pointer;
        padding: 0;
      }
    `,
  ],
})
export class CompletarComponent {
  private readonly auth = inject(AuthService);

  phone = '';
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    this.error.set(null);
    // Issue #221 — mensagem clara pra cada caso, sem citar "API".
    const invalid = phoneValidationMessage(this.phone);
    if (invalid) {
      this.error.set(invalid);
      return;
    }
    this.saving.set(true);
    try {
      await this.auth.patchMe(this.phone.trim());
      await this.auth.continueAfterLogin();
    } catch (err) {
      this.error.set(
        err instanceof HttpErrorResponse && err.status === 400
          ? 'Telefone inválido. Use só números, com DDD (ex.: 11 99999-0000).'
          : 'Não foi possível salvar agora. Confira sua internet e tente de novo.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  logout(): void {
    this.auth.logout();
  }
}

/** Issue #221 — validação local do telefone (mesma regra da API: 8+ caracteres, só dígitos e + ( ) - espaço). */
export function phoneValidationMessage(raw: string): string | null {
  const phone = raw.trim();
  if (!phone) {
    return 'Informe seu telefone com DDD.';
  }
  if (!/^[0-9+()\-\s]+$/.test(phone) || phone.replace(/\D/g, '').length < 8) {
    return 'Telefone inválido. Use só números, com DDD (ex.: 11 99999-0000).';
  }
  return null;
}
