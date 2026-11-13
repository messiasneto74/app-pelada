import { TestBed } from '@angular/core/testing';
import { PeladaDashboardRefreshService } from './pelada-dashboard-refresh.service';

describe('PeladaDashboardRefreshService §3.1-SYNC', () => {
  it('incrementa refreshToken ao notificar caixa', () => {
    const service = TestBed.inject(PeladaDashboardRefreshService);
    expect(service.refreshToken()).toBe(0);
    service.notifyCashSummaryChanged();
    expect(service.refreshToken()).toBe(1);
    service.notifyCashSummaryChanged();
    expect(service.refreshToken()).toBe(2);
  });
});
