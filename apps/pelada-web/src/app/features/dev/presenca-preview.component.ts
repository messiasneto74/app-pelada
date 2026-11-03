import { Component } from '@angular/core';
import type { ActivePelada } from '../../core/pelada/active-pelada.model';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import type { InicioDashboardView } from '../../core/inicio/inicio-dashboard.model';
import { PeladaDashboardService } from '../../core/inicio/pelada-dashboard.service';
import type { PeladaRosterDto } from '../../core/roster/pelada-roster-api.model';
import { mapRosterDto } from '../../core/roster/pelada-roster.mapper';
import { PeladaRosterService } from '../../core/roster/pelada-roster.service';
import { PresenceSessionService } from '../../core/presence/presence-session.service';
import { PresencaPartidaComponent } from '../partida/presenca-partida.component';

const previewPelada: ActivePelada = {
  id: 'dev-presenca-evidence',
  name: 'Pelada Resenha',
  defaultWeekday: 4,
  defaultLocation: 'Society do Zé',
  photoPreviewUrl: null,
};

const previewDash: InicioDashboardView = {
  peladaName: previewPelada.name,
  nextMatch: {
    matchId: 'm-dev-presenca',
    dateLabel: 'qua., 05 nov.',
    timeLabel: '19:30',
    locationLabel: 'Society do Zé',
    modalityLabel: 'Society',
    confirmedCount: 10,
    capacity: 14,
    vacancyPercent: 71,
    confirmedPlayers: [
      { id: 'p1', displayName: 'Ana Silva' },
      { id: 'p2', displayName: 'Bruno Ferreira' },
    ],
    presenceLink: '/partida/presenca',
  },
  rosterPlayerCount: 5,
  cashReceivedLabel: 'R$ 120,00',
  cashExpectedLabel: 'R$ 200,00',
  cashPercent: 60,
};

const rosterDto: PeladaRosterDto = {
  peladaId: previewPelada.id,
  players: [
    {
      id: 'p1',
      displayName: 'Ana Silva',
      isGoalkeeper: false,
      position: 'Meio',
      rating: 8,
      tags: ['passe'],
      isFixedList: false,
    },
    {
      id: 'p2',
      displayName: 'Bruno Ferreira',
      isGoalkeeper: true,
      position: null,
      rating: 7,
      tags: ['reflexo'],
      isFixedList: true,
    },
    {
      id: 'p3',
      displayName: 'Carlos Lima',
      isGoalkeeper: false,
      position: 'Ataque',
      rating: 6,
      tags: [],
      isFixedList: false,
    },
  ],
};

@Component({
  selector: 'app-presenca-preview',
  standalone: true,
  imports: [PresencaPartidaComponent],
  providers: [
    {
      provide: PeladaContextService,
      useValue: {
        getActivePelada: () => previewPelada,
        hasActivePelada: () => true,
      },
    },
    {
      provide: PeladaDashboardService,
      useValue: {
        loadDashboard: (_p: unknown, cb: (v: InicioDashboardView) => void) =>
          cb(previewDash),
      },
    },
    {
      provide: PeladaRosterService,
      useValue: {
        loadRoster: (_p: unknown, cb: (list: ReturnType<typeof mapRosterDto>) => void) =>
          cb(mapRosterDto(rosterDto)),
      },
    },
    {
      provide: PeladaOrganizadorContextService,
      useValue: {
        isOrganizador: (id: string) => id === previewPelada.id,
      },
    },
  ],
  template: `<app-presenca-partida />`,
})
export class PresencaPreviewComponent {
  constructor(session: PresenceSessionService) {
    session.save({
      matchId: 'm-dev-presenca',
      listClosed: false,
      statusByPlayerId: {
        p1: 'confirmed',
        p2: 'confirmed',
        p3: 'pending',
      },
      guests: [
        {
          kind: 'guest',
          guestId: 'g-preview',
          displayName: 'João Convidado',
          status: 'guest_pending',
        },
      ],
      presenceMode: 'ORGANIZER_CLOSES',
    });
  }
}
