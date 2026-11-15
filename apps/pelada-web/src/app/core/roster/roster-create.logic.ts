export function normalizeCreatePlayerName(raw: string): string {
  return raw.trim();
}

/** `null` = válido; string = mensagem para o usuário. */
export function validateCreatePlayerName(name: string): string | null {
  const n = normalizeCreatePlayerName(name);
  if (n.length < 2) {
    return 'Informe o nome com pelo menos 2 caracteres.';
  }
  if (n.length > 60) {
    return 'Nome muito longo (máx. 60 caracteres).';
  }
  return null;
}

export function rosterCreateErrorMessage(
  status: number,
  apiMessage?: string,
): string {
  if (status === 403) {
    return 'Somente o organizador pode adicionar jogadores ao elenco.';
  }
  if (status === 400 && apiMessage) {
    return apiMessage;
  }
  if (status === 0) {
    return 'Sem conexão com a API. Tente de novo.';
  }
  return apiMessage ?? 'Não foi possível adicionar o jogador. Tente de novo.';
}