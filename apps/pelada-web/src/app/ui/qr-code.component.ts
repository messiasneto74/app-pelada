import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { buildQrCells } from '../core/pelada/qr-code.util';

/** Issue #172 (fase 1) — QR code do link de convite, desenhado como SVG (sem canvas/rede). */
@Component({
  selector: 'pelada-qr-code',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + size() + ' ' + size()"
      [attr.width]="pixelSize()"
      [attr.height]="pixelSize()"
      role="img"
      [attr.aria-label]="ariaLabel()"
    >
      <rect [attr.width]="size()" [attr.height]="size()" fill="#ffffff" />
      @for (cell of cells(); track cell.x + '-' + cell.y) {
        <rect [attr.x]="cell.x" [attr.y]="cell.y" width="1" height="1" fill="#111111" />
      }
    </svg>
  `,
})
export class PeladaQrCodeComponent {
  readonly value = input.required<string>();
  readonly pixelSize = input<number>(220);
  readonly ariaLabel = input<string>('QR code do convite');

  private readonly matrix = computed(() => buildQrCells(this.value()));
  readonly size = computed(() => this.matrix().size);
  readonly cells = computed(() => this.matrix().cells);
}
