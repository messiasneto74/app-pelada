/**
 * Motor de sorteio e métricas — implementação em CORE-1+.
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
