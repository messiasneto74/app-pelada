import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { of, Subject, throwError } from 'rxjs';
import type { MatchDaySummaryDto } from '../../core/match/match-field-session-api.model';
import { MatchFieldSessionService } from '../../core/match/match-field-session.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import { PeladaDashboardService } from '../../core/inicio/pelada-dashboard.service';
import type { InicioDashboardView } from '../../core/inicio/inicio-dashboard.model';
import { DEFAULT_PELADA_RULES } from '../../core/pelada/pelada-rules.model';
import { PeladaRulesApiService } from '../../core/pelada/pelada-rules-api.service';
import type { PeladaRulesApiDto } from '../../core/pelada/pelada-rules-api.mapper';
import { ResumoPartidaComponent } from './resumo-partida.component';

const summary: MatchDaySummaryDto = {
  matchId: 'm1',
  rounds: 2,
  teams: [
    {
      drawTeamId: 't0',
      name: 'Time A',
      played: 2,
      wins: 1,
      losses: 0,
      draws: 1,
      goalsFor: 3,
      goalsAgainst: 1,
    },
  ],
  topScorer: { playerId: 'p1', displayName: 'Fulano', goals: 2 },
  biggestWin: {
    winnerDrawTeamId: 't0',
    winnerName: 'Time A',
    loserDrawTeamId: 't1',
    loserName: 'Time B',
    scoreWinner: 3,
    scoreLoser: 1,
    margin: 2,
  },
  mostLosses: { drawTeamId: 't1', name: 'Time B', losses: 1 },
  text: 'Resumo do dia: Fulano foi o artilheiro!',
};

function makeRulesApiSpy(
  summaryTemplate = 'Modelo salvo',
): jasmine.SpyObj<PeladaRulesApiService> {
  const spy = jasmine.createSpyObj('PeladaRulesApiService', [
    'fetchRules',
    'saveRules',
    'mapFromApi',
  ]);
  spy.fetchRules.and.returnValue(of({} as PeladaRulesApiDto));
  spy.saveRules.and.returnValue(of({} as PeladaRulesApiDto));
  spy.mapFromApi.and.returnValue({ ...DEFAULT_PELADA_RULES, summaryTemplate });
  return spy;
}

function setup(
  fieldSpy: jasmine.SpyObj<MatchFieldSessionService>,
  matchId: string | null,
  rulesApiSpy?: jasmine.SpyObj<PeladaRulesApiService>,
  opts: { isOrganizador?: boolean; recentMatchId?: string | null } = {},
): ComponentFixture<ResumoPartidaComponent> {
  const recentMatchId = opts.recentMatchId ?? null;
  TestBed.configureTestingModule({
    imports: [ResumoPartidaComponent],
    providers: [
      { provide: MatchFieldSessionService, useValue: fieldSpy },
      { provide: PeladaRulesApiService, useValue: rulesApiSpy ?? makeRulesApiSpy() },
      {
        provide: OAuthService,
        useValue: { getIdentityClaims: () => ({ sub: 'user-resumo' }) },
      },
      {
        provide: PeladaOrganizadorContextService,
        useValue: {
          isOrganizador: () => opts.isOrganizador ?? true,
          refreshMembership: () => undefined,
        },
      },
      {
        provide: PeladaDashboardService,
        useValue: {
          loadDashboard: (_p: unknown, cb: (v: InicioDashboardView) => void) =>
            cb({
              recentSummary: recentMatchId
                ? { matchId: recentMatchId, dateLabel: 'qua., 26 de nov.', link: '/partida/resumo' }
                : null,
            } as InicioDashboardView),
        },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap(matchId ? { matchId } : {}),
          },
        },
      },
    ],
  });
  TestBed.inject(PeladaContextService).setActivePelada({
    id: 'pel-1',
    name: 'Pelada Teste',
    defaultWeekday: null,
    defaultLocation: '',
    photoPreviewUrl: null,
  });
  const fixture = TestBed.createComponent(ResumoPartidaComponent);
  fixture.detectChanges();
  return fixture;
}

describe('ResumoPartidaComponent', () => {
  it('mostra o resumo do dia (times, artilheiro, goleada e texto)', () => {
    const fieldSpy = jasmine.createSpyObj('MatchFieldSessionService', ['getDaySummary']);
    fieldSpy.getDaySummary.and.returnValue(of(summary));

    const fixture = setup(fieldSpy, 'm1');
    const text = fixture.nativeElement.textContent as string;

    expect(fieldSpy.getDaySummary).toHaveBeenCalledWith('pel-1', 'm1');
    expect(text).toContain('Resumo do dia: Fulano foi o artilheiro!');
    expect(text).toContain('Time A');
    expect(text).toContain('Fulano');
    expect(text).toContain('2 gol(s)');
  });

  it('pelo menu (sem matchId): abre o resumo da partida encerrada nas últimas 48h (issue #215)', () => {
    const fieldSpy = jasmine.createSpyObj('MatchFieldSessionService', ['getDaySummary']);
    fieldSpy.getDaySummary.and.returnValue(of(summary));
    const fixture = setup(fieldSpy, null, undefined, { recentMatchId: 'm-recente' });
    expect(fieldSpy.getDaySummary).toHaveBeenCalledWith('pel-1', 'm-recente');
    expect(fixture.nativeElement.textContent).toContain('Resumo do dia: Fulano foi o artilheiro!');
  });

  it('pelo menu sem partida nas últimas 48h: avisa que não há resumo (issue #215)', () => {
    const fieldSpy = jasmine.createSpyObj('MatchFieldSessionService', ['getDaySummary']);
    const fixture = setup(fieldSpy, null);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Nenhum resumo disponível');
    expect(text).toContain('48 horas');
    expect(text).not.toContain('Partida não encontrada');
    expect(fieldSpy.getDaySummary).not.toHaveBeenCalled();
  });

  it('jogador comum vê o resumo mas não o botão "Editar texto do resumo" (issue #215)', () => {
    const fieldSpy = jasmine.createSpyObj('MatchFieldSessionService', ['getDaySummary']);
    fieldSpy.getDaySummary.and.returnValue(of(summary));
    const fixture = setup(fieldSpy, 'm1', undefined, { isOrganizador: false });
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Resumo do dia: Fulano foi o artilheiro!');
    expect(text).not.toContain('Editar texto do resumo');
  });

  it('mostra a aba Resumo no menu da partida (issue #215)', () => {
    const fieldSpy = jasmine.createSpyObj('MatchFieldSessionService', ['getDaySummary']);
    fieldSpy.getDaySummary.and.returnValue(of(summary));
    const fixture = setup(fieldSpy, 'm1');
    const tabs = Array.from(
      fixture.nativeElement.querySelectorAll('nav.partida-tabs a'),
    ).map((a) => (a as HTMLElement).textContent?.trim());
    expect(tabs).toEqual(['Presença', 'Sorteio', 'Em campo', 'Resumo']);
  });

  it('erro da API mostra mensagem amigável', () => {
    const fieldSpy = jasmine.createSpyObj('MatchFieldSessionService', ['getDaySummary']);
    fieldSpy.getDaySummary.and.returnValue(throwError(() => new Error('boom')));
    const fixture = setup(fieldSpy, 'm1');
    expect(fixture.nativeElement.textContent).toContain(
      'Não foi possível carregar o resumo do dia.',
    );
  });

  it('mostra o botão "Editar texto do resumo" (issue #171)', () => {
    const fieldSpy = jasmine.createSpyObj('MatchFieldSessionService', ['getDaySummary']);
    fieldSpy.getDaySummary.and.returnValue(of(summary));
    const fixture = setup(fieldSpy, 'm1');
    expect(fixture.nativeElement.textContent).toContain('Editar texto do resumo');
  });

  it('ao clicar em editar, abre o textarea com o modelo já salvo', () => {
    const fieldSpy = jasmine.createSpyObj('MatchFieldSessionService', ['getDaySummary']);
    fieldSpy.getDaySummary.and.returnValue(of(summary));
    const rulesApiSpy = makeRulesApiSpy('Modelo atual do grupo');
    const fixture = setup(fieldSpy, 'm1', rulesApiSpy);

    fixture.componentInstance.startEditingTemplate();
    fixture.detectChanges();

    expect(fixture.componentInstance.templateDraft()).toBe('Modelo atual do grupo');
    const textarea = fixture.nativeElement.querySelector('#summary-template');
    expect(textarea).toBeTruthy();
  });

  it('salva o modelo do resumo sem alterar as demais regras', () => {
    const fieldSpy = jasmine.createSpyObj('MatchFieldSessionService', ['getDaySummary']);
    fieldSpy.getDaySummary.and.returnValue(of(summary));
    const rulesApiSpy = makeRulesApiSpy('Modelo antigo');
    const fixture = setup(fieldSpy, 'm1', rulesApiSpy);

    fixture.componentInstance.startEditingTemplate();
    fixture.componentInstance.templateDraft.set('Modelo novo');
    fixture.componentInstance.saveTemplate();

    expect(rulesApiSpy.saveRules).toHaveBeenCalledWith(
      'pel-1',
      jasmine.objectContaining({
        ...DEFAULT_PELADA_RULES,
        summaryTemplate: 'Modelo novo',
      }),
    );
    expect(fixture.componentInstance.templateSavedMessage()).toContain('salvo');
    expect(fixture.componentInstance.editingTemplate()).toBe(false);
  });

  it('erro ao salvar o modelo mostra mensagem amigável e mantém edição aberta', () => {
    const fieldSpy = jasmine.createSpyObj('MatchFieldSessionService', ['getDaySummary']);
    fieldSpy.getDaySummary.and.returnValue(of(summary));
    const rulesApiSpy = makeRulesApiSpy();
    rulesApiSpy.saveRules.and.returnValue(
      throwError(() => ({ status: 403 }) as never),
    );
    const fixture = setup(fieldSpy, 'm1', rulesApiSpy);

    fixture.componentInstance.startEditingTemplate();
    fixture.componentInstance.saveTemplate();

    expect(fixture.componentInstance.templateError()).toContain('organizador');
    expect(fixture.componentInstance.editingTemplate()).toBe(true);
  });

  it('não permite editar/salvar antes do fetchRules terminar (issue #171 / B1)', () => {
    const fieldSpy = jasmine.createSpyObj('MatchFieldSessionService', ['getDaySummary']);
    fieldSpy.getDaySummary.and.returnValue(of(summary));

    const rulesApiSpy = jasmine.createSpyObj('PeladaRulesApiService', [
      'fetchRules',
      'saveRules',
      'mapFromApi',
    ]);
    const pending$ = new Subject<PeladaRulesApiDto>();
    rulesApiSpy.fetchRules.and.returnValue(pending$.asObservable());
    rulesApiSpy.saveRules.and.returnValue(of({} as PeladaRulesApiDto));
    rulesApiSpy.mapFromApi.and.returnValue({ ...DEFAULT_PELADA_RULES });

    const fixture = setup(fieldSpy, 'm1', rulesApiSpy);

    expect(fixture.componentInstance.rulesReady()).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Editar texto do resumo');

    fixture.componentInstance.startEditingTemplate();
    fixture.componentInstance.templateDraft.set('Tentativa antes de carregar');
    fixture.componentInstance.saveTemplate();

    expect(rulesApiSpy.saveRules).not.toHaveBeenCalled();
    expect(fixture.componentInstance.editingTemplate()).toBe(false);
  });

  it('bloqueia edição/salvamento quando fetchRules falha (issue #171 / B1)', () => {
    const fieldSpy = jasmine.createSpyObj('MatchFieldSessionService', ['getDaySummary']);
    fieldSpy.getDaySummary.and.returnValue(of(summary));

    const rulesApiSpy = jasmine.createSpyObj('PeladaRulesApiService', [
      'fetchRules',
      'saveRules',
      'mapFromApi',
    ]);
    rulesApiSpy.fetchRules.and.returnValue(throwError(() => new Error('boom')));
    rulesApiSpy.saveRules.and.returnValue(of({} as PeladaRulesApiDto));
    rulesApiSpy.mapFromApi.and.returnValue({ ...DEFAULT_PELADA_RULES });

    const fixture = setup(fieldSpy, 'm1', rulesApiSpy);

    expect(fixture.componentInstance.rulesLoadError()).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Editar texto do resumo');

    fixture.componentInstance.startEditingTemplate();
    fixture.componentInstance.saveTemplate();

    expect(rulesApiSpy.saveRules).not.toHaveBeenCalled();
    expect(fixture.componentInstance.editingTemplate()).toBe(false);
  });
});
