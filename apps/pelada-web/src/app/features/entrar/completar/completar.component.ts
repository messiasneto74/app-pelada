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
    this.saving.set(true);
    try {
      await this.auth.patchMe(this.phone.trim());
      await this.auth.continueAfterLogin();
    } catch {
      this.error.set('Não foi possível salvar. Verifique o número e a API.');
    } finally {
      this.saving.set(false);
    }
  }

  logout(): void {
    this.auth.logout();
  }
}
