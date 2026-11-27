import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, type MeProfile } from '../../auth/auth.service';
import type { MyPeladaSummary } from '../../core/pelada/active-pelada.model';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaSwitchService, peladaRoleLabel } from '../../core/pelada/pelada-switch.service';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaCardComponent } from '../../ui/card.component';
import { PeladaFieldComponent } from '../../ui/field.component';
import { PeladaInputDirective } from '../../ui/input.directive';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';
import { phoneValidationMessage } from '../entrar/completar/completar.component';

/**
 * Tela "Meu perfil" — #224 (sair da conta), #225 (minhas peladas / trocar) e
 * #226 (nome, telefone, foto, senha, sair de uma pelada).
 */
@Component({
  selector: 'app-meu-perfil',
  standalone: true,
  imports: [
    FormsModule,
    ScreenHeaderComponent,
    PeladaCardComponent,
    PeladaButtonComponent,
    PeladaFieldComponent,
    PeladaInputDirective,
    PeladaAvatarComponent,
  ],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Conta"
        title="Meu perfil"
        subtitle="Seus dados, suas peladas e a saída da conta."
      />

      @if (me(); as m) {
        <pelada-card title="Foto">
          <div class="photo-row">
            @if (photoSrc()) {
              <img class="photo" [src]="photoSrc()" alt="Sua foto" />
            } @else {
              <pelada-avatar [name]="m.name || m.email || 'Eu'" tone="lime" />
            }
            <button type="button" peladaButton variant="secondary" [disabled]="busy()" (click)="fileInput.click()">
              Trocar foto
            </button>
            <input
              #fileInput
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="sr-only"
              (change)="onPhoto($event)"
            />
          </div>
          @if (msg('photo'); as t) {
            <p [class]="t.ok ? 'pelada-text-ok' : 'pelada-field__error'" role="status">{{ t.text }}</p>
          }
        </pelada-card>

        <pelada-card title="Dados">
          <p class="me-line"><span class="pelada-muted">E-mail</span> {{ m.email ?? '—' }}</p>
          <pelada-field label="Nome" forId="me-name" hint="Aparece no elenco de todas as suas peladas.">
            <input id="me-name" peladaInput [(ngModel)]="name" autocomplete="name" />
          </pelada-field>
          <pelada-field label="Telefone" forId="me-phone">
            <input id="me-phone" peladaInput type="tel" [(ngModel)]="phone" autocomplete="tel" />
          </pelada-field>
          @if (msg('data'); as t) {
            <p [class]="t.ok ? 'pelada-text-ok' : 'pelada-field__error'" role="status">{{ t.text }}</p>
          }
          <button type="button" peladaButton variant="lime" [peladaButtonBlock]="true" [disabled]="busy()" (click)="saveData()">
            Salvar dados
          </button>
        </pelada-card>

        <pelada-card title="Senha">
          <pelada-field label="Senha atual" forId="me-pass-cur">
            <input id="me-pass-cur" peladaInput type="password" [(ngModel)]="currentPassword" autocomplete="current-password" />
          </pelada-field>
          <pelada-field label="Nova senha" forId="me-pass-new" hint="Pelo menos 8 caracteres.">
            <input id="me-pass-new" peladaInput type="password" [(ngModel)]="newPassword" autocomplete="new-password" />
          </pelada-field>
          <pelada-field label="Repita a nova senha" forId="me-pass-rep">
            <input id="me-pass-rep" peladaInput type="password" [(ngModel)]="repeatPassword" autocomplete="new-password" />
          </pelada-field>
          @if (msg('password'); as t) {
            <p [class]="t.ok ? 'pelada-text-ok' : 'pelada-field__error'" role="status">{{ t.text }}</p>
          }
          <button type="button" peladaButton variant="secondary" [peladaButtonBlock]="true" [disabled]="busy()" (click)="savePassword()">
            Trocar senha
          </button>
        </pelada-card>
      } @else if (loadError()) {
        <p class="pelada-muted">Não foi possível carregar seus dados agora.</p>
      } @else {
        <p class="pelada-muted">Carregando…</p>
      }

      <!-- Issue #225 — peladas do usuário e troca da pelada ativa. -->
      <pelada-card title="Minhas peladas">
        @if (peladas().length === 0) {
          <p class="pelada-muted">{{ peladasLoaded() ? 'Você ainda não está em nenhuma pelada.' : 'Carregando…' }}</p>
        } @else {
          <ul class="pelada-list">
            @for (p of peladas(); track p.id) {
              <li class="pelada-item">
                <span class="pelada-item__main">
                  <span class="pelada-item__name">{{ p.name }}</span>
                  <span class="pelada-muted pelada-item__role">{{ roleLabel(p.role) }}</span>
                </span>
                <span class="pelada-item__actions">
                  @if (p.id === activeId()) {
                    <span class="pelada-item__current">Atual</span>
                  } @else {
                    <button type="button" peladaButton variant="secondary" (click)="open(p)">Abrir</button>
                  }
                  <button type="button" class="leave-link" (click)="leaveTarget.set(p)">Sair</button>
                </span>
              </li>
            }
          </ul>
        }
        @if (msg('leave'); as t) {
          <p [class]="t.ok ? 'pelada-text-ok' : 'pelada-field__error'" role="status">{{ t.text }}</p>
        }
      </pelada-card>

      <!-- Issue #225 — peladas do usuário e troca da pelada ativa. -->
      <pelada-card title="Minhas peladas">
        @if (peladas().length === 0) {
          <p class="pelada-muted">{{ peladasLoaded() ? 'Você ainda não está em nenhuma pelada.' : 'Carregando…' }}</p>
        } @else {
          <ul class="pelada-list">
            @for (p of peladas(); track p.id) {
              <li class="pelada-item">
                <span class="pelada-item__main">
                  <span class="pelada-item__name">{{ p.name }}</span>
                  <span class="pelada-muted pelada-item__role">{{ roleLabel(p.role) }}</span>
                </span>
                @if (p.id === activeId()) {
                  <span class="pelada-item__current">Atual</span>
                } @else {
                  <button type="button" peladaButton variant="secondary" (click)="open(p)">
                    Abrir
                  </button>
                }
              </li>
            }
          </ul>
        }
      </pelada-card>

      <button
        type="button"
        peladaButton
        variant="secondary"
        [peladaButtonBlock]="true"
        class="logout-btn"
        (click)="logout()"
      >
        Sair da conta
      </button>

      @if (leaveTarget(); as p) {
        <div class="confirm-modal-backdrop" role="presentation" (click)="leaveTarget.set(null)">
          <div
            class="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-title"
            (click)="$event.stopPropagation()"
            (keydown.escape)="leaveTarget.set(null)"
          >
            <h2 id="leave-title" class="confirm-modal__title">Sair da {{ p.name }}?</h2>
            <p class="confirm-modal__lead pelada-muted">
              Apaga seu jogador e todo o seu histórico nesta pelada (presenças, sorteios, gols e
              cobranças) e você perde o acesso a ela. Não dá para desfazer.
            </p>
            <div class="confirm-modal__actions">
              <button type="button" peladaButton variant="lime" [peladaButtonBlock]="true" [disabled]="busy()" (click)="leave(p)">
                Sair da pelada
              </button>
              <button type="button" peladaButton variant="secondary" [peladaButtonBlock]="true" (click)="leaveTarget.set(null)">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .me-line {
        display: flex;
        justify-content: space-between;
        gap: var(--pelada-space-3);
        margin: 0 0 var(--pelada-space-3);
        word-break: break-all;
      }
      .pelada-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-2);
      }
      .pelada-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--pelada-space-3);
      }
      .pelada-item__main {
        display: flex;
        flex-direction: column;
      }
      .pelada-item__name {
        font-weight: 700;
      }
      .pelada-item__role {
        font-size: 0.8125rem;
      }
      .pelada-item__current {
        font-size: 0.75rem;
        font-weight: 700;
        color: #486f36;
        background: #f0f5e6;
        border-radius: 999px;
        padding: 4px 10px;
      }
      .logout-btn {
        margin-top: var(--pelada-space-4);
      }
      .confirm-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: var(--pelada-space-4);
        background: rgba(0, 0, 0, 0.45);
      }
      .confirm-modal {
        width: min(100%, 390px);
        padding: var(--pelada-space-4);
        border-radius: var(--pelada-radius-lg) var(--pelada-radius-lg) 0 0;
        background: var(--pelada-paper);
      }
      .confirm-modal__title {
        margin: 0 0 var(--pelada-space-2);
        font-size: 1.125rem;
      }
      .confirm-modal__lead {
        margin: 0 0 var(--pelada-space-3);
        font-size: 0.875rem;
      }
      .confirm-modal__actions {
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-2);
      }
    `,
  ],
})
export class MeuPerfilComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly switcher = inject(PeladaSwitchService);
  private readonly context = inject(PeladaContextService);

  readonly me = signal<MeProfile | null>(null);
  readonly loadError = signal(false);
  readonly peladas = signal<MyPeladaSummary[]>([]);
  readonly peladasLoaded = signal(false);
  readonly roleLabel = peladaRoleLabel;

  activeId(): string | null {
    return this.context.getActivePelada()?.id ?? null;
  }

  open(p: MyPeladaSummary): void {
    void this.switcher.switchTo(p);
  }

  ngOnInit(): void {
    this.switcher
      .listMine()
      .then((list) => this.peladas.set(list))
      .catch(() => this.peladas.set([]))
      .finally(() => this.peladasLoaded.set(true));
    this.auth
      .getMe()
      .then((m) => this.applyMe(m))
      .catch(() => this.loadError.set(true));
  }

  async saveData(): Promise<void> {
    const name = this.name.trim();
    if (name.length < 3) {
      return this.say('data', false, 'Informe nome e sobrenome.');
    }
    const phoneError = phoneValidationMessage(this.phone);
    if (phoneError) {
      return this.say('data', false, phoneError);
    }
    await this.run('data', async () => {
      const m = await this.profileApi.updateProfile({ name, phone: this.phone.trim() });
      this.applyMe(m);
      this.say('data', true, 'Dados salvos.');
    }, 'Não foi possível salvar seus dados. Tente de novo.');
  }

  async onPhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return this.say('photo', false, 'Foto deve ser JPG, PNG ou WebP.');
    }
    if (file.size > 5 * 1024 * 1024) {
      return this.say('photo', false, 'Foto deve ter no máximo 5 MB.');
    }
    await this.run('photo', async () => {
      const m = await this.profileApi.uploadPhoto(file);
      this.applyMe(m);
      this.say('photo', true, 'Foto atualizada.');
    }, 'Não foi possível enviar a foto. Tente de novo.');
  }

  async savePassword(): Promise<void> {
    if (!this.currentPassword) {
      return this.say('password', false, 'Informe a senha atual.');
    }
    if (this.newPassword.length < 8) {
      return this.say('password', false, 'A nova senha precisa ter pelo menos 8 caracteres.');
    }
    if (this.newPassword !== this.repeatPassword) {
      return this.say('password', false, 'As duas senhas novas não são iguais.');
    }
    await this.run('password', async () => {
      await this.profileApi.changePassword(this.currentPassword, this.newPassword);
      this.currentPassword = this.newPassword = this.repeatPassword = '';
      this.say('password', true, 'Senha alterada.');
    }, 'Não foi possível trocar a senha. Tente de novo.');
  }

  async leave(p: MyPeladaSummary): Promise<void> {
    await this.run('leave', async () => {
      await this.profileApi.leavePelada(p.id);
      this.leaveTarget.set(null);
      const rest = this.peladas().filter((x) => x.id !== p.id);
      this.peladas.set(rest);
      if (p.id === this.activeId()) {
        if (rest[0]) {
          await this.switcher.switchTo(rest[0]);
        } else {
          this.context.clearActivePelada();
          await this.router.navigate(['/onboarding/pelada']);
        }
        return;
      }
      this.say('leave', true, `Você saiu da ${p.name}.`);
    }, 'Não foi possível sair da pelada. Tente de novo.');
    if (this.msg('leave')?.ok === false) {
      this.leaveTarget.set(null);
    }
  }

  /** Issue #224 — sair da conta. */
  logout(): void {
    this.auth.logout();
  }

  private loadPeladas(): void {
    this.switcher
      .listMine()
      .then((list) => this.peladas.set(list))
      .catch(() => this.peladas.set([]))
      .finally(() => this.peladasLoaded.set(true));
  }

  private applyMe(m: MeProfile): void {
    this.me.set(m);
    this.name = m.name ?? '';
    this.phone = m.phone ?? '';
    // Os campos voltaram pro que está salvo: um aviso antigo dos dados não vale mais.
    this.messages.update((msgs) => ({ ...msgs, data: undefined as never }));
    if (m.photoUrl) {
      this.profileApi
        .loadPhotoBlobUrl(m.photoUrl)
        .then((url) => {
          this.revokePhoto();
          this.photoSrc.set(url);
        })
        .catch(() => this.photoSrc.set(null));
    }
  }

  private revokePhoto(): void {
    const cur = this.photoSrc();
    if (cur?.startsWith('blob:')) {
      URL.revokeObjectURL(cur);
    }
  }

  private say(key: string, ok: boolean, text: string): void {
    this.messages.update((m) => ({ ...m, [key]: { ok, text } }));
  }

  private async run(key: string, fn: () => Promise<void>, fallback: string): Promise<void> {
    this.busy.set(true);
    this.messages.update((m) => ({ ...m, [key]: undefined as never }));
    try {
      await fn();
    } catch (err) {
      this.say(key, false, apiMessage(err, fallback));
    } finally {
      this.busy.set(false);
    }
  }
}
