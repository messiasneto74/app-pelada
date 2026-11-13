import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import type { ActivePelada } from '../../core/pelada/active-pelada.model';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaRulesApiService } from '../../core/pelada/pelada-rules-api.service';
import { peladaRulesFromApi } from '../../core/pelada/pelada-rules-api.mapper';
import type { PeladaRulesApiDto } from '../../core/pelada/pelada-rules-api.mapper';
import type { PeladaPlayerProfileDto } from '../../core/roster/pelada-player-profile-api.model';
import { PeladaPlayerProfileService } from '../../core/roster/pelada-player-profile.service';
import { JogadorPerfilComponent } from '../jogadores/jogador-perfil.component';
import { of } from 'rxjs';

const previewPelada: ActivePelada = {
  id: 'dev-profile-edit-evidence',
  name: 'Pelada Resenha',
  defaultWeekday: null,
  defaultLocation: '',
  photoPreviewUrl: null,
};

const previewProfile: PeladaPlayerProfileDto = {
  id: 'dev-player-edit-1',
  displayName: 'Bruno Ferreira',
  isGoalkeeper: true,
  position: null,
  rating: 7,
  tags: ['reflexo', 'chuta bem'],
  isFixedList: true,
  userId: null,
  photoUrl: null,
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

/** Prévia modo edição §3.8-EDIT — screenshot 390px (issue #27), rota `/dev/jogador-perfil-edit`. */
@Component({
  selector: 'app-jogador-perfil-edit-preview',
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
        updateProfile: () => of(previewProfile),
      },
    },
    {
      provide: PeladaRulesApiService,
      useValue: {
        fetchRules: () =>
          of({
            peladaId: previewPelada.id,
            playersPerTeam: 6,
            teamCount: 2,
            modality: 'futsal',
            goalkeeperMode: 'ROTATING',
            fixedListOnly: true,
            allowPlayerSelfEdit: false,
            drawWeights: {},
            extra: {},
          } satisfies PeladaRulesApiDto),
        mapFromApi: (d: PeladaRulesApiDto) => peladaRulesFromApi(d),
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
      provide: AuthService,
      useValue: {
        getMe: () =>
          Promise.resolve({
            id: 'dev-org',
            keycloakSub: 'dev',
            email: null,
            phone: null,
          }),
      },
    },
    {
      provide: ActivatedRoute,
      useValue: {
        snapshot: { paramMap: { get: () => previewProfile.id } },
      },
    },
  ],
  template: `<app-jogador-perfil #perfil />`,
})
export class JogadorPerfilEditPreviewComponent implements AfterViewInit {
  @ViewChild('perfil') perfil!: JogadorPerfilComponent;

  ngAfterViewInit(): void {
    queueMicrotask(() => this.perfil.startEdit());
  }
}
