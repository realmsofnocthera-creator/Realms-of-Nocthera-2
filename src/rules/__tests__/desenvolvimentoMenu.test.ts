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

  it('todos os itens estão liberados (Maestrias liberadas em 23/10/2026)', () => {
    expect(DESENVOLVIMENTO_MENU.every((item) => item.disponivel)).toBe(true);
  });

  it('DESENVOLVIMENTO_SECAO_PADRAO é "atributos"', () => {
    expect(DESENVOLVIMENTO_SECAO_PADRAO).toBe('atributos');
  });
});
