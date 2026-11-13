import { Component } from '@angular/core';
import { of } from 'rxjs';
import type { ActivePelada } from '../../core/pelada/active-pelada.model';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import type { PeladaRulesApiDto } from '../../core/pelada/pelada-rules-api.mapper';
import { peladaRulesFromApi } from '../../core/pelada/pelada-rules-api.mapper';
import { PeladaRulesApiService } from '../../core/pelada/pelada-rules-api.service';
import { PeladaMatchCreateService } from '../../core/match/pelada-match-create.service';
import { CriarPartidaComponent } from '../inicio/criar-partida.component';

const previewPelada: ActivePelada = {
  id: 'dev-match-evidence',
  name: 'Pelada Resenha',
  defaultWeekday: 4,
  defaultLocation: 'Society do Zé',
  photoPreviewUrl: null,
};

const rulesDto: PeladaRulesApiDto = {
  peladaId: previewPelada.id,
  playersPerTeam: 6,
  teamCount: 2,
  modality: 'futsal',
  goalkeeperMode: 'ROTATING',
  fixedListOnly: false,
  allowPlayerSelfEdit: false,
  drawWeights: { mode: 'BALANCED' },
  extra: {},
};

@Component({
  selector: 'app-criar-partida-preview',
  standalone: true,
  imports: [CriarPartidaComponent],
  providers: [
    {
      provide: PeladaContextService,
      useValue: {
        getActivePelada: () => previewPelada,
        hasActivePelada: () => true,
      },
    },
    {
      provide: PeladaRulesApiService,
      useValue: {
        fetchRules: () => of(rulesDto),
        mapFromApi: (d: PeladaRulesApiDto) => peladaRulesFromApi(d),
      },
    },
    {
      provide: PeladaMatchCreateService,
      useValue: {
        createMatch: () =>
          of({
            id: 'm-dev',
            peladaId: previewPelada.id,
            scheduledAt: new Date().toISOString(),
            location: 'Society do Zé',
            notes: null,
            presenceMode: 'ORGANIZER_CLOSES',
            status: 'SCHEDULED',
          }),
      },
    },
  ],
  template: `<app-criar-partida />`,
})
export class CriarPartidaPreviewComponent {}
