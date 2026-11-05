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

@Injectable({ providedIn: 'root' })
export class PresenceSessionService {
  private activeMatchId: string | null = null;

  /** Partida em foco na aba Presença (3.4-NAV guard). */
  setActiveMatchId(matchId: string | null): void {
    this.activeMatchId = matchId;
  }

  getActiveMatchId(): string | null {
    return this.activeMatchId;
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
  }

  clear(matchId: string): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.removeItem(STORAGE_PREFIX + matchId);
  }
}
