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

  it('apenas o item "atributos" possui disponivel=true, os outros são false', () => {
    const atributosItem = DESENVOLVIMENTO_MENU.find((item) => item.id === 'atributos');
    expect(atributosItem?.disponivel).toBe(true);

    const outrosItens = DESENVOLVIMENTO_MENU.filter((item) => item.id !== 'atributos');
    expect(outrosItens).toHaveLength(4);
    for (const item of outrosItens) {
      expect(item.disponivel).toBe(false);
    }
  });

  it('DESENVOLVIMENTO_SECAO_PADRAO é "atributos"', () => {
    expect(DESENVOLVIMENTO_SECAO_PADRAO).toBe('atributos');
  });
});
