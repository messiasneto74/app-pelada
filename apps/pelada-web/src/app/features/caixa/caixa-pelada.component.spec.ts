import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OAuthService } from 'angular-oauth2-oidc';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import { PeladaDashboardRefreshService } from '../../core/inicio/pelada-dashboard-refresh.service';
import { PeladaPaymentsService } from '../../core/payments/pelada-payments.service';
import type { PaymentLedgerResponse } from '../../core/payments/payment-ledger-api.model';
import { CaixaPeladaComponent } from './caixa-pelada.component';
import { of } from 'rxjs';

const ledger: PaymentLedgerResponse = {
  peladaId: 'pel-1',
  paymentModel: 'PER_MATCH',
  feeCents: 2000,
  periodStart: '2026-11-01T00:00:00.000Z',
  periodEnd: '2026-12-01T00:00:00.000Z',
  summary: { receivedCents: 2000, expectedCents: 4000, pendingCents: 2000 },
  groups: [
    {
      key: 'p1',
      label: 'Ana',
      receivedCents: 2000,
      expectedCents: 2000,
      entries: [
        {
          id: 'led-1',
          playerId: 'p1',
          playerName: 'Ana',
          playerPaymentPlan: 'PER_MATCH',
          matchId: 'm1',
          matchScheduledAt: '2026-11-05T22:00:00.000Z',
          amountCents: 2000,
          status: 'PAID',
          paidAt: '2026-11-06T00:00:00.000Z',
        },
        {
          id: 'led-2',
          playerId: 'p2',
          playerName: 'Bruno',
          playerPaymentPlan: 'MONTHLY',
          matchId: null,
          matchScheduledAt: null,
          amountCents: 2000,
          status: 'PENDING',
          paidAt: null,
        },
      ],
    },
  ],
};

describe('CaixaPeladaComponent §3.9', () => {
  let fixture: ComponentFixture<CaixaPeladaComponent>;
  let paymentsSpy: jasmine.SpyObj<PeladaPaymentsService>;
  let dashboardRefreshSpy: jasmine.SpyObj<PeladaDashboardRefreshService>;

  beforeEach(async () => {
    paymentsSpy = jasmine.createSpyObj('PeladaPaymentsService', [
      'getLedger',
      'markPaid',
    ]);
    dashboardRefreshSpy = jasmine.createSpyObj('PeladaDashboardRefreshService', [
      'notifyCashSummaryChanged',
    ]);
    paymentsSpy.getLedger.and.returnValue(of(ledger));
    paymentsSpy.markPaid.and.returnValue(
      of({ ...ledger.groups[0].entries[0], status: 'PAID' as const }),
    );

    await TestBed.configureTestingModule({
      imports: [CaixaPeladaComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: OAuthService, useValue: { getIdentityClaims: () => ({ sub: 'test' }) } },
        { provide: PeladaPaymentsService, useValue: paymentsSpy },
        { provide: PeladaDashboardRefreshService, useValue: dashboardRefreshSpy },
        {
          provide: PeladaOrganizadorContextService,
          useValue: {
            isOrganizador: () => true,
            refreshMembership: jasmine.createSpy('refreshMembership'),
          },
        },
      ],
    }).compileComponents();

    TestBed.inject(PeladaContextService).setActivePelada({
      id: 'pel-1',
      name: 'Pelada Caixa',
      defaultWeekday: null,
      defaultLocation: '',
      photoPreviewUrl: null,
    });

    fixture = TestBed.createComponent(CaixaPeladaComponent);
    fixture.detectChanges();
  });

  it('mostra resumo e chips Pago / Devendo', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Recebido no período');
    expect(text).toContain('Pago');
    expect(text).toContain('Devendo');
    expect(text).toContain('Por jogador');
    expect(paymentsSpy.getLedger).toHaveBeenCalledWith('pel-1', 'player');
  });

  it('§3.9-ZAP: organizador vê Cobrança Zap desabilitada', () => {
    const btn = fixture.nativeElement.querySelector(
      '.zap-charge-btn',
    ) as HTMLButtonElement | null;
    expect(btn).withContext('botão Zap visível para adm').toBeTruthy();
    expect(btn!.disabled).toBe(true);
    expect(btn!.textContent).toContain('Cobrança Zap');
  });

  it('markPaid chama API e recarrega', () => {
    const pendingBtn = [...fixture.nativeElement.querySelectorAll('.mark-btn')].find(
      (b: Element) => !(b as HTMLButtonElement).disabled,
    ) as HTMLButtonElement | undefined;
    expect(pendingBtn).toBeTruthy();
    pendingBtn!.click();
    fixture.detectChanges();
    expect(paymentsSpy.markPaid).toHaveBeenCalledWith('pel-1', 'led-2');
    expect(dashboardRefreshSpy.notifyCashSummaryChanged).toHaveBeenCalled();
    expect(paymentsSpy.getLedger).toHaveBeenCalledTimes(2);
  });
});

describe('CaixaPeladaComponent §3.9-ZAP (não organizador)', () => {
  let fixture: ComponentFixture<CaixaPeladaComponent>;

  beforeEach(async () => {
    const paymentsSpy = jasmine.createSpyObj('PeladaPaymentsService', [
      'getLedger',
      'markPaid',
    ]);
    paymentsSpy.getLedger.and.returnValue(of(ledger));

    await TestBed.configureTestingModule({
      imports: [CaixaPeladaComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: OAuthService, useValue: { getIdentityClaims: () => ({ sub: 'test' }) } },
        { provide: PeladaPaymentsService, useValue: paymentsSpy },
        {
          provide: PeladaDashboardRefreshService,
          useValue: jasmine.createSpyObj('PeladaDashboardRefreshService', [
            'notifyCashSummaryChanged',
          ]),
        },
        {
          provide: PeladaOrganizadorContextService,
          useValue: {
            isOrganizador: () => false,
            refreshMembership: jasmine.createSpy('refreshMembership'),
          },
        },
      ],
    }).compileComponents();

    TestBed.inject(PeladaContextService).setActivePelada({
      id: 'pel-1',
      name: 'Pelada Caixa',
      defaultWeekday: null,
      defaultLocation: '',
      photoPreviewUrl: null,
    });

    fixture = TestBed.createComponent(CaixaPeladaComponent);
    fixture.detectChanges();
  });

  it('não mostra botão Cobrança Zap', () => {
    expect(fixture.nativeElement.querySelector('.zap-charge-btn')).toBeNull();
  });
});
