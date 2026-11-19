import type { PlayerProfileAttributeKey } from './player-profile.logic';

export type TagAttributeSuggestion = {
  attribute: PlayerProfileAttributeKey;
  value: number;
};

type CatalogEntry = {
  tags: string[];
  attribute: PlayerProfileAttributeKey;
  value: number;
};

/**
 * Catálogo inicial de tags de estilo (issue #188) — lógica simples de
 * palavra-chave, sem IA/geração. Ajustável pelo mantenedor conforme uso real.
 */
const STYLE_TAG_CATALOG: CatalogEntry[] = [
  { tags: ['corre muito', 'muito rápido'], attribute: 'velocidade', value: 9 },
  { tags: ['rápido'], attribute: 'velocidade', value: 7 },
  { tags: ['chuta muito bem', 'artilheiro'], attribute: 'chute', value: 9 },
  { tags: ['chuta bem', 'finalizador'], attribute: 'chute', value: 7 },
  { tags: ['ótima técnica', 'driblador'], attribute: 'tecnica', value: 9 },
  { tags: ['boa técnica'], attribute: 'tecnica', value: 7 },
  { tags: ['passa muito bem', 'visão de jogo'], attribute: 'passe', value: 9 },
  { tags: ['passa bem'], attribute: 'passe', value: 7 },
  { tags: ['ótimo defensor', 'zagueiro'], attribute: 'defesa', value: 9 },
  { tags: ['bom defensor', 'marcador'], attribute: 'defesa', value: 7 },
  { tags: ['muito forte', 'robusto'], attribute: 'forca', value: 9 },
  { tags: ['forte'], attribute: 'forca', value: 7 },
];

export const STYLE_TAG_CATALOG_NAMES: readonly string[] = STYLE_TAG_CATALOG.flatMap(
  (entry) => entry.tags,
);

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

/** Sugestão de atributo pra uma tag exata do catálogo (issue #188). */
export function attributeSuggestionForTag(
  tag: string,
): TagAttributeSuggestion | null {
  const normalized = normalizeTag(tag);
  if (!normalized) return null;
  const entry = STYLE_TAG_CATALOG.find((e) => e.tags.some((t) => t === normalized));
  return entry ? { attribute: entry.attribute, value: entry.value } : null;
}

/**
 * Sugestões de atributo pra todas as tags do catálogo presentes em `tags`
 * (issue #188) — usado pra pré-preencher os sliders quando o organizador
 * adiciona uma dessas tags.
 */
export function attributeSuggestionsForTags(
  tags: readonly string[],
): TagAttributeSuggestion[] {
  const result: TagAttributeSuggestion[] = [];
  for (const tag of tags) {
    const suggestion = attributeSuggestionForTag(tag);
    if (suggestion) result.push(suggestion);
  }
  return result;
}

/**
 * Lista de sugestões de autocomplete pro campo de tags: catálogo fixo +
 * tags já usadas por outros jogadores da pelada, sem duplicatas.
 */
export function suggestStyleTags(usedTags: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of [...STYLE_TAG_CATALOG_NAMES, ...usedTags]) {
    const normalized = normalizeTag(tag);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(tag.trim());
  }
  return result;
}
