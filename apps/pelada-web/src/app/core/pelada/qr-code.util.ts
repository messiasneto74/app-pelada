import qrcode from 'qrcode-generator';

export type QrCell = { x: number; y: number };

/** Issue #172 (fase 1) — módulos "escuros" do QR, pra desenhar como `<rect>` SVG. */
export function buildQrCells(text: string): { size: number; cells: QrCell[] } {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  const cells: QrCell[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.isDark(row, col)) {
        cells.push({ x: col, y: row });
      }
    }
  }
  return { size, cells };
}
