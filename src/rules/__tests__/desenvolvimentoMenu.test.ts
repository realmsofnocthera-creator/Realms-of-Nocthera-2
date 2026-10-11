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

  it('só "maestrias" ainda é "Em breve" (Reforço e Ascensão de Habilidade liberados na 2.2)', () => {
    const liberados = DESENVOLVIMENTO_MENU.filter((item) => item.disponivel).map((item) => item.id);
    expect(liberados).toEqual(['atributos', 'subclasse', 'melhorarHabilidade', 'avancoHabilidade']);
    expect(DESENVOLVIMENTO_MENU.find((item) => item.id === 'maestrias')?.disponivel).toBe(false);
  });

  it('DESENVOLVIMENTO_SECAO_PADRAO é "atributos"', () => {
    expect(DESENVOLVIMENTO_SECAO_PADRAO).toBe('atributos');
  });
});
