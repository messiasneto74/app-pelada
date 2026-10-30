import { Component, inject } from '@angular/core';
import type { InicioDashboardView } from '../../core/inicio/inicio-dashboard.model';
import { PeladaDashboardService } from '../../core/inicio/pelada-dashboard.service';
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

@Component({
  selector: 'app-inicio-empty-preview',
  standalone: true,
  imports: [InicioComponent],
  providers: [
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
export class InicioEmptyPreviewComponent {
  private readonly peladaContext = inject(PeladaContextService);

  constructor() {
    this.peladaContext.setActivePelada({
      id: 'dev-empty-evidence',
      name: 'Pelada Resenha',
      defaultWeekday: null,
      defaultLocation: '',
      photoPreviewUrl: null,
    });
  }
}
