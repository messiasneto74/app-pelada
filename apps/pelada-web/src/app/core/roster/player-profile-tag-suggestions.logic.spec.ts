import {
  attributeSuggestionForTag,
  attributeSuggestionsForTags,
  STYLE_TAG_CATALOG_NAMES,
  suggestStyleTags,
} from './player-profile-tag-suggestions.logic';

describe('player-profile-tag-suggestions.logic (issue #188)', () => {
  it('sugere atributo e valor pra uma tag do catálogo', () => {
    expect(attributeSuggestionForTag('artilheiro')).toEqual({
      attribute: 'chute',
      value: 9,
    });
    expect(attributeSuggestionForTag('rápido')).toEqual({
      attribute: 'velocidade',
      value: 7,
    });
  });

  it('é case-insensitive e ignora espaços nas pontas', () => {
    expect(attributeSuggestionForTag('  ARTILHEIRO  ')).toEqual({
      attribute: 'chute',
      value: 9,
    });
  });

  it('retorna null pra tag fora do catálogo', () => {
    expect(attributeSuggestionForTag('zagueiro central improvisado')).toBeNull();
    expect(attributeSuggestionForTag('')).toBeNull();
  });

  it('attributeSuggestionsForTags ignora tags sem correspondência', () => {
    expect(
      attributeSuggestionsForTags(['artilheiro', 'xyz', 'robusto']),
    ).toEqual([
      { attribute: 'chute', value: 9 },
      { attribute: 'forca', value: 9 },
    ]);
  });

  it('suggestStyleTags inclui o catálogo inteiro mais tags já usadas, sem duplicar', () => {
    const result = suggestStyleTags(['corredor', 'rápido']);
    expect(result).toContain('corredor');
    expect(result.filter((t) => t.toLowerCase() === 'rápido').length).toBe(1);
    for (const catalogTag of STYLE_TAG_CATALOG_NAMES) {
      expect(result).toContain(catalogTag);
    }
  });
});
