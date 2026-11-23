import { describe, it, expect } from 'vitest';
import {
  CONJUNTOS, EXPANSOES_DA_MOCHILA, ITENS_COSMETICOS, PASSE_DO_INICIANTE, PRECOS_DOS_COSMETICOS, RARIDADES_DA_LOJA, TIPOS_DE_COSMETICO, TODOS_OS_ITENS_NOVOS,
  TOTAL_DA_EXPANSAO_DA_MOCHILA_CENTAVOS, TOTAL_DE_ESPACOS_DA_EXPANSAO, VAGA_EXTRA_DE_EXPEDICAO,
} from '@/rules/lojaPaga';

describe('catálogo da Loja Premium (vitrine)', () => {
  it('os pacotes e a conveniência têm os preços do Yuri', () => {
    expect(PASSE_DO_INICIANTE.precoCentavos).toBe(1499);
    expect(PASSE_DO_INICIANTE.diasParaComprar).toBe(14);
    expect(PASSE_DO_INICIANTE.duracaoEmDias).toBe(14);
    expect(VAGA_EXTRA_DE_EXPEDICAO.precoCentavos).toBe(999);
    expect(VAGA_EXTRA_DE_EXPEDICAO.limiteDeVagas).toBe(5);
  });

  it('a Expansão da Mochila tem 10 pacotes crescentes, de R$ 2,99 a R$ 11,99, com total R$ 79,90 e +200 espaços', () => {
    expect(EXPANSOES_DA_MOCHILA.map((p) => p.precoCentavos)).toEqual([299, 499, 599, 599, 799, 799, 999, 999, 1199, 1199]);
    for (let i = 1; i < EXPANSOES_DA_MOCHILA.length; i++) expect(EXPANSOES_DA_MOCHILA[i].precoCentavos).toBeGreaterThanOrEqual(EXPANSOES_DA_MOCHILA[i - 1].precoCentavos);
    expect(TOTAL_DA_EXPANSAO_DA_MOCHILA_CENTAVOS).toBe(7990);
    expect(TOTAL_DE_ESPACOS_DA_EXPANSAO).toBe(200);
    expect(EXPANSOES_DA_MOCHILA.at(-1)!.acumuladoCentavos).toBe(7990);
  });

  it('os cosméticos seguem a tabela de preços (cada tipo só nas raridades que existem)', () => {
    expect(PRECOS_DOS_COSMETICOS.moldura).toEqual({ comum: 599, raro: 1199, epico: 2399, lendario: 4799 });
    expect(PRECOS_DOS_COSMETICOS.avatar).toEqual({ raro: 999, epico: 1999, lendario: 3999 });
    expect(PRECOS_DOS_COSMETICOS.efeito).toEqual({ raro: 1599, epico: 2799, lendario: 5499 });
    expect(PRECOS_DOS_COSMETICOS.aura).toEqual({ epico: 3199, lendario: 5999 });
    expect(PRECOS_DOS_COSMETICOS.skin).toEqual({ epico: 5999, lendario: 9999 });
    expect(PRECOS_DOS_COSMETICOS.decoracao).toEqual({ comum: 399, raro: 999 });
    for (const i of ITENS_COSMETICOS) expect(i.precoCentavos).toBe(PRECOS_DOS_COSMETICOS[i.tipo][i.raridade]);
    const celulas = TIPOS_DE_COSMETICO.reduce((t, tipo) => t + RARIDADES_DA_LOJA.filter((r) => PRECOS_DOS_COSMETICOS[tipo][r] !== undefined).length, 0);
    expect(celulas).toBe(16);
    expect(ITENS_COSMETICOS).toHaveLength(32);
    expect(new Set(ITENS_COSMETICOS.map((i) => i.id)).size).toBe(32);
  });

  it('os Conjuntos: o conteúdo, a soma avulsa e o preço do Yuri (cerca de 25% de desconto)', () => {
    const [raro, epico, lendario] = CONJUNTOS;
    expect(raro.itens.map((i) => i.tipo)).toEqual(['moldura', 'avatar', 'efeito']);
    expect(epico.itens.map((i) => i.tipo)).toEqual(['moldura', 'avatar', 'efeito', 'aura']);
    expect(lendario.itens.map((i) => i.tipo)).toEqual(['moldura', 'avatar', 'efeito', 'aura']);
    expect([raro, epico, lendario].map((c) => c.precoAvulsoCentavos)).toEqual([3797, 10396, 20296]);
    expect([raro, epico, lendario].map((c) => c.precoCentavos)).toEqual([2899, 7799, 14999]);
    for (const c of CONJUNTOS) {
      expect(c.itens.every((i) => i.raridade === c.raridade)).toBe(true);
      expect(c.economiaCentavos / c.precoAvulsoCentavos).toBeGreaterThan(0.22);
      expect(c.economiaCentavos / c.precoAvulsoCentavos).toBeLessThan(0.28);
    }
  });

  it('nada é vendido ainda (só a vitrine) e todos os ids dos itens novos são diferentes', () => {
    expect(ITENS_COSMETICOS.every((i) => i.aVenda === false)).toBe(true);
    expect(new Set(TODOS_OS_ITENS_NOVOS.map((i) => i.id)).size).toBe(TODOS_OS_ITENS_NOVOS.length);
    expect(TODOS_OS_ITENS_NOVOS).toHaveLength(2 + 10 + 32 + 3);
  });
});
