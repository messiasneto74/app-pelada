import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { PeladaApiService } from '../../core/pelada/pelada-api.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import { peladaRulesFromApi } from '../../core/pelada/pelada-rules-api.mapper';
import { PeladaRulesApiService } from '../../core/pelada/pelada-rules-api.service';
import { DEFAULT_PELADA_RULES } from '../../core/pelada/pelada-rules.model';
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

const rulesApiDto = {
  peladaId: 'p1',
  playersPerTeam: DEFAULT_PELADA_RULES.playersPerTeam,
  teamCount: DEFAULT_PELADA_RULES.teamCount,
  modality: DEFAULT_PELADA_RULES.modality,
  goalkeeperMode: 'ROTATING' as const,
  fixedListOnly: false,
  allowPlayerSelfEdit: false,
  drawWeights: {},
  extra: {},
};

describe('JogadoresListaComponent', () => {
  let fixture: ComponentFixture<JogadoresListaComponent>;
  let createPlayerSpy: jasmine.Spy;
  let fetchRulesSpy: jasmine.Spy;

  beforeEach(async () => {
    fetchRulesSpy = jasmine
      .createSpy('fetchRules')
      .and.returnValue(of({ ...rulesApiDto }));

    createPlayerSpy = jasmine.createSpy('createPlayer').and.returnValue(
      of({
        id: 'n1',
        displayName: 'Novo Jogador',
        isGoalkeeper: false,
        position: null,
        rating: null,
        tags: [],
        isFixedList: false,
      } satisfies RosterPlayer),
    );

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
            createPlayer: createPlayerSpy,
            loadGuests: (
              _p: unknown,
              onResult: (list: RosterPlayer[]) => void,
            ) => onResult([]),
            promoteGuest: jasmine.createSpy('promoteGuest'),
          },
        },
        {
          provide: PeladaOrganizadorContextService,
          useValue: {
            isOrganizador: () => true,
            refreshMembership: jasmine.createSpy('refreshMembership'),
          },
        },
        {
          provide: PeladaRulesApiService,
          useValue: {
            fetchRules: fetchRulesSpy,
            mapFromApi: peladaRulesFromApi,
          },
        },
        {
          provide: PeladaApiService,
          useValue: {
            createInvite: jasmine
              .createSpy('createInvite')
              .and.resolveTo({ token: 'tok-1', peladaId: 'p1', expiresAt: '' }),
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

  it('organizador abre modal e adiciona jogador via API', async () => {
    expect(fixture.nativeElement.textContent).toContain('Adicionar jogador');
    const addBtn = fixture.nativeElement.querySelector(
      '[peladaButton]',
    ) as HTMLButtonElement;
    addBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector(
      '#new-player-name',
    ) as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    nameInput.value = 'Novo Jogador';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector(
      '.add-modal__form',
    ) as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(createPlayerSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: 'p1' }),
      jasmine.objectContaining({ displayName: 'Novo Jogador' }),
    );
    expect(fixture.nativeElement.textContent).toContain('Novo Jogador');
    expect(fixture.nativeElement.textContent).not.toContain('3.7-API');
  });

  it('validação impede nome curto', async () => {
    fixture.componentInstance.openAddPlayerModal();
    await fixture.whenStable();
    fixture.detectChanges();
    fixture.componentInstance.submitNewPlayer(new Event('submit'));
    fixture.detectChanges();
    expect(createPlayerSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.addModalError()).toContain('2 caracteres');
  });

  it('busca fixedListOnly da API antes do modal (sessionStorage vazio)', async () => {
    sessionStorage.clear();
    fetchRulesSpy.and.returnValue(
      of({ ...rulesApiDto, fixedListOnly: true }),
    );

    fixture.componentInstance.openAddPlayerModal();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fetchRulesSpy).toHaveBeenCalledWith('p1');
    expect(fixture.nativeElement.textContent).toContain('Fixo na lista');

    fixture.componentInstance.newPlayerName.set('Lista Fixa');
    fixture.componentInstance.newPlayerFixedList.set(true);
    fixture.componentInstance.submitNewPlayer(new Event('submit'));
    fixture.detectChanges();

    expect(createPlayerSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: 'p1' }),
      jasmine.objectContaining({
        displayName: 'Lista Fixa',
        isFixedList: true,
      }),
    );
  });

  it('exibe erro da API no modal', () => {
    createPlayerSpy.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden',
          }),
      ),
    );
    fixture.componentInstance.openAddPlayerModal();
    fixture.componentInstance.newPlayerName.set('Carlos Lima');
    fixture.componentInstance.submitNewPlayer(new Event('submit'));
    fixture.detectChanges();
    expect(fixture.componentInstance.addModalError()).toContain('organizador');
  });

  describe('convite de jogador (issue #172)', () => {
    it('botão "Convidar jogador" gera link e QR code', async () => {
      expect(fixture.nativeElement.textContent).toContain('Convidar jogador');

      fixture.componentInstance.openInviteModal();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.componentInstance.inviteLink()).toBe(
        `${window.location.origin}/convite/tok-1`,
      );
      expect(fixture.nativeElement.querySelector('pelada-qr-code')).not.toBeNull();
      const linkInput = fixture.nativeElement.querySelector(
        '#invite-link',
      ) as HTMLInputElement;
      expect(linkInput.value).toContain('/convite/tok-1');
    });

    it('fecha o modal de convite', async () => {
      fixture.componentInstance.openInviteModal();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.componentInstance.inviteModalOpen()).toBe(true);

      fixture.componentInstance.closeInviteModal();
      fixture.detectChanges();
      expect(fixture.componentInstance.inviteModalOpen()).toBe(false);
    });
  });

  describe('lista Convidados (issue #172)', () => {
    it('mostra convidados e promove um deles', () => {
      const promoteSpy = jasmine.createSpy('promoteGuest').and.returnValue(
        of({
          id: 'g2',
          displayName: 'Convidado Fulano',
          isGoalkeeper: false,
          position: null,
          rating: null,
          tags: [],
          isFixedList: false,
          isGuest: false,
        } satisfies RosterPlayer),
      );
      const rosterService = TestBed.inject(PeladaRosterService) as unknown as {
        promoteGuest: jasmine.Spy;
      };
      rosterService.promoteGuest = promoteSpy;

      fixture.componentInstance.guests.set([
        {
          id: 'g2',
          displayName: 'Convidado Fulano',
          isGoalkeeper: false,
          position: null,
          rating: null,
          tags: [],
          isFixedList: false,
          isGuest: true,
        },
      ]);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Convidados');
      expect(fixture.nativeElement.textContent).toContain('Convidado Fulano');

      fixture.componentInstance.promoteGuest('g2');
      fixture.detectChanges();

      expect(promoteSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 'p1' }),
        'g2',
      );
      expect(fixture.componentInstance.guests()).toEqual([]);
    });
  });
});