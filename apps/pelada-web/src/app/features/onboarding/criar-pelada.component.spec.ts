import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { CriarPeladaComponent } from './criar-pelada.component';

describe('CriarPeladaComponent', () => {
  let fixture: ComponentFixture<CriarPeladaComponent>;
  let component: CriarPeladaComponent;
  let peladaContext: PeladaContextService;
  let router: Router;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CriarPeladaComponent],
      providers: [
        provideRouter([{ path: 'inicio/regras', component: CriarPeladaComponent }]),
        {
          provide: OAuthService,
          useValue: { getIdentityClaims: () => ({ sub: 'user-test' }) },
        },
      ],
    }).compileComponents();

    peladaContext = TestBed.inject(PeladaContextService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(CriarPeladaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    peladaContext.clearActivePelada();
  });

  it('renderiza formulário de onboarding', () => {
    expect(fixture.nativeElement.querySelector('#pelada-nome')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Criar pelada');
  });

  it('valida nome curto no submit', () => {
    component.name.set('A');
    component.onSubmit(new Event('submit'));
    expect(component.nameError()).toContain('2 caracteres');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('salva pelada e navega para regras quando válido', () => {
    component.name.set('Pelada da Praça');
    component.location.set('Campo Central');
    component.weekdayValue.set('3');
    component.onSubmit(new Event('submit'));

    expect(peladaContext.hasActivePelada()).toBe(true);
    expect(peladaContext.getActivePelada()?.name).toBe('Pelada da Praça');
    expect(peladaContext.getActivePelada()?.defaultWeekday).toBe(3);
    expect(router.navigate).toHaveBeenCalledWith(['/inicio/regras']);
  });

  it('mantém preview no contexto após destroy do componente', () => {
    const file = new File([new Uint8Array(8)], 'f.jpg', { type: 'image/jpeg' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    component.onPhotoSelected({ target: input } as unknown as Event);
    component.name.set('Pelada OK');
    component.onSubmit(new Event('submit'));
    const preview = peladaContext.getActivePelada()?.photoPreviewUrl;
    fixture.destroy();
    expect(peladaContext.getActivePelada()?.photoPreviewUrl).toBe(preview);
  });

  it('rejeita foto com tipo inválido', () => {
    const file = new File([new Uint8Array(8)], 'x.gif', { type: 'image/gif' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    component.onPhotoSelected({ target: input } as unknown as Event);
    expect(component.photoError()).toContain('JPG');
    expect(component.photoPreview()).toBeNull();
  });

  it('aceita foto válida e limpa erro de nome ao digitar', () => {
    const file = new File([new Uint8Array(8)], 'f.jpg', { type: 'image/jpeg' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    component.onPhotoSelected({ target: input } as unknown as Event);
    expect(component.photoError()).toBeNull();
    expect(component.photoPreview()).toContain('blob:');

    component.name.set('x');
    component.onNameInput({ target: { value: 'Pelada OK' } } as unknown as Event);
    expect(component.nameError()).toBeNull();
    expect(component.name()).toBe('Pelada OK');
  });

  it('revoga object URL no destroy', () => {
    const revoke = spyOn(URL, 'revokeObjectURL');
    const file = new File([new Uint8Array(8)], 'f.png', { type: 'image/png' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    component.onPhotoSelected({ target: input } as unknown as Event);
    fixture.destroy();
    expect(revoke).toHaveBeenCalled();
  });
});
