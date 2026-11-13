import { parseOptionalBoolean } from './parse-optional-boolean';

export function parseAttributesRecord(
  raw: Record<string, unknown>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      out[key] = Math.round(value);
      continue;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (!Number.isNaN(n)) {
        out[key] = Math.round(n);
      }
    }
  }
  return out;
}

/** Corpo bruto de multipart (strings) antes do ValidationPipe global. */
export function normalizePatchPlayerBody(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };

  const attrs: Record<string, unknown> = {};
  if (out.attributes && typeof out.attributes === 'object') {
    Object.assign(attrs, out.attributes as Record<string, unknown>);
  }
  for (const key of Object.keys(out)) {
    const match = /^attributes\[(.+)\]$/.exec(key);
    if (match) {
      attrs[match[1]] = out[key];
      delete out[key];
    }
  }
  if (Object.keys(attrs).length > 0) {
    out.attributes = parseAttributesRecord(attrs);
  }

  if ('isGoalkeeper' in out) {
    const parsed = parseOptionalBoolean(out.isGoalkeeper);
    if (parsed !== undefined) {
      out.isGoalkeeper = parsed;
    }
  }
  if ('isFixedList' in out) {
    const parsed = parseOptionalBoolean(out.isFixedList);
    if (parsed !== undefined) {
      out.isFixedList = parsed;
    }
  }

  if (typeof out.rating === 'string' && out.rating.trim() !== '') {
    const n = Number(out.rating);
    if (!Number.isNaN(n)) {
      out.rating = n;
    }
  }

  if (out.attributes && typeof out.attributes === 'object') {
    out.attributes = parseAttributesRecord(
      out.attributes as Record<string, unknown>,
    );
  }

  return out;
}
