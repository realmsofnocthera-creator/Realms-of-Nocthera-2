import { describe, expect, it } from 'vitest';
import { PODER_POR_NIVEL_DE_HABILIDADE, PODER_POR_NIVEL_DE_HABILIDADE_EXCLUSIVA, poderDasHabilidadesDeArmadura } from '@/rules/poderTotal';
import { HABILIDADES_ARMADURA } from '@/rules/habilidadesArmadura';

describe('Poder Total: pontos das habilidades de armadura', () => {
  const comum = HABILIDADES_ARMADURA.find((h) => !h.exclusivaDe)!;
  const exclusiva = HABILIDADES_ARMADURA.find((h) => h.exclusivaDe)!;

  it('sem habilidades não soma nada', () => {
    expect(poderDasHabilidadesDeArmadura(undefined)).toBe(0);
    expect(poderDasHabilidadesDeArmadura({})).toBe(0);
  });

  it('cada nível da comum vale 2 e o da exclusiva dos 9★ vale o dobro, limitado ao nível máximo', () => {
    expect(poderDasHabilidadesDeArmadura({ [comum.id]: 1 })).toBe(PODER_POR_NIVEL_DE_HABILIDADE);
    expect(poderDasHabilidadesDeArmadura({ [comum.id]: 99 })).toBe(comum.nivelMaximo * PODER_POR_NIVEL_DE_HABILIDADE);
    expect(poderDasHabilidadesDeArmadura({ [exclusiva.id]: 2 })).toBe(2 * PODER_POR_NIVEL_DE_HABILIDADE_EXCLUSIVA);
  });

  it('ignora ids desconhecidos e níveis zerados', () => {
    expect(poderDasHabilidadesDeArmadura({ inexistente: 3, [comum.id]: 0 })).toBe(0);
  });
});
