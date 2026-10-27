import { Component, input, model } from '@angular/core';

@Component({
  selector: 'pelada-switch',
  standalone: true,
  template: `
    <button
      type="button"
      class="pelada-switch"
      [class.pelada-switch--on]="checked()"
      [class.pelada-switch--disabled]="disabled()"
      role="switch"
      [attr.aria-checked]="checked()"
      [disabled]="disabled()"
      (click)="toggle()"
    >
      <span class="pelada-switch__track" aria-hidden="true">
        <span class="pelada-switch__thumb"></span>
      </span>
      <span class="pelada-switch__text"><ng-content /></span>
    </button>
  `,
  styles: [
    `
      button {
        border: 0;
        background: none;
        padding: 0;
        text-align: left;
        font: inherit;
        color: inherit;
      }
      .pelada-switch__text {
        font-size: 0.75rem;
        font-weight: 600;
      }
    `,
  ],
})
export class PeladaSwitchComponent {
  readonly checked = model(false);
  readonly disabled = input(false);

  toggle(): void {
    if (this.disabled()) return;
    this.checked.set(!this.checked());
  }
}
