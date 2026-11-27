/** Valores editáveis na tela 3.2 — alinhados a `PeladaRules` (API 3.2-API depois). */

export type Modality = 'futsal' | 'society' | 'campo';

export type PaymentModel = 'PER_MATCH' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export type DrawMode = 'BALANCED' | 'RANDOM' | 'MANUAL';

/** Nota e atributos são excludentes no sorteio (história pedida por Messias). */
export type ScoringMode = 'rating' | 'attributes';

export type FixedGkRotation = 'RESULT' | 'SIDE' | 'MANUAL_ONLY';

/** Issue #234 — como a presença é marcada (padrão das partidas novas). */
export type PresenceModeRule = 'ORGANIZER_CLOSES' | 'SELF_CONFIRM' | 'NAME_LIST';

export type PeladaRulesFormValues = {
  /** Issue #227 — critério de desempate (null = ainda não escolhido: empate é empate). */
  tieBreak: 'PAR_IMPAR' | 'PENALTIS' | 'LAST_IN' | 'STAYED' | null;
  playersPerTeam: number;
  teamCount: number;
  modality: Modality;
  goalkeeperPerTeam: boolean;
  fixedGoalkeeper: boolean;
  fixedGkRotation: FixedGkRotation;
  fixedListOnly: boolean;
  paymentModel: PaymentModel;
  drawMode: DrawMode;
  drawUseRating: boolean;
  drawUseAttributes: boolean;
  drawUseStyleTags: boolean;
  /** História 27 — jogador pode editar próprio perfil no elenco. */
  allowPlayerSelfEdit: boolean;
  /** Texto livre do resumo do dia (épico #156, etapa 4) — vazio usa o padrão da API. */
  summaryTemplate: string;
  /** Issue #188 — tags extras do organizador, somadas ao catálogo fixo nas sugestões. */
  customStyleTagsText: string;
  /** Issue #179 — nº de presenças confirmadas pra promover Convidado a Jogador. 0 desativa. */
  autoPromoteAfterPresences: number;
  /** Issue #190 — valor padrão da contribuição (em centavos), usado ao lançar cobrança no Caixa. 0 = sem valor padrão. */
  feeCents: number;
  /** Issue #229 — tempo de cada partida (rodada), em minutos. */
  roundMinutes: number;
  /** Issue #230 — ao aumentar as vagas de uma partida, os primeiros da fila sobem. */
  autoFillQueueOnCapacityIncrease: boolean;
};

export const DEFAULT_PELADA_RULES: PeladaRulesFormValues = {
  tieBreak: null,
  playersPerTeam: 6,
  teamCount: 2,
  modality: 'campo',
  goalkeeperPerTeam: false,
  fixedGoalkeeper: false,
  fixedGkRotation: 'MANUAL_ONLY',
  fixedListOnly: false,
  paymentModel: 'PER_MATCH',
  drawMode: 'BALANCED',
  drawUseRating: true,
  drawUseAttributes: true,
  drawUseStyleTags: true,
  allowPlayerSelfEdit: false,
  summaryTemplate: '',
  customStyleTagsText: '',
  autoPromoteAfterPresences: 0,
  feeCents: 0,
  roundMinutes: 20,
  autoFillQueueOnCapacityIncrease: false,
};

export function validateGoalkeeperToggles(
  goalkeeperPerTeam: boolean,
  fixedGoalkeeper: boolean,
): string | null {
  if (goalkeeperPerTeam && fixedGoalkeeper) {
    return 'Goleiro por time e goleiro fixo no gol não podem ficar ligados ao mesmo tempo.';
  }
  return null;
}

/** Mensagem amigável a partir de `PATCH /peladas/:id/rules`. */
export function mapPeladaRulesApiError(err: unknown): string {
  const http = err as { status?: number };
  const status = http?.status;
  if (status === 401) {
    return 'Sessão expirada ou sem login. Volte em /entrar e tente de novo.';
  }
  if (status === 0) {
    return 'Não foi possível contactar a API. Confira se dev:api ou stack:up está no ar.';
  }
  if (status === 403) {
    return 'Só o organizador pode alterar as regras padrão do grupo.';
  }
  return 'Não foi possível salvar as regras. Tente de novo.';
}

export function validatePeladaRulesForm(values: PeladaRulesFormValues): string | null {
  const gk = validateGoalkeeperToggles(
    values.goalkeeperPerTeam,
    values.fixedGoalkeeper,
  );
  if (gk) {
    return gk;
  }
  if (values.playersPerTeam < 4 || values.playersPerTeam > 11) {
    return 'Jogadores de linha por time: entre 4 e 11.';
  }
  if (values.teamCount < 2 || values.teamCount > 6) {
    return 'Times no sorteio: entre 2 e 6.';
  }
  if (values.autoPromoteAfterPresences < 0) {
    return 'Promoção automática: nº de presenças não pode ser negativo.';
  }
  if (!Number.isInteger(values.roundMinutes) || values.roundMinutes < 1 || values.roundMinutes > 120) {
    return 'Tempo de cada partida: entre 1 e 120 minutos.';
  }
  if (!Number.isInteger(values.waitlistSlots) || values.waitlistSlots < 0 || values.waitlistSlots > 50) {
    return 'Lista de espera: entre 0 (sem limite) e 50 vagas.';
  }
  if (values.feeCents < 0) {
    return 'Contribuição por partida: valor não pode ser negativo.';
  }
  return null;
}

/** `drawUseRating`/`drawUseAttributes` → modo único (nota XOR atributos). */
export function scoringModeFromFlags(
  drawUseRating: boolean,
  drawUseAttributes: boolean,
): ScoringMode {
  return !drawUseRating && drawUseAttributes ? 'attributes' : 'rating';
}

/** Modo único → `drawUseRating`/`drawUseAttributes` (sempre excludentes). */
export function scoringModeToFlags(
  mode: ScoringMode,
): Pick<PeladaRulesFormValues, 'drawUseRating' | 'drawUseAttributes'> {
  return {
    drawUseRating: mode === 'rating',
    drawUseAttributes: mode === 'attributes',
  };
}

export function toGoalkeeperMode(values: Pick<
  PeladaRulesFormValues,
  'goalkeeperPerTeam' | 'fixedGoalkeeper'
>): 'ROTATING' | 'FIXED_PER_TEAM' | 'FIXED_GLOBAL' {
  if (values.fixedGoalkeeper) {
    return 'FIXED_GLOBAL';
  }
  if (values.goalkeeperPerTeam) {
    return 'FIXED_PER_TEAM';
  }
  return 'ROTATING';
}

/** Payload alinhado a `PeladaRules.drawWeights` (3.2-API). */
export function toDrawWeights(
  values: Pick<
    PeladaRulesFormValues,
    'drawMode' | 'drawUseRating' | 'drawUseAttributes' | 'drawUseStyleTags'
  >,
): Record<string, unknown> {
  return {
    mode: values.drawMode,
    useRating: values.drawUseRating,
    useAttributes: values.drawUseAttributes,
    useStyleTags: values.drawUseStyleTags,
  };
}
