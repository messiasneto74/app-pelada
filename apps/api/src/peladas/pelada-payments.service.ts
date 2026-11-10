import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUserPayload } from '../auth/auth-user';
import type { CreatePaymentLedgerDto } from '../domain/dto/create-payment-ledger.dto';
import type { PaymentLedgerQueryDto } from '../domain/dto/payment-ledger-query.dto';
import { MeService } from '../me/me.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  groupLedgerEntries,
  periodBoundsForPaymentModel,
  readFeeCentsFromRules,
  readPaymentModelFromRules,
  summarizeLedgerAmounts,
  toLedgerEntryDto,
  type PaymentLedgerResponse,
} from './payment-ledger.logic';

@Injectable()
export class PeladaPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meService: MeService,
  ) {}

  async getLedger(
    auth: AuthUserPayload,
    peladaId: string,
    query: PaymentLedgerQueryDto,
  ): Promise<PaymentLedgerResponse> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertMember(peladaId, user.id);

    const rules = await this.prisma.peladaRules.findUnique({
      where: { peladaId },
    });
    if (!rules) {
      throw new NotFoundException('Regras da pelada não encontradas.');
    }

    const paymentModel = readPaymentModelFromRules(rules.extra);
    const feeCents = readFeeCentsFromRules(rules.extra);
    const ref = query.at ? new Date(query.at) : new Date();
    const { start, end } = periodBoundsForPaymentModel(paymentModel, ref);
    const groupBy = query.groupBy ?? 'player';

    const rows = await this.prisma.paymentLedger.findMany({
      where: {
        peladaId,
        createdAt: { gte: start, lt: end },
      },
      include: {
        player: {
          select: { id: true, displayName: true, paymentPlan: true },
        },
        match: { select: { id: true, scheduledAt: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    const entries = rows.map((r) => toLedgerEntryDto(r));
    const summary = summarizeLedgerAmounts(rows);
    const groups = groupLedgerEntries(entries, groupBy);

    return {
      peladaId,
      paymentModel,
      feeCents,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      summary,
      groups,
    };
  }

  async createLedgerEntry(
    auth: AuthUserPayload,
    peladaId: string,
    dto: CreatePaymentLedgerDto,
  ) {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);

    const player = await this.prisma.player.findFirst({
      where: { id: dto.playerId, peladaId },
    });
    if (!player) {
      throw new NotFoundException('Jogador não encontrado nesta pelada.');
    }

    if (dto.matchId) {
      const match = await this.prisma.match.findFirst({
        where: { id: dto.matchId, peladaId },
      });
      if (!match) {
        throw new NotFoundException('Partida não encontrada nesta pelada.');
      }
    }

    const created = await this.prisma.paymentLedger.create({
      data: {
        peladaId,
        playerId: dto.playerId,
        matchId: dto.matchId ?? null,
        amountCents: dto.amountCents,
        status: 'PENDING',
      },
      include: {
        player: {
          select: { id: true, displayName: true, paymentPlan: true },
        },
        match: { select: { id: true, scheduledAt: true } },
      },
    });

    return toLedgerEntryDto(created);
  }

  async markPaid(auth: AuthUserPayload, peladaId: string, ledgerId: string) {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);

    const row = await this.prisma.paymentLedger.findFirst({
      where: { id: ledgerId, peladaId },
    });
    if (!row) {
      throw new NotFoundException('Lançamento não encontrado.');
    }

    const updated = await this.prisma.paymentLedger.update({
      where: { id: ledgerId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
      include: {
        player: {
          select: { id: true, displayName: true, paymentPlan: true },
        },
        match: { select: { id: true, scheduledAt: true } },
      },
    });

    return toLedgerEntryDto(updated);
  }

  private async assertMember(peladaId: string, userId: string): Promise<void> {
    const pelada = await this.prisma.pelada.findUnique({ where: { id: peladaId } });
    if (!pelada) {
      throw new NotFoundException('Pelada não encontrada.');
    }
    const member = await this.prisma.peladaMember.findUnique({
      where: { peladaId_userId: { peladaId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('Sem acesso a esta pelada.');
    }
  }

  private async assertOrganizador(
    peladaId: string,
    userId: string,
  ): Promise<void> {
    await this.assertMember(peladaId, userId);
    const member = await this.prisma.peladaMember.findUnique({
      where: { peladaId_userId: { peladaId, userId } },
    });
    if (member?.role !== 'ORGANIZADOR') {
      throw new ForbiddenException('Somente organizador altera o caixa.');
    }
  }
}
