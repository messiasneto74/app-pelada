import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ScreenHeaderComponent } from '../../ui/screen-header.component';

@Component({
  selector: 'app-tab-placeholder',
  standalone: true,
  imports: [ScreenHeaderComponent],
  template: `
    <section class="pelada-shell tab-placeholder">
      <pelada-screen-header [eyebrow]="eyebrow" [title]="title" [subtitle]="subtitle" />
      <p class="pelada-muted">Placeholder — telas reais nas issues 3.x / L1.</p>
    </section>
  `,
})
export class TabPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title = this.route.snapshot.data['title'] as string;
  readonly eyebrow = (this.route.snapshot.data['eyebrow'] as string) ?? 'Pelada';
  readonly subtitle = this.route.snapshot.data['subtitle'] as string | undefined;
}
