/** Regras mínimas para capacidade ideal (alinhado à API `computeMatchCapacity`). */
export type FormatRulesInput = {
  playersPerTeam: number;
  teamCount: number;
  capacity: number | null;
};

export function computeIdealCapacity(rules: FormatRulesInput): number {
  if (typeof rules.capacity === 'number' && rules.capacity > 0) {
    return rules.capacity;
  }
  return rules.playersPerTeam * rules.teamCount * 2;
}
