import { Component } from '@angular/core';
import type { ActivePelada } from '../../core/pelada/active-pelada.model';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import type { PeladaRosterDto } from '../../core/roster/pelada-roster-api.model';
import { mapRosterDto } from '../../core/roster/pelada-roster.mapper';
import { PeladaRosterService } from '../../core/roster/pelada-roster.service';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import { JogadoresListaComponent } from '../jogadores/jogadores-lista.component';

const previewPelada: ActivePelada = {
  id: 'dev-roster-evidence',
  name: 'Pelada Resenha',
  defaultWeekday: null,
  defaultLocation: '',
  photoPreviewUrl: null,
};

const previewDto: PeladaRosterDto = {
  peladaId: previewPelada.id,
  players: [
    {
      id: 'p1',
      displayName: 'Ana Silva',
      isGoalkeeper: false,
      position: 'Meio',
      rating: 8,
      tags: ['passe', 'velocidade'],
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
      tags: ['finalização'],
      isFixedList: false,
    },
  ],
};

const previewPeladaContext = {
  activePelada: (() => previewPelada) as PeladaContextService['activePelada'],
  hasActivePelada: () => true,
  getActivePelada: () => previewPelada,
  setActivePelada: () => {},
  clearActivePelada: () => {},
  refreshFromStorage: () => {},
} as unknown as PeladaContextService;

@Component({
  selector: 'app-jogadores-list-preview',
  standalone: true,
  imports: [JogadoresListaComponent],
  providers: [
    { provide: PeladaContextService, useValue: previewPeladaContext },
    {
      provide: PeladaRosterService,
      useValue: {
        loadRoster: (
          _pelada: ActivePelada,
          onResult: (players: RosterPlayer[]) => void,
        ) => onResult(mapRosterDto(previewDto)),
      },
    },
  ],
  template: `<app-jogadores-lista />`,
})
export class JogadoresListPreviewComponent {}
