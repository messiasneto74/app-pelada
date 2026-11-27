import { Component, inject, OnInit, signal } from '@angular/core';
import { AuthService, type MeProfile } from '../../auth/auth.service';
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
        subtitle="Seus dados e a saída da conta."
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
      .logout-btn {
        margin-top: var(--pelada-space-4);
      }
    `,
  ],
})
export class MeuPerfilComponent implements OnInit {
  private readonly auth = inject(AuthService);

  readonly me = signal<MeProfile | null>(null);
  readonly loadError = signal(false);

  ngOnInit(): void {
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
