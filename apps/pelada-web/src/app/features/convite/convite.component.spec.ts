import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { PeladaApiService } from '../../core/pelada/pelada-api.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PendingInviteService } from '../../core/pelada/pending-invite.service';
import { ConviteComponent } from './convite.component';

describe('ConviteComponent (issue #172)', () => {
  let fixture: ComponentFixture<ConviteComponent>;
  let peladaApi: {
    previewInvite: jasmine.Spy;
    redeemInvite: jasmine.Spy;
  };
  let oauth: { hasValidAccessToken: jasmine.Spy };
  let router: { navigateByUrl: jasmine.Spy };
  let pendingInvite: PendingInviteService;

  function setup(token = 'tok-1'): void {
    TestBed.configureTestingModule({
      imports: [ConviteComponent],
      providers: [
        { provide: PeladaApiService, useValue: peladaApi },
        { provide: OAuthService, useValue: oauth },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ token }) } },
        },
      ],
    });
    pendingInvite = TestBed.inject(PendingInviteService);
    fixture = TestBed.createComponent(ConviteComponent);
  }

  beforeEach(() => {
    peladaApi = {
      previewInvite: jasmine.createSpy('previewInvite'),
      redeemInvite: jasmine.createSpy('redeemInvite'),
    };
    oauth = {
      hasValidAccessToken: jasmine.createSpy('hasValidAccessToken').and.returnValue(false),
      getIdentityClaims: jasmine.createSpy('getIdentityClaims').and.returnValue({ sub: 'user-convite' }),
    } as unknown as { hasValidAccessToken: jasmine.Spy };
    router = { navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true) };
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('convite inválido mostra mensagem de erro', async () => {
    peladaApi.previewInvite.and.rejectWith({ status: 410 });
    setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('não é mais válido');
    expect(peladaApi.redeemInvite).not.toHaveBeenCalled();
  });

  it('convite válido sem login mostra botão; ao clicar guarda o token e vai pra /entrar', async () => {
    peladaApi.previewInvite.and.resolveTo({
      peladaId: 'pel-1',
      peladaName: 'Pelada Teste',
      expiresAt: new Date().toISOString(),
    });
    setup('tok-2');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Pelada Teste');
    const button = fixture.nativeElement.querySelector('button');
    button.click();
    await fixture.whenStable();

    expect(pendingInvite.consume()).toBe('tok-2');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/entrar');
    expect(peladaApi.redeemInvite).not.toHaveBeenCalled();
  });

  it('convite válido já logado resgata automaticamente e vai pra /inicio', async () => {
    oauth.hasValidAccessToken.and.returnValue(true);
    peladaApi.previewInvite.and.resolveTo({
      peladaId: 'pel-1',
      peladaName: 'Pelada Teste',
      expiresAt: new Date().toISOString(),
    });
    peladaApi.redeemInvite.and.resolveTo({
      peladaId: 'pel-1',
      name: 'Pelada Teste',
      photoUrl: null,
      defaultWeekday: null,
      defaultLocation: null,
    });
    setup('tok-3');
    const contextSpy = spyOn(TestBed.inject(PeladaContextService), 'setActivePelada');

    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();

    expect(peladaApi.redeemInvite).toHaveBeenCalledWith('tok-3');
    expect(contextSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: 'pel-1', name: 'Pelada Teste' }),
    );
    expect(router.navigateByUrl).toHaveBeenCalledWith('/inicio', { replaceUrl: true });
  });
});
