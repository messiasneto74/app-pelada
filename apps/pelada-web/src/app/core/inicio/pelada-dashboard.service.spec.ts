import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import type { ActivePelada } from '../pelada/active-pelada.model';
import { PeladaDashboardService } from './pelada-dashboard.service';
import type { InicioDashboardView } from './inicio-dashboard.model';

const pelada: ActivePelada = {
  id: 'p1',
  name: 'Pelada da Praça',
  defaultWeekday: 3,
  defaultLocation: 'Campo X',
  photoPreviewUrl: null,
};

describe('PeladaDashboardService', () => {
  let service: PeladaDashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(PeladaDashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('mapeia GET /dashboard para view', () => {
    let view: InicioDashboardView | undefined;
    service.loadDashboard(pelada, (v) => {
      view = v;
    });

    const req = http.expectOne(`${environment.apiUrl}/peladas/p1/dashboard`);
    expect(req.request.method).toBe('GET');
    req.flush({
      peladaId: 'p1',
      nextMatch: {
        id: 'm1',
        scheduledAt: '2026-11-05T19:30:00.000Z',
        location: 'Society ABC',
        modality: 'society',
        confirmedCount: 10,
        capacity: 12,
        confirmedPlayers: [{ id: 'pl1', displayName: 'João' }],
      },
      rosterPlayerCount: 5,
      cashMonth: { receivedCents: 5000, expectedCents: 10000 },
    });

    expect(view?.peladaName).toBe('Pelada da Praça');
    expect(view?.nextMatch?.confirmedCount).toBe(10);
    expect(view?.cashPercent).toBe(50);
  });

  it('usa fallback vazio quando a API falha', () => {
    let view: InicioDashboardView | undefined;
    service.loadDashboard(pelada, (v) => {
      view = v;
    });

    const req = http.expectOne(`${environment.apiUrl}/peladas/p1/dashboard`);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(view?.nextMatch).toBeNull();
    expect(view?.rosterPlayerCount).toBe(0);
    expect(view?.cashPercent).toBe(0);
  });
});
