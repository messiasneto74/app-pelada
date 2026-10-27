import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-tab-placeholder',
  standalone: true,
  template: `
    <section class="pelada-shell tab-placeholder">
      <p class="pelada-muted label">T3 · placeholder</p>
      <h1>{{ title }}</h1>
      <p class="pelada-muted">Tela {{ title }} — implementação nas issues 3.x.</p>
    </section>
  `,
  styles: [
    `
      .label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
    `,
  ],
})
export class TabPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title = this.route.snapshot.data['title'] as string;
}
