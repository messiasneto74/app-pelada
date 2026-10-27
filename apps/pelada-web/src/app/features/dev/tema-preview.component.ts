import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RESENHA_COLORS } from '../../../theme/resenha-tokens';

@Component({
  selector: 'app-tema-preview',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="pelada-shell tema-preview">
      <p class="pelada-muted label">T1 · design tokens</p>
      <h1>Resenha</h1>
      <p class="pelada-muted">
        Barlow Condensed nos títulos · DM Sans no corpo · viewport
        {{ viewport.width }}×{{ viewport.height }}
      </p>

      <section class="pelada-card swatches" aria-label="Paleta de cores">
        @for (swatch of swatches; track swatch.name) {
          <div class="swatch">
            <span
              class="swatch__chip"
              [style.background]="swatch.hex"
              [attr.aria-label]="swatch.name"
            ></span>
            <span class="swatch__name">{{ swatch.name }}</span>
            <code>{{ swatch.hex }}</code>
          </div>
        }
      </section>

      <section class="pelada-card samples">
        <button type="button" class="pelada-btn pelada-btn--block">Primário verde</button>
        <button type="button" class="pelada-btn pelada-btn--lime pelada-btn--block">
          CTA limão
        </button>
        <button type="button" class="pelada-btn pelada-btn--ghost">Link ghost</button>
      </section>

      <p class="pelada-muted footer">
        <a routerLink="/entrar">Entrar</a> · aceite manual em 390px (DevTools)
      </p>
    </main>
  `,
  styles: [
    `
      .tema-preview {
        min-height: 100vh;
      }
      .label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        margin-bottom: var(--pelada-space-2);
      }
      .swatches {
        display: grid;
        gap: var(--pelada-space-3);
        margin-top: var(--pelada-space-5);
      }
      .swatch {
        display: grid;
        grid-template-columns: 40px 1fr auto;
        align-items: center;
        gap: var(--pelada-space-3);
      }
      .swatch__chip {
        width: 40px;
        height: 40px;
        border-radius: var(--pelada-radius-md);
        border: 1px solid var(--pelada-line);
      }
      .swatch__name {
        font-weight: 600;
      }
      code {
        font-size: 0.75rem;
        color: var(--pelada-muted);
      }
      .samples {
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-3);
        margin-top: var(--pelada-space-4);
      }
      .footer {
        margin-top: var(--pelada-space-6);
        font-size: 0.85rem;
      }
    `,
  ],
})
export class TemaPreviewComponent {
  readonly viewport = { width: 390, height: 844 };
  readonly swatches = (
    Object.entries(RESENHA_COLORS) as [string, string][]
  ).map(([name, hex]) => ({ name, hex }));
}
