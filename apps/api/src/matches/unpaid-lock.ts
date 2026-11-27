import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Issue #263 — o que fazer com quem não pagou (Regras → "Quem não pagou"):
 * - `BLOCK`: trava — com cobrança em aberto não entra na lista nem no sorteio
 *   até o adm confirmar o pagamento;
 * - `CHARGE`: só cobra (padrão, como antes) — joga normal e a cobrança fica em aberto.
 */
export type UnpaidPolicy = 'BLOCK' | 'CHARGE';

export function readUnpaidPolicy(extra: unknown): UnpaidPolicy {
  const bag = extra && typeof extra === 'object' ? (extra as Record<string, unknown>) : {};
  return bag['unpaidPolicy'] === 'BLOCK' ? 'BLOCK' : 'CHARGE';
}

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Jogadores com cobrança em aberto (não paga e não perdoada) que não é desta
 * partida — "não pagou a anterior". A cobrança desta própria partida não trava.
 */
export async function playersWithOpenCharge(
  db: Db,
  peladaId: string,
  matchId: string,
  playerIds: readonly string[],
): Promise<Set<string>> {
  if (playerIds.length === 0) {
    return new Set();
  }
  const rows = await db.paymentLedger.findMany({
    where: {
      peladaId,
      playerId: { in: [...playerIds] },
      status: 'PENDING',
      OR: [{ matchId: null }, { matchId: { not: matchId } }],
    },
    select: { playerId: true },
  });
  return new Set(rows.map((r) => r.playerId));
}

export function openChargeMessage(name: string): string {
  return `${name} tem cobrança em aberto. Só entra na lista depois que o adm confirmar o pagamento no Caixa.`;
}
