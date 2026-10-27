import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: var(--pelada-bg);
        color: var(--pelada-ink);
      }
    `,
  ],
})
export class AppComponent {}
