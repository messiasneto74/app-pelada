import type { PeladaPlayerProfileDto } from './pelada-player-profile-api.model';
import {
  buildPatchFromForm,
  editProfileButtonLabel,
  parseTagsText,
  profileToEditForm,
} from './player-profile-edit.logic';

const profile: PeladaPlayerProfileDto = {
  id: 'p1',
  displayName: 'Ana',
  isGoalkeeper: false,
  position: 'Meio',
  rating: 7,
  tags: ['passe', 'visão'],
  isFixedList: false,
  userId: 'u1',
  paymentPlan: 'MONTHLY',
  attributes: {
    tecnica: 8,
    forca: 6,
    chute: 5,
    passe: 9,
    defesa: 4,
    velocidade: 7,
  },
};

describe('player-profile-edit.logic (3.8-EDIT)', () => {
  it('rótulo do botão distingue adm e jogador', () => {
    expect(editProfileButtonLabel(true)).toBe('Editar perfil (adm)');
    expect(editProfileButtonLabel(false)).toBe('Editar meu perfil');
  });

  it('monta formulário a partir do perfil', () => {
    const form = profileToEditForm(profile);
    expect(form.rating).toBe(7);
    expect(form.tagsText).toBe('passe, visão');
    expect(form.paymentPlan).toBe('MONTHLY');
    expect(form.attributes.passe).toBe(9);
  });

  it('parseTagsText normaliza vírgulas', () => {
    expect(parseTagsText(' a , b,, c ')).toEqual(['a', 'b', 'c']);
  });

  it('buildPatchFromForm inclui paymentPlan só para organizador', () => {
    const form = profileToEditForm(profile);
    form.paymentPlan = 'PER_MATCH';
    const self = buildPatchFromForm(form, false);
    expect(self.paymentPlan).toBeUndefined();
    expect(self.rating).toBe(7);

    const org = buildPatchFromForm(form, true);
    expect(org.paymentPlan).toBe('PER_MATCH');
  });
});
