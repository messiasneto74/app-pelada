import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'pelada-progress',
  standalone: true,
  template: `
    <div class="pelada-progress" role="progressbar" [attr.aria-valuenow]="clamped()" aria-valuemin="0" aria-valuemax="100">
      <div class="pelada-progress__track">
        <span class="pelada-progress__fill" [style.width.%]="clamped()"></span>
      </div>
      @if (startLabel() || endLabel()) {
        <div class="pelada-progress__labels">
          <span>{{ startLabel() }}</span>
          @if (endLabel()) {
            <strong>{{ endLabel() }}</strong>
          }
        </div>
      }
    </div>
  `,
})
export class PeladaProgressComponent {
  readonly value = input(0);
  readonly startLabel = input<string>();
  readonly endLabel = input<string>();

  readonly clamped = computed(() => {
    const v = this.value();
    if (v < 0) return 0;
    if (v > 100) return 100;
    return v;
  });
}
