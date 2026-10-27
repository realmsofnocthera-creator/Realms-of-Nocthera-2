import { describe, it, expect } from 'vitest';
import { bonusDoVip, comBonusPercentual, definicaoDoVip, NIVEIS_DO_VIP, NIVEL_MAXIMO_DO_VIP, nivelDoVip, progressoDoVip } from '@/rules/vip';
import { diamantesDoPacote, PACOTES_DE_DIAMANTES, pedidosDoDocumento } from '@/rules/compras';

describe('VIP (8.5): níveis e bônus', () => {
  it('tem 11 níveis, de 0 a 10, com o gasto de R$ 0 a R$ 3.000 sempre crescendo', () => {
    expect(NIVEIS_DO_VIP.map((n) => n.nivel)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(NIVEIS_DO_VIP.map((n) => n.gastoCentavos / 100)).toEqual([0, 10, 30, 75, 150, 300, 600, 1000, 1500, 2200, 3000]);
    for (let i = 1; i < NIVEIS_DO_VIP.length; i++) {
      expect(NIVEIS_DO_VIP[i].gastoCentavos).toBeGreaterThan(NIVEIS_DO_VIP[i - 1].gastoCentavos);
      expect(NIVEIS_DO_VIP[i].xp).toBeGreaterThanOrEqual(NIVEIS_DO_VIP[i - 1].xp);
      expect(NIVEIS_DO_VIP[i].ouro).toBeGreaterThanOrEqual(NIVEIS_DO_VIP[i - 1].ouro);
    }
    expect(NIVEL_MAXIMO_DO_VIP).toBe(10);
  });

  it('o nível sai do gasto, nos limites exatos', () => {
    expect(nivelDoVip(0)).toBe(0);
    expect(nivelDoVip(999)).toBe(0);
    expect(nivelDoVip(1_000)).toBe(1);
    expect(nivelDoVip(2_999)).toBe(1);
    expect(nivelDoVip(3_000)).toBe(2);
    expect(nivelDoVip(299_999)).toBe(9);
    expect(nivelDoVip(300_000)).toBe(10);
    expect(nivelDoVip(9_999_999)).toBe(10);
    expect(nivelDoVip(undefined)).toBe(0);
    expect(nivelDoVip(-5)).toBe(0);
    expect(nivelDoVip(Number.NaN)).toBe(0);
  });

  it('os bônus são os da tabela do Yuri e substituem os do nível anterior', () => {
    const tabela = [
      [0, 0, 0], [1, 2, 0], [2, 3, 3], [3, 4, 5], [4, 5, 7], [5, 7, 10], [6, 8, 12], [7, 10, 15], [8, 12, 18], [9, 13, 20], [10, 15, 30],
    ];
    for (const [nivel, xp, ouro] of tabela) {
      expect(bonusDoVip(NIVEIS_DO_VIP[nivel].gastoCentavos)).toEqual({ xp, ouro });
    }
    expect(bonusDoVip(300_000).ouro).toBe(30);
    expect(bonusDoVip(300_000).ouro).not.toBe(tabela.reduce((s, l) => s + l[2], 0));
  });

  it('o ouro diário vale do VIP 1 em diante, 500 por dia', () => {
    expect(definicaoDoVip(0).ouroDiario).toBe(0);
    for (let n = 1; n <= 10; n++) expect(definicaoDoVip(n).ouroDiario).toBe(500);
  });

  it('o progresso mostra quanto falta e quanto já andou', () => {
    expect(progressoDoVip(0)).toMatchObject({ nivel: 0, percentual: 0, proximo: { nivel: 1, faltamCentavos: 1_000 } });
    expect(progressoDoVip(500)).toMatchObject({ nivel: 0, percentual: 50, proximo: { nivel: 1, faltamCentavos: 500 } });
    expect(progressoDoVip(1_000)).toMatchObject({ nivel: 1, percentual: 0, proximo: { nivel: 2, faltamCentavos: 2_000 } });
    expect(progressoDoVip(300_000)).toMatchObject({ nivel: 10, percentual: 100, proximo: null });
  });

  it('o bônus percentual arredonda para baixo e não mexe em valor zerado', () => {
    expect(comBonusPercentual(100, 15)).toBe(115);
    expect(comBonusPercentual(7, 15)).toBe(8);
    expect(comBonusPercentual(0, 30)).toBe(0);
    expect(comBonusPercentual(100, 0)).toBe(100);
  });
});

describe('Compras (8.5): pacotes e pedidos', () => {
  it('os pacotes de Diamantes dão cada vez mais por real e a primeira compra dobra o total', () => {
    const porReal = PACOTES_DE_DIAMANTES.map((p) => (p.base + p.bonus) / (p.precoCentavos / 100));
    for (let i = 1; i < porReal.length; i++) expect(porReal[i]).toBeGreaterThan(porReal[i - 1]);
    const medio = PACOTES_DE_DIAMANTES[2];
    expect(diamantesDoPacote(medio, false)).toBe(480);
    expect(diamantesDoPacote(medio, true)).toBe(960);
  });

  it('os pedidos gravados são lidos com tolerância: o que está quebrado ou repetido sai', () => {
    const bom = { id: 'ped_1', produto: 'diamantes-1', nome: 'Pacote', valorCentavos: 499, estado: 'pago', provedor: 'teste', criadoEm: '2026-10-27T10:00:00.000Z', diamantes: 200 };
    const lidos = pedidosDoDocumento([bom, { ...bom }, { ...bom, id: 'ped_2', estado: 'voando' }, { ...bom, id: 'ped_3', valorCentavos: -1 }, null, 'x']);
    expect(lidos).toHaveLength(1);
    expect(lidos?.[0]).toMatchObject({ id: 'ped_1', diamantes: 200 });
    expect(pedidosDoDocumento('nada')).toBeUndefined();
  });
});
