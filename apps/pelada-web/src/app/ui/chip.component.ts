import { Component, input } from '@angular/core';

export type PeladaChipVariant = 'neutral' | 'green' | 'orange' | 'red' | 'dark';

@Component({
  selector: 'pelada-chip',
  standalone: true,
  template: `<span [class]="classes"><ng-content /></span>`,
  styles: [`:host { display: inline-flex; }`],
})
export class PeladaChipComponent {
  readonly variant = input<PeladaChipVariant>('neutral');

  get classes(): string {
    const v = this.variant();
    const base = 'pelada-chip';
    if (v === 'neutral') return base;
    return `${base} pelada-chip--${v}`;
  }
}
