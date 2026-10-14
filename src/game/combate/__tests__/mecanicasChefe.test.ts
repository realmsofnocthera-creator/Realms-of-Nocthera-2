import { describe, it, expect } from 'vitest';
import {
  atualizarMecanicaNoFimDaRodada,
  bonusDanoContraAMecanica,
  bonusDanoDaMecanica,
  criarEstadoMecanica,
  escolherAcaoMecanica,
  fatiaOfensivaPercentual,
  investidaInterrompida,
  MECANICAS_PARAMETROS,
} from '../mecanicasChefe';
import type { Attributes } from '@/rules/attributes';

const attrs = (o: Partial<Attributes>): Attributes => ({ vigor: 0, sorte: 0, forca: 0, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0, ...o });
const ctx = (sorteios: number[] = [], extra: Partial<Parameters<typeof escolherAcaoMecanica>[1]> = {}) => ({
  sorteio: (i: number) => sorteios[i] ?? 0,
  alvo: { atributos: attrs({ forca: 10, vigor: 10 }) },
  ...extra,
});
/** Faz N ataques do chefe e devolve a ação de cada um (undefined = ataque básico). */
const ataques = (id: Parameters<typeof criarEstadoMecanica>[0], n: number, c = ctx()) => {
  const e = criarEstadoMecanica(id);
  return Array.from({ length: n }, () => escolherAcaoMecanica(e, c)?.nome);
};

describe('Mecânicas dos chefes do Guerreiro', () => {
  it('Astaroth, Caos Imprevisível: a cada 3 ataques sorteia uma entre três ações', () => {
    expect(ataques('caosImprevisivel', 6, ctx([0]))).toEqual([undefined, undefined, 'Golpe Devastador', undefined, undefined, 'Golpe Devastador']);
    expect(ataques('caosImprevisivel', 3, ctx([40, 50]))[2]).toBe('Explosão Elemental');
    expect(ataques('caosImprevisivel', 3, ctx([90]))[2]).toBe('Recuperação Caótica');
    const cura = escolherAcaoMecanica({ ...criarEstadoMecanica('caosImprevisivel'), ataques: 2 }, ctx([90]));
    expect(cura?.efeito.curaPercentualHpMax).toBe(MECANICAS_PARAMETROS.caosImprevisivel.recuperacaoCuraPercentualHpMax);
    const explosao = escolherAcaoMecanica({ ...criarEstadoMecanica('caosImprevisivel'), ataques: 2 }, ctx([40, 0]));
    expect(['fogo', 'gelo', 'relampago']).toContain(explosao?.efeito.elemento);
  });

  it('Zephyron, Convergência Arcana: com 3 acúmulos lança uma combinação de dois elementos', () => {
    expect(ataques('convergenciaArcana', 3, ctx([0]))[2]).toBe('Convergência: Fogo e Relâmpago');
    expect(ataques('convergenciaArcana', 3, ctx([30]))[2]).toBe('Convergência: Gelo e Sombrio');
    const gelo = escolherAcaoMecanica({ ...criarEstadoMecanica('convergenciaArcana'), ataques: 2 }, ctx([30]));
    expect(gelo?.efeito.efeitosNoAlvo?.map((d) => d.tipo)).toEqual(['enfraquecimento', 'lentidao']);
    expect(ataques('convergenciaArcana', 1, ctx([30]))[0]).toBeUndefined();
  });

  it('Thundrak, Investida Imparável: a cada 4 ataques; um efeito de interrupção no chefe diminui o impacto', () => {
    expect(ataques('investidaImparavel', 8)).toEqual([undefined, undefined, undefined, 'Investida Imparável', undefined, undefined, undefined, 'Investida Imparável']);
    const imparavel = escolherAcaoMecanica({ ...criarEstadoMecanica('investidaImparavel'), ataques: 3 }, ctx());
    expect(imparavel?.efeito.percentualDano).toBe(MECANICAS_PARAMETROS.investidaImparavel.danoPercentual);
    expect(imparavel?.efeito.efeitosNoAlvo?.[0]).toMatchObject({ tipo: 'reducaoDefesa' });
    const debuffs = [{ tipo: 'enfraquecimento' as const, percentual: 20, rodadasRestantes: 2 }];
    expect(investidaInterrompida(debuffs)).toBe(true);
    expect(investidaInterrompida([{ tipo: 'enfraquecimento', percentual: 20, rodadasRestantes: 0 }])).toBe(false);
    expect(investidaInterrompida([{ tipo: 'pontoFraco', percentual: 10, rodadasRestantes: 1 }])).toBe(false);
    const interrompida = escolherAcaoMecanica({ ...criarEstadoMecanica('investidaImparavel'), ataques: 3 }, ctx([], { debuffsDoChefe: debuffs }));
    expect(interrompida?.nome).toBe('Investida Interrompida');
    expect(interrompida?.efeito.percentualDano).toBeLessThan(imparavel!.efeito.percentualDano!);
    expect(interrompida?.efeito.efeitosNoAlvo).toBeUndefined();
  });

  it('Gorvath, Fúria Contida: acumula fúria ao sofrer dano, entra em frenesi e depois fica vulnerável', () => {
    const e = criarEstadoMecanica('furiaContida');
    const r = (dano: number) => atualizarMecanicaNoFimDaRodada(e, { nomeDoChefe: 'Gorvath', danoSofridoDoChefe: dano, hpMaxDoChefe: 1000 });
    expect(r(100)).toEqual([]); // 10% da vida = 30 de fúria
    expect(e.furia).toBe(30);
    expect(bonusDanoDaMecanica(e)).toBe(0);
    expect(r(250)).toHaveLength(1); // +75 = 105 -> limite 100: frenesi
    expect(e.furia).toBe(100);
    expect(e.frenesiRestante).toBe(2);
    expect(bonusDanoDaMecanica(e)).toBe(40);
    expect(r(500)).toEqual([]); // dano durante o frenesi não soma fúria
    expect(e.frenesiRestante).toBe(1);
    const fim = r(0);
    expect(fim[0]).toContain('vulnerável');
    expect(e).toMatchObject({ furia: 0, frenesiRestante: 0, vulneravelRestante: 2 });
    expect(bonusDanoDaMecanica(e)).toBe(0);
    expect(bonusDanoContraAMecanica(e)).toBe(25);
    r(0);
    r(0);
    expect(bonusDanoContraAMecanica(e)).toBe(0);
    r(100);
    expect(e.furia).toBe(30); // volta a acumular
  });

  it('Veredar, Balança do Julgamento: pune a build extrema, não a equilibrada', () => {
    expect(fatiaOfensivaPercentual(attrs({ forca: 90, vigor: 10 }))).toBe(90);
    expect(fatiaOfensivaPercentual(attrs({}))).toBe(50);
    const sentenca = (a: Partial<Attributes>) => ataques('balancaDoJulgamento', 3, ctx([], { alvo: { atributos: attrs(a) } }))[2];
    expect(sentenca({ forca: 90, vigor: 10 })).toBe('Sentença: Excesso de Ataque');
    expect(sentenca({ forca: 10, vigor: 50, vitalidade: 40 })).toBe('Sentença: Excesso de Defesa');
    expect(sentenca({ forca: 55, vigor: 25, vitalidade: 20 })).toBe('Sentença: Equilíbrio');
    const atk = escolherAcaoMecanica({ ...criarEstadoMecanica('balancaDoJulgamento'), ataques: 2 }, ctx([], { alvo: { atributos: attrs({ forca: 90, vigor: 10 }) } }));
    expect(atk?.efeito.efeitosNoAlvo?.[0]).toMatchObject({ tipo: 'enfraquecimento' });
    const def = escolherAcaoMecanica({ ...criarEstadoMecanica('balancaDoJulgamento'), ataques: 2 }, ctx([], { alvo: { atributos: attrs({ forca: 10, vigor: 50, vitalidade: 40 }) } }));
    expect(def?.efeito.efeitosNoAlvo?.[0]).toMatchObject({ tipo: 'reducaoDefesa' });
  });
});
