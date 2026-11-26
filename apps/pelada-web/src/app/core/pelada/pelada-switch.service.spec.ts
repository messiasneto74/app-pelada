import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { PresenceSessionService } from '../presence/presence-session.service';
import { PeladaContextService } from './pelada-context.service';
import { PeladaOrganizadorContextService } from './pelada-organizador-context.service';
import { PeladaSwitchService, peladaRoleLabel } from './pelada-switch.service';

describe('PeladaSwitchService (issue #225)', () => {
  it('troca a pelada ativa, limpa a partida aberta e volta pro Início', async () => {
    const refresh = jasmine.createSpy('refreshMembership');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: OAuthService, useValue: { getIdentityClaims: () => ({ sub: 'u1' }) } },
        { provide: PeladaOrganizadorContextService, useValue: { refreshMembership: refresh } },
      ],
    });
    const ctx = TestBed.inject(PeladaContextService);
    const presence = TestBed.inject(PresenceSessionService);
    const router = TestBed.inject(Router);
    const nav = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    const clearMatch = spyOn(presence, 'setActiveMatchId').and.callThrough();
    ctx.setActivePelada({ id: 'a', name: 'A', defaultWeekday: null, defaultLocation: '', photoPreviewUrl: null });

    await TestBed.inject(PeladaSwitchService).switchTo({
      id: 'b',
      name: 'Pelada B',
      photoUrl: null,
      defaultWeekday: 2,
      defaultLocation: 'Quadra B',
      role: 'JOGADOR',
    });

    expect(ctx.getActivePelada()?.id).toBe('b');
    expect(ctx.getActivePelada()?.name).toBe('Pelada B');
    expect(clearMatch).toHaveBeenCalledWith(null);
    expect(refresh).toHaveBeenCalledWith('b');
    expect(nav).toHaveBeenCalledWith(['/inicio']);
    ctx.clearActivePelada();
  });

  it('peladaRoleLabel', () => {
    expect(peladaRoleLabel('ORGANIZADOR')).toBe('Organizador');
    expect(peladaRoleLabel('JOGADOR')).toBe('Jogador');
  });
});
