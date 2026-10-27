import { Component, input, model } from '@angular/core';

export interface PeladaSegmentOption {
  value: string;
  label: string;
}

@Component({
  selector: 'pelada-segment',
  standalone: true,
  template: `
    <div class="pelada-segment" role="tablist">
      @for (opt of options(); track opt.value) {
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="value() === opt.value"
          (click)="value.set(opt.value)"
        >
          {{ opt.label }}
        </button>
      }
    </div>
  `,
})
export class PeladaSegmentComponent {
  readonly options = input.required<PeladaSegmentOption[]>();
  readonly value = model.required<string>();
}
