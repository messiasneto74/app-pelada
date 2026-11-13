import {
  normalizePatchPlayerBody,
  parseAttributesRecord,
} from './normalize-patch-player-body';

describe('normalizePatchPlayerBody', () => {
  it('não converte isFixedList false em true', () => {
    const out = normalizePatchPlayerBody({ isFixedList: 'false' });
    expect(out.isFixedList).toBe(false);
  });

  it('converte attributes[chute] e números em string', () => {
    const out = normalizePatchPlayerBody({
      'attributes[chute]': '9',
      isGoalkeeper: 'false',
    });
    expect(out.attributes).toEqual({ chute: 9 });
    expect(out.isGoalkeeper).toBe(false);
  });

  it('parseAttributesRecord ignora lixo', () => {
    expect(parseAttributesRecord({ chute: '9', foo: 'bar' })).toEqual({
      chute: 9,
    });
  });
});
