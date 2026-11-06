import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';
import { PeladaCardComponent } from '../../ui/card.component';

/** Evidência 390px — estado após 3.4-NAV (lista fechada → aba Sorteio). */
@Component({
  selector: 'app-sorteio-nav-preview',
  standalone: true,
  imports: [RouterLink, ScreenHeaderComponent, PeladaCardComponent],
  template: `
    <section class="pelada-shell">
      <pelada-screen-header
        eyebrow="Partida"
        title="Pelada Resenha"
        subtitle="Após fechar a lista, o fluxo abre o Sorteio (§1)."
      />
      <nav class="partida-tabs" aria-label="Abas da partida">
        <a routerLink="/dev/presenca">Presença</a>
        <a routerLink="/dev/partida-sorteio" class="active">Sorteio</a>
        <a routerLink="/dev/partida-sorteio">Em campo</a>
      </nav>
      <pelada-card title="Sorteio">
        <p class="pelada-muted">
          Placeholder da tela de sorteio (issue 3.5). Lista de presença fechada.
        </p>
      </pelada-card>
    </section>
  `,
  styles: [
    `
      .partida-tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      .partida-tabs a {
        flex: 1;
        text-align: center;
        padding: 0.5rem;
        border-radius: 0.5rem;
        text-decoration: none;
        color: inherit;
        background: var(--resenha-surface-muted, #eef2ef);
      }
      .partida-tabs a.active {
        background: var(--resenha-lime, #dcf58a);
        font-weight: 600;
      }
    `,
  ],
})
export class SorteioNavPreviewComponent {}
