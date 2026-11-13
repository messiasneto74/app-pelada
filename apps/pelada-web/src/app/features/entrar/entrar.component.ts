import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AuthService,
  mapPasswordLoginError,
  mapRegisterError,
} from '../../auth/auth.service';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaFieldComponent } from '../../ui/field.component';
import { PeladaInputDirective } from '../../ui/input.directive';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

type EntrarMode = 'login' | 'register';

@Component({
  selector: 'app-entrar',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    PeladaButtonComponent,
    PeladaFieldComponent,
    PeladaInputDirective,
    ScreenHeaderComponent,
  ],
  template: `
    <main class="pelada-shell entrar">
      <pelada-screen-header
        eyebrow="Resenha"
        [title]="mode() === 'login' ? 'Entrar' : 'Criar conta'"
        [subtitle]="
          mode() === 'login'
            ? 'Use e-mail e senha — sem sair do app.'
            : 'Cadastro fica no Resenha; a identidade vai para o Keycloak.'
        "
      />

      @if (loading()) {
        <p class="pelada-muted">Preparando sessão…</p>
      } @else if (auth.isLoggedIn()) {
        <p class="pelada-text-ok">Você já está autenticado.</p>
        <button type="button" peladaButton [peladaButtonBlock]="true" (click)="continue()">
          Continuar
        </button>
        <button type="button" peladaButton variant="ghost" (click)="logout()">Sair</button>
      } @else {
        <div class="mode-tabs" role="tablist" aria-label="Modo de acesso">
          <button
            type="button"
            role="tab"
            class="mode-tab"
            [class.mode-tab--active]="mode() === 'login'"
            [attr.aria-selected]="mode() === 'login'"
            (click)="setMode('login')"
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            class="mode-tab"
            [class.mode-tab--active]="mode() === 'register'"
            [attr.aria-selected]="mode() === 'register'"
            (click)="setMode('register')"
          >
            Criar conta
          </button>
        </div>

        <form class="form" (ngSubmit)="submit()">
          @if (mode() === 'register') {
            <pelada-field label="Nome" forId="entrar-nome">
              <input
                id="entrar-nome"
                name="name"
                peladaInput
                [(ngModel)]="name"
                autocomplete="name"
                placeholder="Como te chamam na pelada"
              />
            </pelada-field>
          }

          <pelada-field label="E-mail" forId="entrar-email" [error]="fieldError()">
            <input
              id="entrar-email"
              name="email"
              type="email"
              peladaInput
              [peladaInputInvalid]="!!fieldError()"
              [(ngModel)]="email"
              required
              autocomplete="username"
              placeholder="voce@email.com"
            />
          </pelada-field>

          <pelada-field label="Senha" forId="entrar-senha">
            <input
              id="entrar-senha"
              name="password"
              type="password"
              peladaInput
              [(ngModel)]="password"
              required
              minlength="8"
              [autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'"
              placeholder="Mínimo 8 caracteres"
            />
          </pelada-field>

          @if (error()) {
            <p class="pelada-field__error" role="alert">{{ error() }}</p>
          }

          <button
            type="submit"
            peladaButton
            variant="lime"
            [peladaButtonBlock]="true"
            [disabled]="submitting()"
          >
            {{
              submitting()
                ? 'Aguarde…'
                : mode() === 'login'
                  ? 'Entrar'
                  : 'Criar conta e entrar'
            }}
          </button>
        </form>
      }

      <p class="hint pelada-muted">
        <a routerLink="/inicio">Voltar ao início</a> (sem login) ·
        <a routerLink="/dev/tema">T1</a> · <a routerLink="/dev/componentes">T2</a>
      </p>
    </main>
  `,
  styles: [
    `
      .entrar {
        max-width: 26rem;
      }
      .mode-tabs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--pelada-space-2);
        margin: var(--pelada-space-4) 0 var(--pelada-space-5);
      }
      .mode-tab {
        border: 1px solid var(--pelada-line);
        background: transparent;
        color: inherit;
        border-radius: var(--pelada-radius-md);
        padding: 0.55rem 0.75rem;
        font-weight: 600;
        cursor: pointer;
      }
      .mode-tab--active {
        border-color: var(--pelada-lime, #b7f34a);
        background: color-mix(in srgb, var(--pelada-lime, #b7f34a) 18%, transparent);
      }
      .form {
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-4);
      }
      .hint {
        margin-top: var(--pelada-space-6);
        font-size: 0.85rem;
      }
      [peladaButton] {
        margin-top: var(--pelada-space-2);
      }
    `,
  ],
})
export class EntrarComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly fieldError = signal<string | null>(null);
  readonly mode = signal<EntrarMode>('login');

  email = '';
  password = '';
  name = '';

  async ngOnInit(): Promise<void> {
    await this.auth.init();
    this.loading.set(false);
    if (this.auth.isLoggedIn()) {
      await this.auth.continueAfterLogin();
    }
  }

  setMode(next: EntrarMode): void {
    this.mode.set(next);
    this.error.set(null);
    this.fieldError.set(null);
  }

  async submit(): Promise<void> {
    this.error.set(null);
    this.fieldError.set(null);
    const email = this.email.trim();
    const password = this.password;
    if (!email || !password) {
      this.fieldError.set('Informe e-mail e senha.');
      return;
    }
    if (password.length < 8) {
      this.error.set('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    this.submitting.set(true);
    try {
      if (this.mode() === 'register') {
        await this.auth.registerAccount({
          email,
          password,
          name: this.name,
        });
      } else {
        await this.auth.loginWithPassword(email, password);
      }
      await this.auth.continueAfterLogin();
    } catch (err) {
      this.error.set(
        this.mode() === 'register'
          ? mapRegisterError(err)
          : mapPasswordLoginError(err),
      );
    } finally {
      this.submitting.set(false);
    }
  }

  async continue(): Promise<void> {
    await this.auth.continueAfterLogin();
  }

  logout(): void {
    this.auth.logout();
  }
}
