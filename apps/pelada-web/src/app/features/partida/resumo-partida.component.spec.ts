import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { of, throwError } from 'rxjs';
import type { MatchDaySummaryDto } from '../../core/match/match-field-session-api.model';
import { MatchFieldSessionService } from '../../core/match/match-field-session.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
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

function setup(
  fieldSpy: jasmine.SpyObj<MatchFieldSessionService>,
  matchId: string | null,
): ComponentFixture<ResumoPartidaComponent> {
  TestBed.configureTestingModule({
    imports: [ResumoPartidaComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: MatchFieldSessionService, useValue: fieldSpy },
      {
        provide: OAuthService,
        useValue: { getIdentityClaims: () => ({ sub: 'user-resumo' }) },
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

  it('sem matchId na URL, mostra erro', () => {
    const fieldSpy = jasmine.createSpyObj('MatchFieldSessionService', ['getDaySummary']);
    const fixture = setup(fieldSpy, null);
    expect(fixture.nativeElement.textContent).toContain('Partida não encontrada');
    expect(fieldSpy.getDaySummary).not.toHaveBeenCalled();
  });

  it('erro da API mostra mensagem amigável', () => {
    const fieldSpy = jasmine.createSpyObj('MatchFieldSessionService', ['getDaySummary']);
    fieldSpy.getDaySummary.and.returnValue(throwError(() => new Error('boom')));
    const fixture = setup(fieldSpy, 'm1');
    expect(fixture.nativeElement.textContent).toContain(
      'Não foi possível carregar o resumo do dia.',
    );
  });
});
