import { describe, it, expect } from 'vitest';
import { DADOS_CACADA_MAP, ESTRELAS_CACADA, MONSTROS_CACADA } from '@/rules/cacada';
import { XP_BASE_DA_CACADA, XP_TABLE } from '@/rules/xpTable';

describe('XP da Caçada separado da tabela de nível (Ordem 1)', () => {
  it('a base da Caçada é a tabela antiga, com os mesmos níveis da XP_TABLE', () => {
    expect(Object.keys(XP_BASE_DA_CACADA)).toEqual(Object.keys(XP_TABLE));
    expect(XP_BASE_DA_CACADA[1]).toBe(20);
    expect(XP_BASE_DA_CACADA[11]).toBe(300);
    expect(XP_BASE_DA_CACADA[29]).toBe(3800);
  });

  it('o XP de cada monstro vem de 5% da base da Caçada no nível mínimo da estrela, não da XP_TABLE', () => {
    for (const m of MONSTROS_CACADA) {
      const d = DADOS_CACADA_MAP[m.id];
      const e = ESTRELAS_CACADA.find((x) => x.estrela === d.estrela)!;
      expect(m.xpConcedido).toBe(Math.max(1, Math.round((XP_BASE_DA_CACADA[e.nivelMinimo] ?? 0) * 0.05)));
    }
  });
});
