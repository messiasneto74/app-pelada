import { describe, expect, it, vi } from 'vitest';
import {
  markIssuesDod,
  parseIssueNumbers,
} from './mark-issue-dod-runner.mjs';

describe('mark-issue-dod-runner', () => {
  it('parseIssueNumbers', () => {
    expect(parseIssueNumbers(['8', 'x', '3'])).toEqual([8, 3]);
  });

  it('markIssuesDod updates issue', () => {
    const gh = vi.fn((args) => {
      if (args.includes('view')) {
        return JSON.stringify({
          title: 'T',
          body: '## Testes obrigatórios\n- [ ] a\n',
        });
      }
      return '';
    });
    const log = vi.fn();
    const res = markIssuesDod([1], { gh, log });
    expect(res).toEqual([{ num: 1, changed: true }]);
    expect(gh).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalled();
  });

  it('markIssuesDod skips unchanged', () => {
    const gh = vi.fn(() =>
      JSON.stringify({ title: 'T', body: '# no checklist\n' }),
    );
    const warn = vi.fn();
    const res = markIssuesDod([2], { gh, warn });
    expect(res[0].changed).toBe(false);
    expect(warn).toHaveBeenCalled();
  });

  it('requires gh', () => {
    expect(() => markIssuesDod([1], {})).toThrow(/gh dependency/);
  });
});
