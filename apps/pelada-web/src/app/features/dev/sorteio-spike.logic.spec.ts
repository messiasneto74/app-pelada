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
    const teamA = state.teams[0]?.players[0];
    const teamB = state.teams[1]?.players[0];
    expect(teamA).toBeDefined();
    expect(teamB).toBeDefined();
    if (!teamA || !teamB) {
      return;
    }
    const next = swapSpikePlayers(state, teamA.id, teamB.id);
    expect(next.draw.metrics.balanceScore).toBeGreaterThan(0);
    expect(next.teams[0]?.players.some((p) => p.id === teamB.id)).toBe(true);
    expect(next.teams[1]?.players.some((p) => p.id === teamA.id)).toBe(true);
  });
});
