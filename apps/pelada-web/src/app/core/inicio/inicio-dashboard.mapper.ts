import type { ActivePelada } from '../pelada/active-pelada.model';
import type { PeladaDashboardDto } from './inicio-dashboard.model';
import {
  cashSummaryPercent,
  formatMatchDateParts,
  formatMoneyBrl,
  modalityLabel,
  type InicioDashboardView,
  vacancyFillPercent,
} from './inicio-dashboard.model';

export function mapDashboardToView(
  pelada: ActivePelada,
  dto: PeladaDashboardDto,
): InicioDashboardView {
  const next = dto.nextMatch
    ? mapNextMatch(dto.nextMatch)
    : null;

  return {
    peladaName: pelada.name,
    nextMatch: next,
    rosterPlayerCount: dto.rosterPlayerCount,
    cashReceivedLabel: formatMoneyBrl(dto.cashMonth.receivedCents),
    cashExpectedLabel: formatMoneyBrl(dto.cashMonth.expectedCents),
    cashPercent: cashSummaryPercent(
      dto.cashMonth.receivedCents,
      dto.cashMonth.expectedCents,
    ),
  };
}

function mapNextMatch(match: NonNullable<PeladaDashboardDto['nextMatch']>) {
  const { dateLabel, timeLabel } = formatMatchDateParts(match.scheduledAt);
  return {
    matchId: match.id,
    dateLabel,
    timeLabel,
    locationLabel: match.location?.trim() || 'Local a combinar',
    modalityLabel: modalityLabel(match.modality),
    confirmedCount: match.confirmedCount,
    capacity: match.capacity,
    vacancyPercent: vacancyFillPercent(match.confirmedCount, match.capacity),
    confirmedPlayers: match.confirmedPlayers,
    presenceLink: '/partida/presenca',
  };
}

/** Fallback até 3.1-API — pelada real, sem partida/caixa no backend. */
export function buildEmptyDashboardDto(peladaId: string): PeladaDashboardDto {
  return {
    peladaId,
    nextMatch: null,
    rosterPlayerCount: 0,
    cashMonth: { receivedCents: 0, expectedCents: 0 },
  };
}
