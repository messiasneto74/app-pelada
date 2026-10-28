import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { bottomNavTabActive, BottomNavTabId } from './bottom-nav-tab-active';

interface NavItem {
  id: BottomNavTabId;
  label: string;
  link: string;
}

@Component({
  selector: 'pelada-bottom-nav',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav class="pelada-bottom-nav" aria-label="Navegação principal">
      @for (item of items; track item.id) {
        <a
          class="pelada-bottom-nav__link"
          [class.pelada-bottom-nav__link--active]="isActive(item.id)"
          [routerLink]="item.link"
        >
          <span class="pelada-bottom-nav__icon" [attr.data-icon]="item.id" aria-hidden="true"></span>
          <span>{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
  styles: [
    `
      .pelada-bottom-nav {
        position: fixed;
        inset: auto 0 0;
        z-index: 20;
        left: 50%;
        transform: translateX(-50%);
        width: 100%;
        max-width: var(--pelada-shell-max);
        display: flex;
        justify-content: space-around;
        gap: 0;
        height: calc(70px + env(safe-area-inset-bottom, 0px));
        padding: 4px 4px env(safe-area-inset-bottom, 0px);
        background: var(--pelada-paper);
        border-top: 1px solid var(--pelada-line);
      }
      .pelada-bottom-nav__link {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 5px;
        min-width: 52px;
        min-height: var(--pelada-touch-min);
        padding: 6px 5px;
        border-radius: 9px;
        font-size: 0.5625rem;
        font-weight: 600;
        color: var(--pelada-muted);
        text-decoration: none;
      }
      .pelada-bottom-nav__link--active {
        background: #f0f5e6;
        color: #486f36;
      }
      .pelada-bottom-nav__icon {
        width: 20px;
        height: 20px;
        background: currentColor;
        opacity: 0.85;
        mask-size: contain;
        mask-repeat: no-repeat;
        mask-position: center;
      }
      .pelada-bottom-nav__icon[data-icon='inicio'] {
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='black'%3E%3Cpath d='M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z'/%3E%3C/svg%3E");
      }
      .pelada-bottom-nav__icon[data-icon='partida'] {
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='black'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3C/svg%3E");
      }
      .pelada-bottom-nav__icon[data-icon='jogadores'] {
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='black'%3E%3Cpath d='M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 9a7 7 0 0 1 14 0Z'/%3E%3C/svg%3E");
      }
      .pelada-bottom-nav__icon[data-icon='caixa'] {
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='black'%3E%3Cpath d='M4 7h16v12H4Zm2-4h12l2 4H4Z'/%3E%3C/svg%3E");
      }
    `,
  ],
})
export class BottomNavComponent {
  private readonly router = inject(Router);

  readonly items: NavItem[] = [
    { id: 'inicio', label: 'Início', link: '/inicio' },
    { id: 'partida', label: 'Partida', link: '/partida' },
    { id: 'jogadores', label: 'Jogadores', link: '/jogadores' },
    { id: 'caixa', label: 'Caixa', link: '/caixa' },
  ];

  isActive(tab: BottomNavTabId): boolean {
    return bottomNavTabActive(this.router.url, tab);
  }
}
