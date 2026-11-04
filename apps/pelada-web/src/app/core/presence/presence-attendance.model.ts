import type { RosterPlayer } from '../roster/roster-player.model';

export type PresenceSegment = 'confirmed' | 'pending' | 'queue';

export type PlayerPresenceStatus = 'confirmed' | 'pending' | 'queue';

export type GuestPresenceStatus = 'guest_pending' | 'guest_declined';

export type PresenceRow =
  | {
      kind: 'player';
      player: RosterPlayer;
      status: PlayerPresenceStatus;
    }
  | {
      kind: 'guest';
      guestId: string;
      displayName: string;
      status: GuestPresenceStatus;
    };

export const PRESENCE_SEGMENT_OPTIONS: ReadonlyArray<{
  value: PresenceSegment;
  label: string;
}> = [
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'queue', label: 'Fila' },
];
