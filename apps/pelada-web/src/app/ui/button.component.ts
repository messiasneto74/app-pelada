import { Component, input } from '@angular/core';

export type PeladaButtonVariant = 'primary' | 'lime' | 'secondary' | 'ghost';

@Component({
  selector: 'button[peladaButton], a[peladaButton]',
  standalone: true,
  template: `<ng-content />`,
  host: {
    class: 'pelada-btn',
    '[class.pelada-btn--lime]': 'variant() === "lime"',
    '[class.pelada-btn--secondary]': 'variant() === "secondary"',
    '[class.pelada-btn--ghost]': 'variant() === "ghost"',
    '[class.pelada-btn--block]': 'block()',
  },
})
export class PeladaButtonComponent {
  readonly variant = input<PeladaButtonVariant>('primary');
  readonly block = input(false, { alias: 'peladaButtonBlock' });
}
