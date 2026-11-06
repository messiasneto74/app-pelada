/**
 * Motor de sorteio e métricas — CORE-1+ (`drawTeams`).
 * @pelada/api importará daqui após build.
 */
export const CORE_VERSION = 1;

export {
  computeIdealCapacity,
  type FormatRulesInput,
} from './format/capacity.js';
export {
  suggestFormat,
  type FormatSuggestionOption,
  type SuggestFormatResult,
} from './format/suggest-format.js';
export {
  drawTeams,
  computeDrawBalanceMetrics,
  DrawValidationError,
  type DrawBalanceMetrics,
  type DrawMode,
  type DrawPlayerInput,
  type DrawTeamSlot,
  type DrawTeamsInput,
  type DrawTeamsResult,
} from './draw/draw-teams.js';
