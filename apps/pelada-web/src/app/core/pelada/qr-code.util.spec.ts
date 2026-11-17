import { buildQrCells } from './qr-code.util';

describe('buildQrCells (issue #172)', () => {
  it('gera uma matriz quadrada com módulos escuros pro link do convite', () => {
    const { size, cells } = buildQrCells('https://app.exemplo.com/convite/tok-123');

    expect(size).toBeGreaterThan(0);
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.x).toBeLessThan(size);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeLessThan(size);
    }
  });

  it('textos diferentes produzem matrizes diferentes', () => {
    const a = buildQrCells('https://app.exemplo.com/convite/tok-1');
    const b = buildQrCells('https://app.exemplo.com/convite/tok-2');
    expect(a.cells).not.toEqual(b.cells);
  });
});
