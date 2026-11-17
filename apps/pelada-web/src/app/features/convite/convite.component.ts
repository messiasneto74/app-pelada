import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import {
  mapInvitePreviewError,
  mapInviteRedeemError,
} from '../../core/pelada/convite.logic';
import { PeladaApiService } from '../../core/pelada/pelada-api.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PendingInviteService } from '../../core/pelada/pending-invite.service';
import { PeladaButtonComponent } from '../../ui/button.component';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

/** Tela de resgate do convite (issue #172, fase 1) — entrada direta na pelada, sem onboarding. */
@Component({
  selector: 'app-convite',
  standalone: true,
  imports: [RouterLink, ScreenHeaderComponent, PeladaButtonComponent],
  template: `
    <section class="pelada-shell convite">
      <pelada-screen-header
        eyebrow="Convite"
        title="Entrar numa pelada"
        subtitle="Link ou QR code — uso único, válido por 5 horas."
      />

      @if (loading()) {
        <p class="pelada-muted">Verificando convite…</p>
      } @else if (errorMessage()) {
        <p class="pelada-error" role="alert">{{ errorMessage() }}</p>
        <a routerLink="/inicio" class="back-link">Voltar ao início</a>
      } @else if (peladaName()) {
        <p>
          Você foi convidado pra entrar em <strong>{{ peladaName() }}</strong>.
        </p>
        <button
          type="button"
          peladaButton
          variant="lime"
          [peladaButtonBlock]="true"
          [disabled]="accepting()"
          (click)="acceptInvite()"
        >
          {{ accepting() ? 'Entrando…' : 'Entrar e aceitar convite' }}
        </button>
      }
    </section>
  `,
  styles: [
    `
      .convite {
        max-width: 26rem;
      }
      .back-link {
        display: inline-block;
        margin-top: var(--pelada-space-4);
        font-size: 0.875rem;
      }
    `,
  ],
})
export class ConviteComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly oauth = inject(OAuthService);
  private readonly peladaApi = inject(PeladaApiService);
  private readonly peladaContext = inject(PeladaContextService);
  private readonly pendingInvite = inject(PendingInviteService);

  readonly loading = signal(true);
  readonly accepting = signal(false);
  readonly peladaName = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  private token = '';

  async ngOnInit(): Promise<void> {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.loading.set(false);
      this.errorMessage.set('Link de convite inválido.');
      return;
    }

    try {
      const preview = await this.peladaApi.previewInvite(this.token);
      this.peladaName.set(preview.peladaName);
      this.loading.set(false);
      if (this.oauth.hasValidAccessToken()) {
        await this.acceptInvite();
      }
    } catch (err) {
      this.loading.set(false);
      this.errorMessage.set(mapInvitePreviewError(err as HttpErrorResponse));
    }
  }

  async acceptInvite(): Promise<void> {
    if (this.accepting()) {
      return;
    }
    if (!this.oauth.hasValidAccessToken()) {
      this.pendingInvite.set(this.token);
      await this.router.navigateByUrl('/entrar');
      return;
    }

    this.accepting.set(true);
    this.errorMessage.set(null);
    try {
      const joined = await this.peladaApi.redeemInvite(this.token);
      this.peladaContext.setActivePelada({
        id: joined.peladaId,
        name: joined.name,
        defaultWeekday: joined.defaultWeekday,
        defaultLocation: joined.defaultLocation ?? '',
        photoPreviewUrl: joined.photoUrl,
      });
      await this.router.navigateByUrl('/inicio', { replaceUrl: true });
    } catch (err) {
      this.accepting.set(false);
      this.errorMessage.set(mapInviteRedeemError(err as HttpErrorResponse));
    }
  }
}
