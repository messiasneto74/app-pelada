import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../auth/auth.service';
import { MeuPerfilComponent } from './meu-perfil.component';

describe('MeuPerfilComponent (issue #224)', () => {
  let fixture: ComponentFixture<MeuPerfilComponent>;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj('AuthService', ['getMe', 'logout']);
    auth.getMe.and.returnValue(
      Promise.resolve({ id: 'u1', keycloakSub: 's1', email: 'eu@pelada.local', phone: '11999990000' }),
    );
    await TestBed.configureTestingModule({
      imports: [MeuPerfilComponent],
      providers: [{ provide: AuthService, useValue: auth }],
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
});
