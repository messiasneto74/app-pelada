import { describe, expect, it } from 'vitest';
import { shuffle } from './rng.js';

describe('shuffle (Fisher–Yates) — embaralhamento sem viés (Médio)', () => {
  it('preserva todos os elementos', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const result = shuffle(items, Math.random);
    expect(result).toHaveLength(items.length);
    expect([...result].sort()).toEqual([...items].sort());
  });

  it('não modifica o array original', () => {
    const items = [1, 2, 3];
    const copy = [...items];
    shuffle(items, Math.random);
    expect(items).toEqual(copy);
  });

  it('é determinístico para a mesma sequência de random()', () => {
    const items = ['a', 'b', 'c', 'd'];
    const seq = [0.1, 0.5, 0.9];
    let i = 0;
    const random = () => seq[i++ % seq.length];

    i = 0;
    const r1 = shuffle(items, random);
    i = 0;
    const r2 = shuffle(items, random);

    expect(r1).toEqual(r2);
  });

  it('distribui a posição final de cada item de forma uniforme (sort(() => random()-0.5) é enviesado)', () => {
    const items = [0, 1, 2, 3];
    const n = items.length;
    const trials = 20000;
    const positionCounts = items.map(() => new Array(n).fill(0));

    for (let t = 0; t < trials; t++) {
      const result = shuffle(items, Math.random);
      for (let pos = 0; pos < n; pos++) {
        positionCounts[result[pos]][pos]++;
      }
    }

    const expected = trials / n;
    for (const counts of positionCounts) {
      for (const count of counts) {
        expect(count).toBeGreaterThan(expected * 0.85);
        expect(count).toBeLessThan(expected * 1.15);
      }
    }
  });
});
