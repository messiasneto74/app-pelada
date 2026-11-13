import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
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
    logout: jasmine.createSpy('logout'),
  };

  beforeEach(async () => {
    auth.init.calls.reset();
    auth.isLoggedIn.calls.reset();
    auth.continueAfterLogin.calls.reset();
    auth.loginWithPassword.calls.reset();
    auth.registerAccount.calls.reset();
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
});
