import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaRulesService } from '../../core/pelada/pelada-rules.service';
import { PeladaRosterService } from '../../core/roster/pelada-roster.service';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import { JogadoresListaComponent } from './jogadores-lista.component';

const mockPlayers: RosterPlayer[] = [
  {
    id: 'a1',
    displayName: 'Ana Silva',
    isGoalkeeper: false,
    position: 'Meio',
    rating: 8,
    tags: ['passe'],
    isFixedList: false,
  },
  {
    id: 'g1',
    displayName: 'Bruno GK',
    isGoalkeeper: true,
    position: null,
    rating: 7,
    tags: [],
    isFixedList: false,
  },
];

describe('JogadoresListaComponent', () => {
  let fixture: ComponentFixture<JogadoresListaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JogadoresListaComponent],
      providers: [
        provideRouter([
          { path: 'jogadores', component: JogadoresListaComponent },
          { path: 'jogadores/:playerId', component: JogadoresListaComponent },
        ]),
        {
          provide: OAuthService,
          useValue: { getIdentityClaims: () => ({ sub: 'user-roster' }) },
        },
        {
          provide: PeladaRosterService,
          useValue: {
            loadRoster: (
              _p: unknown,
              onResult: (list: RosterPlayer[]) => void,
            ) => onResult(mockPlayers),
          },
        },
      ],
    }).compileComponents();

    TestBed.inject(PeladaContextService).setActivePelada({
      id: 'p1',
      name: 'Pelada',
      defaultWeekday: null,
      defaultLocation: '',
      photoPreviewUrl: null,
    });
    TestBed.inject(PeladaRulesService).saveDefaultRules('p1', {
      ...TestBed.inject(PeladaRulesService).getDefaultRules('p1'),
      fixedListOnly: false,
    });

    fixture = TestBed.createComponent(JogadoresListaComponent);
    fixture.detectChanges();
  });

  it('mostra contagem e lista §3.7', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('2 jogadores no elenco');
    expect(text).toContain('Ana Silva');
    expect(text).toContain('Bruno GK');
  });

  it('filtra por busca', () => {
    const input = fixture.nativeElement.querySelector(
      '#roster-search',
    ) as HTMLInputElement;
    input.value = 'ana';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ana Silva');
    expect(fixture.nativeElement.textContent).not.toContain('Bruno GK');
  });

  it('link para perfil do jogador', () => {
    const link = fixture.nativeElement.querySelector(
      'a[href="/jogadores/a1"]',
    );
    expect(link).not.toBeNull();
  });

  it('botão adicionar jogador', () => {
    expect(fixture.nativeElement.textContent).toContain('Adicionar jogador');
  });
});
