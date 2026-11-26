import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../../auth/auth.service';
import { CompletarComponent, phoneValidationMessage } from './completar.component';

describe('Completar cadastro — mensagens (issue #221)', () => {
  it('phoneValidationMessage: vazio, inválido e válido', () => {
    expect(phoneValidationMessage('  ')).toBe('Informe seu telefone com DDD.');
    expect(phoneValidationMessage('123')).toContain('Telefone inválido');
    expect(phoneValidationMessage('abc12345678')).toContain('Telefone inválido');
    expect(phoneValidationMessage('(11) 99999-0000')).toBeNull();
    expect(phoneValidationMessage('+55 62 99999 0000')).toBeNull();
  });

  describe('tela', () => {
    let fixture: ComponentFixture<CompletarComponent>;
    let auth: jasmine.SpyObj<AuthService>;

    beforeEach(() => {
      auth = jasmine.createSpyObj('AuthService', ['patchMe', 'continueAfterLogin', 'logout']);
      TestBed.configureTestingModule({
        imports: [CompletarComponent],
        providers: [{ provide: AuthService, useValue: auth }],
      });
      fixture = TestBed.createComponent(CompletarComponent);
      fixture.detectChanges();
    });

    it('sem telefone: avisa sem chamar a API', async () => {
      fixture.componentInstance.phone = '';
      await fixture.componentInstance.submit();
      expect(auth.patchMe).not.toHaveBeenCalled();
      expect(fixture.componentInstance.error()).toBe('Informe seu telefone com DDD.');
    });

    it('API recusa o número (400): mensagem de telefone inválido, sem citar "API"', async () => {
      auth.patchMe.and.returnValue(Promise.reject(new HttpErrorResponse({ status: 400 })));
      fixture.componentInstance.phone = '11999990000';
      await fixture.componentInstance.submit();
      expect(fixture.componentInstance.error()).toContain('Telefone inválido');
      expect(fixture.componentInstance.error()).not.toContain('API');
    });

    it('falha de rede: pede pra tentar de novo, sem citar "API"', async () => {
      auth.patchMe.and.returnValue(Promise.reject(new HttpErrorResponse({ status: 0 })));
      fixture.componentInstance.phone = '11999990000';
      await fixture.componentInstance.submit();
      expect(fixture.componentInstance.error()).toContain('tente de novo');
      expect(fixture.componentInstance.error()).not.toContain('API');
    });
  });
});
