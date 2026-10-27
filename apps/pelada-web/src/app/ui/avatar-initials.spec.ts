import { avatarInitials } from './avatar-initials';

describe('avatarInitials', () => {
  it('duas palavras → iniciais', () => {
    expect(avatarInitials('João Silva')).toBe('JS');
  });

  it('uma palavra → até 2 letras', () => {
    expect(avatarInitials('Pelada')).toBe('PE');
  });

  it('vazio → ?', () => {
    expect(avatarInitials('   ')).toBe('?');
  });
});
