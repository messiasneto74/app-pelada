import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { of, Subject } from 'rxjs';
import type { PeladaRulesApiDto } from '../../core/pelada/pelada-rules-api.mapper';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaRulesApiService } from '../../core/pelada/pelada-rules-api.service';
import { PeladaRulesService } from '../../core/pelada/pelada-rules.service';
import { DEFAULT_PELADA_RULES } from '../../core/pelada/pelada-rules.model';
import { RegrasPeladaComponent } from './regras-pelada.component';

describe('RegrasPeladaComponent', () => {
  let fixture: ComponentFixture<RegrasPeladaComponent>;
  let rulesService: PeladaRulesService;
  let router: Router;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RegrasPeladaComponent],
      providers: [
        provideRouter([
          { path: 'inicio', component: RegrasPeladaComponent },
          { path: 'inicio/regras', component: RegrasPeladaComponent },
          { path: 'onboarding/pelada', component: RegrasPeladaComponent },
        ]),
        {
          provide: OAuthService,
          useValue: { getIdentityClaims: () => ({ sub: 'user-regras' }) },
        },
        {
          provide: PeladaRulesApiService,
          useValue: {
            fetchRules: () =>
              of({
                peladaId: 'p1',
                playersPerTeam: DEFAULT_PELADA_RULES.playersPerTeam,
                teamCount: DEFAULT_PELADA_RULES.teamCount,
                modality: DEFAULT_PELADA_RULES.modality,
                goalkeeperMode: 'ROTATING',
                fixedListOnly: false,
                allowPlayerSelfEdit: false,
                drawWeights: {},
                extra: {},
              }),
            saveRules: () =>
              of({
                peladaId: 'p1',
                playersPerTeam: 6,
                teamCount: 2,
                modality: 'campo',
                goalkeeperMode: 'ROTATING',
                fixedListOnly: false,
                allowPlayerSelfEdit: false,
                drawWeights: {},
                extra: {},
              }),
            mapFromApi: () => ({ ...DEFAULT_PELADA_RULES }),
          },
        },
      ],
    }).compileComponents();

    const peladaContext = TestBed.inject(PeladaContextService);
    peladaContext.setActivePelada({
      id: 'p1',
      name: 'Pelada Teste',
      defaultWeekday: null,
      defaultLocation: '',
      photoPreviewUrl: null,
    });

    rulesService = TestBed.inject(PeladaRulesService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(RegrasPeladaComponent);
    fixture.detectChanges();
  });

  it('renderiza seções da tela 3.2', () => {
    expect(fixture.nativeElement.textContent).toContain('Regras da pelada');
    expect(fixture.nativeElement.textContent).toContain('Formato');
    expect(fixture.nativeElement.textContent).toContain('Salvar como padrão');
    expect(fixture.nativeElement.textContent).toContain('Pontuação do sorteio');
    expect(fixture.nativeElement.textContent).toContain('Atributos');
    expect(fixture.nativeElement.textContent).toContain(
      'Jogador edita o próprio perfil',
    );
  });

  it('bloqueia combinação inválida de goleiro ao salvar', () => {
    const component = fixture.componentInstance;
    component.values.update((v) => ({
      ...v,
      goalkeeperPerTeam: true,
      fixedGoalkeeper: true,
    }));
    component.saveDefault();
    expect(component.formError()).toContain('não podem ficar ligados');
    expect(rulesService.hasSavedRules('p1')).toBe(false);
  });

  it('persiste regras válidas ao salvar', () => {
    fixture.componentInstance.saveDefault();
    expect(rulesService.hasSavedRules('p1')).toBe(true);
    expect(fixture.componentInstance.savedMessage()).toContain('salvas');
    expect(router.navigate).toHaveBeenCalledWith(['/inicio']);
  });

  it('persiste allowPlayerSelfEdit ao salvar', () => {
    fixture.componentInstance.allowPlayerSelfEdit.set(true);
    fixture.componentInstance.saveDefault();
    expect(rulesService.getDefaultRules('p1').allowPlayerSelfEdit).toBe(true);
  });

  it('esconde o formulário até o GET das regras responder (edição não é sobrescrita)', () => {
    const pending = new Subject<PeladaRulesApiDto>();
    const api = TestBed.inject(PeladaRulesApiService) as unknown as {
      fetchRules: () => unknown;
    };
    api.fetchRules = () => pending.asObservable();
    const slow = TestBed.createComponent(RegrasPeladaComponent);
    slow.detectChanges();

    const el = slow.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Carregando regras');
    expect(el.querySelector('#players-per-team')).toBeNull();
    expect(el.textContent).not.toContain('Salvar como padrão');

    pending.next({
      peladaId: 'p1',
      playersPerTeam: 6,
      teamCount: 2,
      modality: 'campo',
      goalkeeperMode: 'ROTATING',
      fixedListOnly: false,
      allowPlayerSelfEdit: false,
      drawWeights: {},
      extra: {},
    } as PeladaRulesApiDto);
    slow.detectChanges();
    expect(el.querySelector('#players-per-team')).not.toBeNull();
    expect(el.textContent).toContain('Salvar como padrão');
  });
});
