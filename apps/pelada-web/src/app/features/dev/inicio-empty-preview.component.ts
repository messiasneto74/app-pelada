import { Component, signal } from '@angular/core';
import type { InicioDashboardView } from '../../core/inicio/inicio-dashboard.model';
import { PeladaDashboardService } from '../../core/inicio/pelada-dashboard.service';
import type { ActivePelada } from '../../core/pelada/active-pelada.model';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { InicioComponent } from '../inicio/inicio.component';

/** Prévia §3.1 estados vazios — screenshot 390px (issue #23), rota `/dev/inicio-empty`. */
const emptyDashboardView: InicioDashboardView = {
  peladaName: 'Pelada Resenha',
  nextMatch: null,
  rosterPlayerCount: 0,
  cashReceivedLabel: 'R$ 0,00',
  cashExpectedLabel: 'R$ 0,00',
  cashPercent: 0,
};

const previewPelada: ActivePelada = {
  id: 'dev-empty-evidence',
  name: 'Pelada Resenha',
  defaultWeekday: null,
  defaultLocation: '',
  photoPreviewUrl: null,
};

/** Mock isolado — não persiste em sessionStorage (não sobrescreve sessão real). */
const previewPeladaContext = {
  activePelada: signal(previewPelada).asReadonly(),
  hasActivePelada: () => true,
  getActivePelada: () => previewPelada,
  setActivePelada: () => {},
  clearActivePelada: () => {},
  refreshFromStorage: () => {},
} as unknown as PeladaContextService;

@Component({
  selector: 'app-inicio-empty-preview',
  standalone: true,
  imports: [InicioComponent],
  providers: [
    { provide: PeladaContextService, useValue: previewPeladaContext },
    {
      provide: PeladaDashboardService,
      useValue: {
        loadDashboard: (
          _pelada: unknown,
          onResult: (view: InicioDashboardView) => void,
        ) => onResult(emptyDashboardView),
      },
    },
  ],
  template: `<app-inicio />`,
})
export class InicioEmptyPreviewComponent {}
