import {
  computeIdealCapacity,
  type FormatRulesInput,
} from './capacity.js';

export type FormatSuggestionOption = {
  id: string;
  title: string;
  detail: string;
  /** Quando o organizador aceita ajustar regras da partida/pelada. */
  proposedRules?: Pick<FormatRulesInput, 'playersPerTeam' | 'teamCount' | 'capacity'>;
};

export type SuggestFormatResult = {
  playerCount: number;
  idealCapacity: number;
  delta: number;
  /** true quando confirmados ≠ capacidade ideal configurada. */
  mismatch: boolean;
  options: FormatSuggestionOption[];
};

const MIN_LINE = 4;
const MAX_LINE = 11;
const MIN_TEAMS = 2;
const MAX_TEAMS = 6;

function rulesDistance(
  current: FormatRulesInput,
  ppt: number,
  tc: number,
): number {
  return (
    Math.abs(ppt - current.playersPerTeam) +
    Math.abs(tc - current.teamCount) * 2
  );
}

function formatSummary(ppt: number, tc: number, cap: number): string {
  return `${tc} times · ${ppt} de linha · ${cap} vagas`;
}

function findRuleAdjustments(
  playerCount: number,
  current: FormatRulesInput,
): FormatSuggestionOption[] {
  const hits: { ppt: number; tc: number; cap: number; dist: number }[] = [];

  for (let tc = MIN_TEAMS; tc <= MAX_TEAMS; tc += 1) {
    for (let ppt = MIN_LINE; ppt <= MAX_LINE; ppt += 1) {
      const cap = computeIdealCapacity({
        playersPerTeam: ppt,
        teamCount: tc,
        capacity: null,
      });
      if (cap !== playerCount) {
        continue;
      }
      hits.push({
        ppt,
        tc,
        cap,
        dist: rulesDistance(current, ppt, tc),
      });
    }
  }

  hits.sort((a, b) => a.dist - b.dist || a.tc - b.tc || a.ppt - b.ppt);

  return hits.slice(0, 3).map((h, index) => ({
    id: `adjust-${h.tc}x${h.ppt}-${index}`,
    title: formatSummary(h.ppt, h.tc, h.cap),
    detail:
      h.dist === 0
        ? 'Formato atual já bate com o número de confirmados.'
        : 'Ajuste sugerido para encaixar todos os confirmados no sorteio.',
    proposedRules: {
      playersPerTeam: h.ppt,
      teamCount: h.tc,
      capacity: h.cap,
    },
  }));
}

/**
 * História 45 — sugere formatos quando confirmados ≠ capacidade ideal das regras.
 */
export function suggestFormat(
  playerCount: number,
  rules: FormatRulesInput,
): SuggestFormatResult {
  const safeCount = Math.max(0, Math.floor(playerCount));
  const idealCapacity = computeIdealCapacity(rules);
  const delta = safeCount - idealCapacity;
  const mismatch = delta !== 0;

  if (!mismatch) {
    return {
      playerCount: safeCount,
      idealCapacity,
      delta: 0,
      mismatch: false,
      options: [],
    };
  }

  const options: FormatSuggestionOption[] = [];

  if (delta < 0) {
    options.push({
      id: 'partial-keep-rules',
      title: 'Manter formato e jogar com quem veio',
      detail: `Faltam ${Math.abs(delta)} para a capacidade ideal (${idealCapacity}). Você pode fechar a lista assim e sortear só os confirmados.`,
    });
  } else {
    options.push({
      id: 'queue-keep-rules',
      title: 'Manter formato e usar a fila',
      detail: `${delta} acima da capacidade ideal (${idealCapacity}). Quem passar do limite fica na fila até abrir vaga.`,
    });
  }

  const adjustments = findRuleAdjustments(safeCount, rules);
  for (const adj of adjustments) {
    if (
      adj.proposedRules?.playersPerTeam === rules.playersPerTeam &&
      adj.proposedRules?.teamCount === rules.teamCount
    ) {
      continue;
    }
    options.push(adj);
  }

  if (adjustments.length === 0) {
    const nearest = findNearestCapacityAdjustment(safeCount, rules);
    if (
      nearest &&
      !(
        nearest.proposedRules?.playersPerTeam === rules.playersPerTeam &&
        nearest.proposedRules?.teamCount === rules.teamCount
      )
    ) {
      options.push(nearest);
    }
  }

  return {
    playerCount: safeCount,
    idealCapacity,
    delta,
    mismatch: true,
    options,
  };
}

function findNearestCapacityAdjustment(
  playerCount: number,
  current: FormatRulesInput,
): FormatSuggestionOption | null {
  let best: {
    ppt: number;
    tc: number;
    cap: number;
    gap: number;
    dist: number;
  } | null = null;

  for (let tc = MIN_TEAMS; tc <= MAX_TEAMS; tc += 1) {
    for (let ppt = MIN_LINE; ppt <= MAX_LINE; ppt += 1) {
      const cap = computeIdealCapacity({
        playersPerTeam: ppt,
        teamCount: tc,
        capacity: null,
      });
      const gap = Math.abs(cap - playerCount);
      const dist = rulesDistance(current, ppt, tc);
      if (
        !best ||
        gap < best.gap ||
        (gap === best.gap && dist < best.dist)
      ) {
        best = { ppt, tc, cap, gap, dist };
      }
    }
  }

  if (!best) {
    return null;
  }

  return {
    id: `nearest-${best.tc}x${best.ppt}`,
    title: formatSummary(best.ppt, best.tc, best.cap),
    detail: `Não há combinação exata para ${playerCount} confirmados; esta é a mais próxima (${best.cap} vagas).`,
    proposedRules: {
      playersPerTeam: best.ppt,
      teamCount: best.tc,
      capacity: best.cap,
    },
  };
}
