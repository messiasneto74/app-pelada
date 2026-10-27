import { Directive, HostBinding, input } from '@angular/core';

@Directive({
  selector: 'input[peladaInput], select[peladaInput], textarea[peladaInput]',
  standalone: true,
})
export class PeladaInputDirective {
  readonly invalid = input(false, { alias: 'peladaInputInvalid' });

  @HostBinding('class')
  get classes(): string {
    return this.invalid() ? 'pelada-input pelada-input--error' : 'pelada-input';
  }
}
