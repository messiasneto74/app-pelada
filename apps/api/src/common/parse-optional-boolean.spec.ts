import { parseOptionalBoolean } from './parse-optional-boolean';

describe('parseOptionalBoolean', () => {
  it('interpreta strings multipart', () => {
    expect(parseOptionalBoolean('true')).toBe(true);
    expect(parseOptionalBoolean('false')).toBe(false);
    expect(parseOptionalBoolean('FALSE')).toBe(false);
    expect(parseOptionalBoolean('1')).toBe(true);
    expect(parseOptionalBoolean('0')).toBe(false);
  });

  it('mantém boolean e vazio', () => {
    expect(parseOptionalBoolean(true)).toBe(true);
    expect(parseOptionalBoolean(undefined)).toBeUndefined();
    expect(parseOptionalBoolean('')).toBeUndefined();
  });
});
