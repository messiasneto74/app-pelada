import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  MOBILE_TOUCH_MIN_PX,
  MOBILE_UX_CHECKLIST,
  MOBILE_VIEWPORT,
} from '../../../theme/mobile-ux-checklist';
import { PeladaButtonComponent } from '../../ui/button.component';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

@Component({
  selector: 'app-mobile-ux-preview',
  standalone: true,
  imports: [RouterLink, ScreenHeaderComponent, PeladaButtonComponent],
  template: `
    <div class="preview pelada-shell">
        <pelada-screen-header
          eyebrow="T6 · história 84"
          title="Mobile UX"
          [subtitle]="'Viewport ' + viewport.width + '×' + viewport.height + ' · toque mín. ' + touchMin + 'px'"
        />
        <ul class="checklist">
          @for (item of checklist; track item.id) {
            <li>
              <span class="badge" [class.badge--auto]="item.automated">
                {{ item.automated ? 'auto' : 'manual' }}
              </span>
              {{ item.label }}
            </li>
          }
        </ul>
        <button type="button" class="pelada-touch-target pelada-btn pelada-btn--block" peladaButton>
          Alvo 44px (teste)
        </button>
        <p class="pelada-muted footer">
          <a routerLink="/inicio">Shell autenticado</a> ·
          <a routerLink="/dev/componentes">T2</a>
        </p>
    </div>
  `,
  styles: [
    `
      .preview {
        padding-bottom: var(--pelada-space-8);
      }
      .checklist {
        list-style: none;
        padding: 0;
        margin: 0 0 var(--pelada-space-6);
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-3);
      }
      .checklist li {
        font-size: 0.8125rem;
        line-height: 1.45;
        display: flex;
        gap: var(--pelada-space-2);
        align-items: flex-start;
      }
      .badge {
        flex-shrink: 0;
        font-size: 0.5625rem;
        font-weight: 700;
        text-transform: uppercase;
        padding: 2px 6px;
        border-radius: var(--pelada-radius-sm);
        background: #edf0e9;
        color: var(--pelada-muted);
      }
      .badge--auto {
        background: #edf4e5;
        color: #6e873c;
      }
      .footer {
        margin-top: var(--pelada-space-6);
        font-size: 0.85rem;
      }
    `,
  ],
})
export class MobileUxPreviewComponent {
  readonly viewport = MOBILE_VIEWPORT;
  readonly touchMin = MOBILE_TOUCH_MIN_PX;
  readonly checklist = MOBILE_UX_CHECKLIST;
}
