import {
  buildSpikeDrawState,
  SPIKE_MOCK_ROSTER,
  swapSpikePlayers,
} from './sorteio-spike.logic';

describe('sorteio-spike.logic (5-SPIKE)', () => {
  it('sorteia 2 times com @pelada/core no browser', () => {
    const state = buildSpikeDrawState(SPIKE_MOCK_ROSTER, 42);
    expect(state.teams.length).toBe(2);
    expect(state.draw.metrics.balanceScore).toBeGreaterThan(0);
    const ids = state.teams.flatMap((t) => t.players.map((p) => p.id));
    expect(ids.length).toBe(SPIKE_MOCK_ROSTER.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reproduz o mesmo sorteio com a mesma seed', () => {
    const a = buildSpikeDrawState(SPIKE_MOCK_ROSTER, 7);
    const b = buildSpikeDrawState(SPIKE_MOCK_ROSTER, 7);
    expect(a.draw.teams).toEqual(b.draw.teams);
  });

  it('recalcula métricas após swap local', () => {
    const state = buildSpikeDrawState(SPIKE_MOCK_ROSTER, 99);
    const teamA = state.teams[0]?.players.find((p) => !p.isGoalkeeper);
    const teamB = state.teams[1]?.players.find((p) => !p.isGoalkeeper);
    expect(teamA).toBeDefined();
    expect(teamB).toBeDefined();
    if (!teamA || !teamB) {
      return;
    }
    const next = swapSpikePlayers(state, teamA.id, teamB.id);
    expect(next.ok).toBe(true);
    if (!next.ok) {
      return;
    }
    expect(next.state.draw.metrics.balanceScore).toBeGreaterThan(0);
    expect(next.state.teams[0]?.players.some((p) => p.id === teamB.id)).toBe(true);
    expect(next.state.teams[1]?.players.some((p) => p.id === teamA.id)).toBe(true);
  });

  it('rejeita swap goleiro↔linha sem lançar (ONE_PER_TEAM)', () => {
    const state = buildSpikeDrawState(SPIKE_MOCK_ROSTER, 42);
    const gk = state.teams[0]?.players.find((p) => p.isGoalkeeper);
    const line = state.teams[1]?.players.find((p) => !p.isGoalkeeper);
    expect(gk).toBeDefined();
    expect(line).toBeDefined();
    if (!gk || !line) {
      return;
    }
    const result = swapSpikePlayers(state, gk.id, line.id);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.message).toMatch(/goleiro/i);
    expect(state.draw.teams).toEqual(
      buildSpikeDrawState(SPIKE_MOCK_ROSTER, 42).draw.teams,
    );
  });

  it('permite swap goleiro↔goleiro', () => {
    const state = buildSpikeDrawState(SPIKE_MOCK_ROSTER, 42);
    const gkA = state.teams[0]?.players.find((p) => p.isGoalkeeper);
    const gkB = state.teams[1]?.players.find((p) => p.isGoalkeeper);
    expect(gkA).toBeDefined();
    expect(gkB).toBeDefined();
    if (!gkA || !gkB) {
      return;
    }
    const result = swapSpikePlayers(state, gkA.id, gkB.id);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.teams[0]?.players.some((p) => p.id === gkB.id)).toBe(true);
    expect(result.state.teams[1]?.players.some((p) => p.id === gkA.id)).toBe(true);
  });
});
