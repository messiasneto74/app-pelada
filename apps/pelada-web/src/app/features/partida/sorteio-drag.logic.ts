/**
 * CDK `transferArrayItem` entre duas equipes insere o arrastado na posição alvo;
 * o “par” do swap na API (5-API) é o jogador deslocado, normalmente o que ficou logo abaixo.
 */
export function resolveSwapPairAfterCrossListDrop(
  targetTeamPlayers: readonly { id: string }[],
  currentIndex: number,
  draggedPlayerId: string,
): { playerAId: string; playerBId: string } | null {
  if (currentIndex < 0 || currentIndex >= targetTeamPlayers.length) {
    return null;
  }
  const atSlot = targetTeamPlayers[currentIndex];
  if (atSlot.id !== draggedPlayerId) {
    return { playerAId: draggedPlayerId, playerBId: atSlot.id };
  }
  const below = targetTeamPlayers[currentIndex + 1];
  if (below) {
    return { playerAId: draggedPlayerId, playerBId: below.id };
  }
  const above = targetTeamPlayers[currentIndex - 1];
  if (above && above.id !== draggedPlayerId) {
    return { playerAId: draggedPlayerId, playerBId: above.id };
  }
  return null;
}
