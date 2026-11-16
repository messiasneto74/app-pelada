import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { AuthService } from '../../auth/auth.service';
import { nativeBridge } from '../../auth/native-bridge';
import { EntrarComponent } from './entrar.component';

describe('EntrarComponent (UX-AUTH)', () => {
  let fixture: ComponentFixture<EntrarComponent>;
  let component: EntrarComponent;
  const auth = {
    init: jasmine.createSpy('init').and.resolveTo(undefined),
    isLoggedIn: jasmine.createSpy('isLoggedIn').and.returnValue(false),
    continueAfterLogin: jasmine.createSpy('continueAfterLogin').and.resolveTo(undefined),
    loginWithPassword: jasmine.createSpy('loginWithPassword').and.resolveTo(undefined),
    registerAccount: jasmine.createSpy('registerAccount').and.resolveTo(undefined),
    loginWithGoogle: jasmine.createSpy('loginWithGoogle').and.resolveTo(undefined),
    logout: jasmine.createSpy('logout'),
  };

  beforeEach(async () => {
    auth.init.calls.reset();
    auth.isLoggedIn.calls.reset();
    auth.continueAfterLogin.calls.reset();
    auth.loginWithPassword.calls.reset();
    auth.registerAccount.calls.reset();
    auth.loginWithGoogle.calls.reset();
    auth.loginWithGoogle.and.resolveTo(undefined);
    auth.isLoggedIn.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [EntrarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EntrarComponent);
    component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();
  });

  it('login com senha curta chama Keycloak (sem corte de 8 no cliente)', async () => {
    component.setMode('login');
    component.email = 'dev@pelada.local';
    component.password = 'curta';
    await component.submit();
    expect(auth.loginWithPassword).toHaveBeenCalledWith('dev@pelada.local', 'curta');
  });

  it('Continuar com sessão ativa chama continueAfterLogin', async () => {
    auth.isLoggedIn.and.returnValue(true);
    auth.continueAfterLogin.calls.reset();

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [EntrarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    const fx = TestBed.createComponent(EntrarComponent);
    const cmp = fx.componentInstance;
    await cmp.ngOnInit();
    auth.continueAfterLogin.calls.reset();

    await cmp.continue();
    expect(auth.continueAfterLogin).toHaveBeenCalledTimes(1);
  });

  it('register exige nome e sobrenome e senha >= 8', async () => {
    component.setMode('register');
    component.email = 'nova@pelada.local';
    component.password = 'curta';
    component.name = 'Ana';
    await component.submit();
    expect(auth.registerAccount).not.toHaveBeenCalled();
    expect(component.fieldError()).toMatch(/sobrenome/i);

    component.name = 'Ana Silva';
    await component.submit();
    expect(auth.registerAccount).not.toHaveBeenCalled();
    expect(component.error()).toMatch(/8 caracteres/i);

    component.password = 'senha-valida';
    await component.submit();
    expect(auth.registerAccount).toHaveBeenCalledWith({
      email: 'nova@pelada.local',
      password: 'senha-valida',
      name: 'Ana Silva',
    });
  });

  it('botão "Entrar com Google" chama AuthService.loginWithGoogle', async () => {
    await component.loginWithGoogle();
    expect(auth.loginWithGoogle).toHaveBeenCalledTimes(1);
    expect(component.error()).toBeNull();
  });

  it('erro ao abrir o Google mostra mensagem e libera o botão', async () => {
    auth.loginWithGoogle.and.rejectWith(new Error('boom'));
    await component.loginWithGoogle();
    expect(component.error()).toMatch(/Google/);
    expect(component.googleSubmitting()).toBe(false);
  });
});

describe('EntrarComponent — app nativo cancela o login do Google', () => {
  let fixture: ComponentFixture<EntrarComponent>;
  let component: EntrarComponent;
  let appActiveCallback: ((state: { isActive: boolean }) => void) | undefined;
  const originalIsNativePlatform = Capacitor.isNativePlatform;
  const auth = {
    init: jasmine.createSpy('init').and.resolveTo(undefined),
    isLoggedIn: jasmine.createSpy('isLoggedIn').and.returnValue(false),
    continueAfterLogin: jasmine.createSpy('continueAfterLogin').and.resolveTo(undefined),
    loginWithPassword: jasmine.createSpy('loginWithPassword').and.resolveTo(undefined),
    registerAccount: jasmine.createSpy('registerAccount').and.resolveTo(undefined),
    loginWithGoogle: jasmine.createSpy('loginWithGoogle').and.resolveTo(undefined),
    logout: jasmine.createSpy('logout'),
  };

  beforeEach(async () => {
    appActiveCallback = undefined;
    Capacitor.isNativePlatform = () => true;
    spyOn(nativeBridge, 'onAppActive').and.callFake((cb) => {
      appActiveCallback = cb;
    });
    auth.isLoggedIn.and.returnValue(false);
    auth.loginWithGoogle.and.resolveTo(undefined);

    await TestBed.configureTestingModule({
      imports: [EntrarComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    fixture = TestBed.createComponent(EntrarComponent);
    component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();
  });

  afterEach(() => {
    Capacitor.isNativePlatform = originalIsNativePlatform;
  });

  it('libera o botão quando o navegador do sistema é fechado sem concluir o login', fakeAsync(() => {
    void component.loginWithGoogle();
    expect(component.googleSubmitting()).toBe(true);

    appActiveCallback?.({ isActive: true });
    tick(1500);

    expect(component.googleSubmitting()).toBe(false);
  }));

  it('não libera o botão se o login já concluiu antes do app voltar ao primeiro plano', fakeAsync(() => {
    void component.loginWithGoogle();
    auth.isLoggedIn.and.returnValue(true);

    appActiveCallback?.({ isActive: true });
    tick(1500);

    expect(component.googleSubmitting()).toBe(true);
  }));
});
