import {
  buildEmptyDashboardDto,
  mapDashboardToView,
} from './inicio-dashboard.mapper';
import {
  cashSummaryPercent,
  formatMoneyBrl,
  modalityLabel,
  vacancyFillPercent,
} from './inicio-dashboard.model';

describe('inicio dashboard model', () => {
  it('calcula percentual de vagas preenchidas', () => {
    expect(vacancyFillPercent(12, 14)).toBe(86);
    expect(vacancyFillPercent(0, 14)).toBe(0);
    expect(vacancyFillPercent(14, 0)).toBe(0);
  });

  it('calcula percentual do caixa do mês', () => {
    expect(cashSummaryPercent(7500, 10000)).toBe(75);
    expect(cashSummaryPercent(0, 0)).toBe(0);
  });

  it('formata modalidade e moeda', () => {
    expect(modalityLabel('society')).toBe('Society');
    expect(formatMoneyBrl(12500)).toContain('125');
  });
});

describe('inicio dashboard mapper', () => {
  const pelada = {
    id: 'p1',
    name: 'Pelada da Praça',
    defaultWeekday: 3,
    defaultLocation: 'Campo X',
    photoPreviewUrl: null,
  };

  it('mapeia partida e caixa', () => {
    const view = mapDashboardToView(pelada, {
      peladaId: 'p1',
      nextMatch: {
        id: 'm1',
        scheduledAt: '2026-11-05T19:30:00.000Z',
        location: 'Society ABC',
        modality: 'society',
        confirmedCount: 12,
        capacity: 14,
        confirmedPlayers: [
          { id: 'a', displayName: 'Ana Silva' },
          { id: 'b', displayName: 'Bruno Costa' },
        ],
      },
      rosterPlayerCount: 18,
      cashMonth: { receivedCents: 80000, expectedCents: 120000 },
    });

    expect(view.nextMatch?.modalityLabel).toBe('Society');
    expect(view.nextMatch?.vacancyPercent).toBe(86);
    expect(view.nextMatch?.confirmedPlayers.length).toBe(2);
    expect(view.cashPercent).toBe(67);
  });

  it('fallback vazio mantém pelada sem partida', () => {
    const view = mapDashboardToView(pelada, buildEmptyDashboardDto('p1'));
    expect(view.nextMatch).toBeNull();
    expect(view.rosterPlayerCount).toBe(0);
    expect(view.cashPercent).toBe(0);
  });
});
