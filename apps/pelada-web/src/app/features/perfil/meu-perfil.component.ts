import { Component, inject, OnInit, signal } from '@angular/core';
import { AuthService, type MeProfile } from '../../auth/auth.service';
import type { MyPeladaSummary } from '../../core/pelada/active-pelada.model';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaSwitchService, peladaRoleLabel } from '../../core/pelada/pelada-switch.service';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaCardComponent } from '../../ui/card.component';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

/**
 * Tela "Meu perfil" (issues #224/#225/#226). Nesta etapa (#224): dados da conta
 * e "Sair da conta".
 */
@Component({
  selector: 'app-meu-perfil',
  standalone: true,
  imports: [ScreenHeaderComponent, PeladaCardComponent, PeladaButtonComponent],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Conta"
        title="Meu perfil"
        subtitle="Seus dados, suas peladas e a saída da conta."
      />

      <pelada-card title="Conta">
        @if (me(); as m) {
          <p class="me-line"><span class="pelada-muted">E-mail</span> {{ m.email ?? '—' }}</p>
          <p class="me-line"><span class="pelada-muted">Telefone</span> {{ m.phone ?? '—' }}</p>
        } @else if (loadError()) {
          <p class="pelada-muted">Não foi possível carregar seus dados agora.</p>
        } @else {
          <p class="pelada-muted">Carregando…</p>
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
    </section>
  `,
  styles: [
    `
      .me-line {
        display: flex;
        justify-content: space-between;
        gap: var(--pelada-space-3);
        margin: 0 0 var(--pelada-space-2);
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
      .then((m) => this.me.set(m))
      .catch(() => this.loadError.set(true));
  }

  /** Issue #224 — sair da conta. */
  logout(): void {
    this.auth.logout();
  }
}
