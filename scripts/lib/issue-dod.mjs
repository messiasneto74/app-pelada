/** Marca `- [ ]` como `- [x]` a partir de ## Testes obrigatórios. */
export function markCheckboxesInBody(body) {
  const start = body.search(/## Testes obrigat/i);
  if (start < 0) return body;
  const head = body.slice(0, start);
  const tail = body
    .slice(start)
    .split('\n')
    .map((line) => (line.startsWith('- [ ]') ? line.replace('- [ ]', '- [x]') : line))
    .join('\n');
  return head + tail;
}
