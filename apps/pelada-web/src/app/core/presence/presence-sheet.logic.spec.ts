import type { RosterPlayer } from '../roster/roster-player.model';
import { canPlayerSelfEdit, presenceModeHint, selfFooterActions, selfStatusLine } from './presence-action.logic';
import type { PlayerPresenceStatus, PresenceRow } from './presence-attendance.model';
import {
  buildPresenceSheet,
  playersOutOfList,
  presenceFromAttendance,
  sortRowsByArrival,
} from './presence-list.logic';

const player = (id: string, name: string, isGoalkeeper = false): RosterPlayer => ({
  id,
  displayName: name,
  isGoalkeeper,
  position: isGoalkeeper ? 'Goleiro' : 'Meio',
  rating: 5,
  tags: [],
  isFixedList: false,
  userId: null,
});
const row = (p: RosterPlayer, status: PlayerPresenceStatus): PresenceRow => ({ kind: 'player', player: p, status });

describe('Issue #234 — lista de presença numerada', () => {
  const ana = player('a', 'Ana');
  const bia = player('b', 'Bia');
  const caio = player('c', 'Caio');
  const gil = player('g', 'Gil', true);
  const davi = player('d', 'Davi');
  const at = new Map([
    ['a', '2026-11-27T10:00:03Z'],
    ['b', '2026-11-27T10:00:01Z'],
    ['g', '2026-11-27T10:00:02Z'],
  ]);

  it('goleiros, linha e lista de espera, com a numeração do grupo', () => {
    const sheet = buildPresenceSheet({
      rows: [row(ana, 'confirmed'), row(bia, 'confirmed'), row(gil, 'confirmed'), row(caio, 'queue'), row(davi, 'pending')],
      queueOrder: ['c'],
      changedAtByPlayerId: at,
      capacity: 5, // 2 goleiros + 3 de linha
      goalkeeperSlots: 2,
      waitlistSlots: 2,
    });
    const show = (slots: { label: string; row: PresenceRow | null }[]) =>
      slots.map((s) => `${s.label} ${s.row?.kind === 'player' ? s.row.player.displayName : ''}`.trim());
    expect(show(sheet.goalkeepers)).toEqual(['1- Gil', '2-']);
    expect(show(sheet.field)).toEqual(['01- Bia', '02- Ana', '03-']); // ordem de chegada
    expect(show(sheet.waitlist)).toEqual(['04- Caio', '05-']); // numeração continua
  });

  it('sem vaga de goleiro, goleiro joga na linha; sem limite de espera mostra só quem está nela', () => {
    const sheet = buildPresenceSheet({
      rows: [row(gil, 'confirmed'), row(caio, 'queue')],
      queueOrder: ['c'],
      changedAtByPlayerId: new Map(),
      capacity: 2,
      goalkeeperSlots: 0,
      waitlistSlots: 0,
    });
    expect(sheet.goalkeepers).toEqual([]);
    expect(sheet.field.map((s) => s.label)).toEqual(['01-', '02-']);
    expect(sheet.field[0]!.row).toEqual(row(gil, 'confirmed'));
    expect(sheet.waitlist.map((s) => s.label)).toEqual(['03-']);
  });

  it('ordem de chegada: sem horário vai pro fim', () => {
    const r = sortRowsByArrival([row(davi, 'confirmed'), row(ana, 'confirmed'), row(bia, 'confirmed')], at);
    expect(r.map((x) => (x.kind === 'player' ? x.player.id : ''))).toEqual(['b', 'a', 'd']);
  });

  it('fora da lista: só quem não está confirmado nem na espera, em ordem alfabética', () => {
    const r = playersOutOfList([row(davi, 'pending'), row(ana, 'confirmed'), row(bia, 'pending'), row(caio, 'queue')]);
    expect(r.map((x) => (x.kind === 'player' ? x.player.displayName : ''))).toEqual(['Bia', 'Davi']);
  });

  it('a API traz quando cada um entrou', () => {
    const r = presenceFromAttendance([
      { playerId: 'a', status: 'CONFIRMED', queuePosition: null, statusChangedAt: '2026-11-27T10:00:00Z' },
    ]);
    expect(r.changedAtByPlayerId.get('a')).toBe('2026-11-27T10:00:00Z');
  });

  it('botão do rodapé por forma de presença', () => {
    expect(selfFooterActions('NAME_LIST', 'pending').map((a) => a.label)).toEqual(['Colocar meu nome']);
    expect(selfFooterActions('NAME_LIST', 'queue').map((a) => a.label)).toEqual(['Tirar meu nome']);
    expect(selfFooterActions('SELF_CONFIRM', 'pending').map((a) => [a.label, a.accept])).toEqual([
      ['✓ Vou', true],
      ['✗ Não vou', false],
    ]);
    expect(selfFooterActions('ORGANIZER_CLOSES', 'pending')).toEqual([]);
    expect(canPlayerSelfEdit(false, 'NAME_LIST')).toBeTrue();
    expect(canPlayerSelfEdit(true, 'NAME_LIST')).toBeFalse();
    expect(canPlayerSelfEdit(false, 'ORGANIZER_CLOSES')).toBeFalse();
    expect(presenceModeHint('NAME_LIST')).toContain('Lista de nomes');
  });

  it('frase do rodapé', () => {
    expect(selfStatusLine('confirmed', null)).toBe('Você está na lista.');
    expect(selfStatusLine('queue', 2)).toBe('Você é o 2º da lista de espera.');
    expect(selfStatusLine('pending', null)).toBe('Você ainda não está na lista.');
  });
});
