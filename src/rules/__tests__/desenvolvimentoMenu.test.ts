import { describe, it, expect } from 'vitest';
import {
  DESENVOLVIMENTO_MENU,
  DESENVOLVIMENTO_SECAO_PADRAO,
} from '@/rules/desenvolvimentoMenu';

describe('DESENVOLVIMENTO_MENU', () => {
  it('contém exatamente 5 itens na ordem esperada', () => {
    expect(DESENVOLVIMENTO_MENU).toHaveLength(5);
    const ids = DESENVOLVIMENTO_MENU.map((item) => item.id);
    expect(ids).toEqual([
      'atributos',
      'subclasse',
      'melhorarHabilidade',
      'avancoHabilidade',
      'maestrias',
    ]);
  });

  it('"atributos" e "subclasse" estão disponíveis; os outros 3 ainda são "Em breve"', () => {
    const liberados = DESENVOLVIMENTO_MENU.filter((item) => item.disponivel).map((item) => item.id);
    expect(liberados).toEqual(['atributos', 'subclasse']);

    const outrosItens = DESENVOLVIMENTO_MENU.filter((item) => item.id !== 'atributos' && item.id !== 'subclasse');
    expect(outrosItens).toHaveLength(3);
    for (const item of outrosItens) {
      expect(item.disponivel).toBe(false);
    }
  });

  it('DESENVOLVIMENTO_SECAO_PADRAO é "atributos"', () => {
    expect(DESENVOLVIMENTO_SECAO_PADRAO).toBe('atributos');
  });
});
