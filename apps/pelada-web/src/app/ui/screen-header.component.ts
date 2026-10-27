import { Component, input } from '@angular/core';

@Component({
  selector: 'pelada-screen-header',
  standalone: true,
  template: `
    <header class="pelada-screen-header">
      <div class="pelada-screen-header__text">
        @if (eyebrow()) {
          <p class="pelada-screen-header__eyebrow">{{ eyebrow() }}</p>
        }
        <h1 class="pelada-screen-header__title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="pelada-screen-header__subtitle pelada-muted">{{ subtitle() }}</p>
        }
      </div>
      <div class="pelada-screen-header__actions">
        <ng-content select="[headerActions]" />
      </div>
    </header>
  `,
})
export class ScreenHeaderComponent {
  readonly eyebrow = input<string>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
