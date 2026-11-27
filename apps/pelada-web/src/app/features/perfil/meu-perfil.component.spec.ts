import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaSwitchService } from '../../core/pelada/pelada-switch.service';
import { MeuPerfilComponent } from './meu-perfil.component';

const ME = { id: 'u1', keycloakSub: 's1', email: 'eu@pelada.local', phone: '11999990000', name: 'Eu Mesmo', photoUrl: null };
const PELADAS = [
  { id: 'p1', name: 'Pelada Um', photoUrl: null, defaultWeekday: null, defaultLocation: null, role: 'JOGADOR' },
  { id: 'p2', name: 'Pelada Dois', photoUrl: null, defaultWeekday: null, defaultLocation: null, role: 'ORGANIZADOR' },
];

describe('MeuPerfilComponent (#224/#225/#226)', () => {
  let fixture: ComponentFixture<MeuPerfilComponent>;
  let auth: jasmine.SpyObj<AuthService>;
  let switcher: jasmine.SpyObj<PeladaSwitchService>;

  beforeEach(async () => {
    active = 'p1';
    auth = jasmine.createSpyObj('AuthService', ['getMe', 'logout']);
    switcher = jasmine.createSpyObj('PeladaSwitchService', ['listMine', 'switchTo']);
    switcher.listMine.and.returnValue(
      Promise.resolve([
        { id: 'p1', name: 'Pelada Um', photoUrl: null, defaultWeekday: null, defaultLocation: null, role: 'JOGADOR' },
        { id: 'p2', name: 'Pelada Dois', photoUrl: null, defaultWeekday: null, defaultLocation: null, role: 'ORGANIZADOR' },
      ]),
    );
    switcher.switchTo.and.returnValue(Promise.resolve());
    auth.getMe.and.returnValue(
      Promise.resolve({ id: 'u1', keycloakSub: 's1', email: 'eu@pelada.local', phone: '11999990000' }),
    );
    await TestBed.configureTestingModule({
      imports: [MeuPerfilComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: PeladaSwitchService, useValue: switcher },
        {
          provide: PeladaContextService,
          useValue: { getActivePelada: () => ({ id: 'p1', name: 'Pelada Um' }) },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MeuPerfilComponent);
    await settle();
  });

  it('mostra e-mail, nome e telefone da conta', () => {
    expect(text()).toContain('Meu perfil');
    expect(text()).toContain('eu@pelada.local');
    expect(fixture.componentInstance.name).toBe('Eu Mesmo');
    expect(fixture.componentInstance.phone).toBe('11999990000');
  });

  it('"Sair da conta" faz logout (#224)', () => {
    btn('Sair da conta')[0].click();
    expect(auth.logout).toHaveBeenCalled();
  });

  it('lista as peladas com o papel, marca a atual e abre outra (#225)', () => {
    expect(text()).toContain('Pelada Um');
    expect(text()).toContain('Pelada Dois');
    expect(text()).toContain('Organizador');
    expect(text()).toContain('Atual');
    btn('Abrir')[0].click();
    expect(switcher.switchTo).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'p2' }));
  });

  it('salva nome e telefone (#226)', async () => {
    fixture.componentInstance.name = 'Nome Novo';
    fixture.componentInstance.phone = '(62) 98888-7777';
    await fixture.componentInstance.saveData();
    fixture.detectChanges();
    expect(api.updateProfile).toHaveBeenCalledWith({ name: 'Nome Novo', phone: '(62) 98888-7777' });
    expect(text()).toContain('Dados salvos.');
  });

  it('não salva nome curto nem telefone inválido (#226)', async () => {
    fixture.componentInstance.name = 'Al';
    await fixture.componentInstance.saveData();
    fixture.detectChanges();
    expect(text()).toContain('Informe nome e sobrenome.');
    fixture.componentInstance.name = 'Nome Ok';
    fixture.componentInstance.phone = '123';
    await fixture.componentInstance.saveData();
    fixture.detectChanges();
    expect(text()).toContain('Telefone inválido');
    expect(api.updateProfile).not.toHaveBeenCalled();
  });

  it('troca de senha: confere repetição e mostra o erro da API (#226)', async () => {
    const c = fixture.componentInstance;
    c.currentPassword = 'atual';
    c.newPassword = 'NovaSenha1';
    c.repeatPassword = 'Outra1234';
    await c.savePassword();
    fixture.detectChanges();
    expect(text()).toContain('As duas senhas novas não são iguais.');
    expect(api.changePassword).not.toHaveBeenCalled();

    api.changePassword.and.returnValue(
      Promise.reject(new HttpErrorResponse({ status: 400, error: { message: 'Senha atual incorreta.' } })),
    );
    c.repeatPassword = 'NovaSenha1';
    await c.savePassword();
    fixture.detectChanges();
    expect(text()).toContain('Senha atual incorreta.');

    api.changePassword.and.returnValue(Promise.resolve());
    await c.savePassword();
    fixture.detectChanges();
    expect(text()).toContain('Senha alterada.');
    expect(c.newPassword).toBe('');
  });

  it('foto: recusa tipo errado e envia PNG (#226)', async () => {
    const c = fixture.componentInstance;
    const ev = (file: File) => ({ target: { files: [file], value: 'x' } }) as unknown as Event;
    await c.onPhoto(ev(new File(['gif'], 'x.gif', { type: 'image/gif' })));
    fixture.detectChanges();
    expect(text()).toContain('JPG, PNG ou WebP');
    api.uploadPhoto.and.returnValue(Promise.resolve({ ...ME, photoUrl: 'http://api/uploads/user-1.png' }));
    await c.onPhoto(ev(new File(['png'], 'eu.png', { type: 'image/png' })));
    await settle();
    expect(api.uploadPhoto).toHaveBeenCalled();
    expect(text()).toContain('Foto atualizada.');
    expect(c.photoSrc()).toBe('blob:foto');
  });

  it('sair de uma pelada que não é a atual: confirma e some da lista (#226/#223)', async () => {
    btn('Sair')[1].click();
    fixture.detectChanges();
    expect(text()).toContain('Sair da Pelada Dois?');
    await fixture.componentInstance.leave(PELADAS[1]);
    await settle();
    expect(api.leavePelada).toHaveBeenCalledWith('p2');
    const names = Array.from(fixture.nativeElement.querySelectorAll('.pelada-item__name')).map(
      (e) => (e as HTMLElement).textContent,
    );
    expect(names).toEqual(['Pelada Um']);
    expect(text()).toContain('Você saiu da Pelada Dois.');
  });

  it('sair da pelada atual troca pra outra; sem nenhuma, vai pro onboarding', async () => {
    await fixture.componentInstance.leave(PELADAS[0]);
    expect(switcher.switchTo).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'p2' }));

    const router = TestBed.inject(Router);
    const nav = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    active = 'p2';
    await fixture.componentInstance.leave(PELADAS[1]);
    expect(clearActive).toHaveBeenCalled();
    expect(nav).toHaveBeenCalledWith(['/onboarding/pelada']);
  });

  it('lista as peladas com o papel, marca a atual e abre outra (issue #225)', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Minhas peladas');
    expect(text).toContain('Pelada Um');
    expect(text).toContain('Pelada Dois');
    expect(text).toContain('Organizador');
    expect(text).toContain('Atual');
    const abrir = (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).filter(
      (b) => b.textContent?.trim() === 'Abrir',
    );
    expect(abrir.length).toBe(1);
    abrir[0].click();
    expect(switcher.switchTo).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'p2' }));
  });
});
