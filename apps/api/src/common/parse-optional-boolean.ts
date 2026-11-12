/** Multipart/form-data envia booleans como strings; evita `"false"` virar `true` por coerção implícita. */
export function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (s === 'true' || s === '1') {
      return true;
    }
    if (s === 'false' || s === '0') {
      return false;
    }
  }
  return undefined;
}
