import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { ActivePelada } from '../../core/pelada/active-pelada.model';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaRulesService } from '../../core/pelada/pelada-rules.service';
import type { PeladaPlayerProfileDto } from '../../core/roster/pelada-player-profile-api.model';
import { PeladaPlayerProfileService } from '../../core/roster/pelada-player-profile.service';
import { JogadorPerfilComponent } from '../jogadores/jogador-perfil.component';

const previewPelada: ActivePelada = {
  id: 'dev-profile-evidence',
  name: 'Pelada Resenha',
  defaultWeekday: null,
  defaultLocation: '',
  photoPreviewUrl: null,
};

const previewProfile: PeladaPlayerProfileDto = {
  id: 'dev-player-1',
  displayName: 'Bruno Ferreira',
  isGoalkeeper: true,
  position: null,
  rating: 7,
  tags: ['reflexo', 'chuta bem'],
  isFixedList: true,
  userId: null,
  paymentPlan: 'MONTHLY',
  attributes: {
    tecnica: 6,
    forca: 7,
    chute: 8,
    passe: 5,
    defesa: 9,
    velocidade: 6,
  },
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
  selector: 'app-jogador-perfil-preview',
  standalone: true,
  imports: [JogadorPerfilComponent],
  providers: [
    { provide: PeladaContextService, useValue: previewPeladaContext },
    {
      provide: PeladaPlayerProfileService,
      useValue: {
        loadProfile: (
          _pelada: ActivePelada,
          playerId: string,
          onResult: (p: PeladaPlayerProfileDto | null) => void,
        ) => {
          onResult(playerId === previewProfile.id ? previewProfile : null);
        },
      },
    },
    {
      provide: PeladaRulesService,
      useValue: {
        getDefaultRules: () => ({
          fixedListOnly: true,
          allowPlayerSelfEdit: false,
        }),
      },
    },
    {
      provide: PeladaOrganizadorContextService,
      useValue: {
        isOrganizador: (id: string) => id === previewPelada.id,
        refreshMembership: () => {},
      },
    },
    {
      provide: ActivatedRoute,
      useValue: {
        snapshot: { paramMap: { get: () => previewProfile.id } },
      },
    },
  ],
  template: `<app-jogador-perfil />`,
})
export class JogadorPerfilPreviewComponent {}
