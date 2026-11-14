import {
  normalizeCreatePlayerName,
  rosterCreateErrorMessage,
  validateCreatePlayerName,
} from './roster-create.logic';

describe('roster create logic (3.7)', () => {
  it('normaliza e valida nome mínimo', () => {
    expect(normalizeCreatePlayerName('  João  ')).toBe('João');
    expect(validateCreatePlayerName('J')).toContain('2 caracteres');
    expect(validateCreatePlayerName('Maria')).toBeNull();
  });

  it('mapeia erros HTTP comuns', () => {
    expect(rosterCreateErrorMessage(403)).toContain('organizador');
    expect(rosterCreateErrorMessage(400, 'Lista fixa')).toBe('Lista fixa');
    expect(rosterCreateErrorMessage(0)).toContain('conexão');
  });
});