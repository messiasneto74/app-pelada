import { Injectable } from '@angular/core';
import type { PlayerPresenceStatus } from './presence-attendance.model';
import type { PresenceRow } from './presence-attendance.model';
import type { RosterPlayer } from '../roster/roster-player.model';

export interface PresenceSessionSnapshot {
  matchId: string;
  listClosed: boolean;
  statusByPlayerId: Record<string, PlayerPresenceStatus>;
  guests: PresenceRow[];
  extraPlayers: RosterPlayer[];
  queueOrder: string[];
  presenceMode: 'SELF_CONFIRM' | 'ORGANIZER_CLOSES';
}

const STORAGE_PREFIX = 'pelada:presence:';
const ACTIVE_MATCH_KEY = `${STORAGE_PREFIX}@active-match-id`;

@Injectable({ providedIn: 'root' })
export class PresenceSessionService {
  private activeMatchId: string | null = null;

  /** Partida em foco na aba Presença (3.4-NAV guard). Persiste em sessionStorage. */
  setActiveMatchId(matchId: string | null): void {
    this.activeMatchId = matchId;
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    if (matchId) {
      sessionStorage.setItem(ACTIVE_MATCH_KEY, matchId);
    } else {
      sessionStorage.removeItem(ACTIVE_MATCH_KEY);
    }
  }

  getActiveMatchId(): string | null {
    if (this.activeMatchId) {
      return this.activeMatchId;
    }
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    const stored = sessionStorage.getItem(ACTIVE_MATCH_KEY);
    if (stored) {
      this.activeMatchId = stored;
    }
    return this.activeMatchId;
  }

  /** Resolve partida com lista fechada (reload / deep link em Sorteio). */
  resolveMatchIdWithClosedList(): string | null {
    const activeId = this.getActiveMatchId();
    if (activeId) {
      const activeSnap = this.load(activeId);
      if (activeSnap?.listClosed) {
        return activeId;
      }
      if (activeSnap) {
        return null;
      }
    }
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    let fallback: string | null = null;
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key?.startsWith(STORAGE_PREFIX) || key === ACTIVE_MATCH_KEY) {
        continue;
      }
      const matchId = key.slice(STORAGE_PREFIX.length);
      const snap = this.load(matchId);
      if (snap?.listClosed) {
        if (fallback !== null) {
          return null;
        }
        fallback = matchId;
      }
    }
    if (fallback) {
      this.setActiveMatchId(fallback);
    }
    return fallback;
  }

  load(matchId: string): PresenceSessionSnapshot | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    const raw = sessionStorage.getItem(STORAGE_PREFIX + matchId);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as PresenceSessionSnapshot;
    } catch {
      return null;
    }
  }

  save(snapshot: PresenceSessionSnapshot): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.setItem(STORAGE_PREFIX + snapshot.matchId, JSON.stringify(snapshot));
    this.setActiveMatchId(snapshot.matchId);
  }

  clear(matchId: string): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.removeItem(STORAGE_PREFIX + matchId);
    if (this.getActiveMatchId() === matchId) {
      this.setActiveMatchId(null);
    }
  }
}
