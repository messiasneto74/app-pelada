import { Component, input } from '@angular/core';

@Component({
  selector: 'pelada-field',
  standalone: true,
  template: `
    <div class="pelada-field">
      @if (label()) {
        <label class="pelada-field__label" [attr.for]="forId()">{{ label() }}</label>
      }
      <ng-content />
      @if (error()) {
        <p class="pelada-field__error" role="alert">{{ error() }}</p>
      } @else if (hint()) {
        <p class="pelada-field__hint">{{ hint() }}</p>
      }
    </div>
  `,
})
export class PeladaFieldComponent {
  readonly label = input<string>();
  readonly hint = input<string>();
  readonly error = input<string | null | undefined>();
  readonly forId = input<string>();
}
