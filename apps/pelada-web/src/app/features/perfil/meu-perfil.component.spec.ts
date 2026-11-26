import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../auth/auth.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaSwitchService } from '../../core/pelada/pelada-switch.service';
import { MeuPerfilComponent } from './meu-perfil.component';

describe('MeuPerfilComponent (issue #224)', () => {
  let fixture: ComponentFixture<MeuPerfilComponent>;
  let auth: jasmine.SpyObj<AuthService>;
  let switcher: jasmine.SpyObj<PeladaSwitchService>;

  beforeEach(async () => {
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
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('mostra e-mail e telefone da conta', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Meu perfil');
    expect(text).toContain('eu@pelada.local');
    expect(text).toContain('11999990000');
  });

  it('"Sair da conta" faz logout', () => {
    const btn = (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find(
      (b) => b.textContent?.trim() === 'Sair da conta',
    );
    btn!.click();
    expect(auth.logout).toHaveBeenCalled();
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
