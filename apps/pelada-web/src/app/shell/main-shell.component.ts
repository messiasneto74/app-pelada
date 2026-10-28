import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNavComponent } from './bottom-nav.component';

@Component({
  selector: 'app-main-shell',
  standalone: true,
  imports: [RouterOutlet, BottomNavComponent],
  template: `
    <div class="main-shell">
      <main class="main-shell__content">
        <router-outlet />
      </main>
      <pelada-bottom-nav />
    </div>
  `,
  styles: [
    `
      .main-shell {
        background: var(--pelada-bg);
      }
      .main-shell__content {
        padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px) + var(--pelada-space-4));
      }
    `,
  ],
})
export class MainShellComponent {}
