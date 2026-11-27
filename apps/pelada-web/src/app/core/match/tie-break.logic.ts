/**
 * Issue #227 — critério de desempate (Regras da pelada):
 * - PAR_IMPAR / PENALTIS: no empate o adm escolhe na tela quem venceu;
 * - LAST_IN: quem entrou por último (o time de fora) fica;
 * - STAYED: quem já estava (ganhou a anterior) fica.
 * Na 1ª rodada ninguém "já estava": o adm decide (par ou ímpar ou pênaltis).
 * Quem vence o desempate conta como vitória na tabela.
 */
export type TieBreakRule = 'PAR_IMPAR' | 'PENALTIS' | 'LAST_IN' | 'STAYED';
export type TieChoiceMethod = 'PAR_IMPAR' | 'PENALTIS';

export const TIE_BREAK_OPTIONS: ReadonlyArray<{ value: TieBreakRule; label: string; hint: string }> = [
  { value: 'PAR_IMPAR', label: 'Par ou ímpar', hint: 'No empate, o adm marca quem ganhou no par ou ímpar.' },
  { value: 'PENALTIS', label: 'Pênaltis', hint: 'No empate, o adm marca quem ganhou nos pênaltis.' },
  { value: 'LAST_IN', label: 'Quem entrou por último', hint: 'No empate, fica o time que acabou de entrar.' },
  { value: 'STAYED', label: 'Quem já estava', hint: 'No empate, fica o time que ganhou a anterior.' },
];

export const TIE_METHOD_LABEL: Record<TieChoiceMethod, string> = {
  PAR_IMPAR: 'par ou ímpar',
  PENALTIS: 'pênaltis',
};

export const TIE_METHOD_WITH_PREP: Record<TieChoiceMethod, string> = {
  PAR_IMPAR: 'no par ou ímpar',
  PENALTIS: 'nos pênaltis',
};

export function readTieBreakRule(raw: unknown): TieBreakRule | null {
  return raw === 'PAR_IMPAR' || raw === 'PENALTIS' || raw === 'LAST_IN' || raw === 'STAYED' ? raw : null;
}

/** Formas que o adm pode usar pra decidir o empate agora (vazio = não precisa escolher). */
export function tieChoiceMethods(input: {
  rule: TieBreakRule | null;
  roundNumber: number;
  scoreHome: number;
  scoreAway: number;
}): TieChoiceMethod[] {
  if (!input.rule || input.scoreHome !== input.scoreAway) return [];
  if (input.rule === 'PAR_IMPAR' || input.rule === 'PENALTIS') return [input.rule];
  return input.roundNumber <= 1 ? ['PAR_IMPAR', 'PENALTIS'] : [];
}
