import { Component, input } from '@angular/core';

@Component({
  selector: 'pelada-card',
  standalone: true,
  template: `
    <article class="pelada-card">
      @if (title()) {
        <header class="pelada-card__header">
          <h2 class="pelada-card__title">{{ title() }}</h2>
          <ng-content select="[cardActions]" />
        </header>
      }
      <ng-content />
    </article>
  `,
  styles: [`:host { display: block; }`],
})
export class PeladaCardComponent {
  readonly title = input<string>();
}
