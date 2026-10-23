import { describe, expect, it } from 'vitest';
import { markCheckboxesInBody } from './issue-dod.mjs';

describe('markCheckboxesInBody', () => {
  it('marks boxes after Testes obrigatórios', () => {
    const body = `# Title

## Testes obrigatórios
- [ ] item a
## Definition of Done
- [ ] item b
`;
    const out = markCheckboxesInBody(body);
    expect(out).toContain('- [x] item a');
    expect(out).toContain('- [x] item b');
  });

  it('unchanged without section', () => {
    expect(markCheckboxesInBody('# x\n- [ ] y')).toBe('# x\n- [ ] y');
  });
});
