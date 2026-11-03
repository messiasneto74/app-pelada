import {
  buildCreateMatchRequest,
  combineLocalDateAndTime,
  defaultCreateMatchForm,
  isCreateMatchFormValid,
  rulesSummaryLine,
  validateCreateMatchForm,
} from './create-match-form.logic';

describe('create-match-form.logic (3.3)', () => {
  it('defaultCreateMatchForm preenche data de hoje e hora padrão', () => {
    const form = defaultCreateMatchForm('Quadra A');
    expect(form.time).toBe('19:30');
    expect(form.location).toBe('Quadra A');
    expect(form.presenceMode).toBe('ORGANIZER_CLOSES');
    expect(form.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('combineLocalDateAndTime monta Date local', () => {
    const dt = combineLocalDateAndTime('2026-12-01', '19:30');
    expect(dt).not.toBeNull();
    expect(dt!.getFullYear()).toBe(2026);
    expect(dt!.getHours()).toBe(19);
    expect(dt!.getMinutes()).toBe(30);
  });

  it('validateCreateMatchForm rejeita data inválida', () => {
    const errors = validateCreateMatchForm({
      ...defaultCreateMatchForm(),
      date: 'invalid',
      time: '19:30',
    });
    expect(errors.date).toBeDefined();
  });

  it('buildCreateMatchRequest gera ISO e campos opcionais', () => {
    const body = buildCreateMatchRequest({
      date: '2030-06-15',
      time: '20:00',
      location: '  Society  ',
      notes: '  Levar colete  ',
      presenceMode: 'SELF_CONFIRM',
    });
    expect(body).not.toBeNull();
    expect(body!.scheduledAt).toContain('2030');
    expect(body!.location).toBe('Society');
    expect(body!.notes).toBe('Levar colete');
    expect(body!.presenceMode).toBe('SELF_CONFIRM');
  });

  it('isCreateMatchFormValid espelha validate', () => {
    const ok = defaultCreateMatchForm();
    ok.date = '2030-01-01';
    expect(isCreateMatchFormValid(ok)).toBe(true);
  });

  it('rulesSummaryLine formata regras padrão', () => {
    expect(
      rulesSummaryLine({
        playersPerTeam: 6,
        teamCount: 2,
        modality: 'futsal',
      }),
    ).toContain('2 times');
  });
});
