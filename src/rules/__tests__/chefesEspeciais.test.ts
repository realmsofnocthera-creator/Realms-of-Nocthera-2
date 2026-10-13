import { describe, expect, it } from 'vitest';
import { CHEFES_ESPECIAIS_MONSTROS } from '../chefesEspeciais';
import { ESTRELAS_CACADA } from '../cacada';
import { CHEFES_ESPECIAIS } from '@/game/batalhaSangrenta';
import { bonusDanoPassivasMonstro, reducaoDanoPassivasMonstro, type Combatente } from '@/game/combat';

describe('Chefes Especiais da Batalha Sangrenta', () => {
  it('são seis, todos chefes, e cada dificuldade aponta para chefes que existem', () => {
    expect(CHEFES_ESPECIAIS_MONSTROS).toHaveLength(6);
    expect(CHEFES_ESPECIAIS_MONSTROS.every((m) => m.chefe && m.passivas)).toBe(true);
    const ids = new Set(CHEFES_ESPECIAIS_MONSTROS.map((m) => m.id));
    for (const lista of Object.values(CHEFES_ESPECIAIS)) for (const id of lista) expect(ids.has(id)).toBe(true);
  });

  it('o nível acompanha a estrela da dificuldade (monstro-chave: nível mínimo + 1)', () => {
    const estrelas = [5, 6, 7, 8, 9, 9];
    CHEFES_ESPECIAIS_MONSTROS.forEach((m, i) => {
      const e = ESTRELAS_CACADA.find((x) => x.estrela === estrelas[i])!;
      expect(m.nivel).toBe(Math.min(30, e.nivelMinimo + 1));
    });
  });

  it('as passivas e habilidades seguem o texto do Yuri', () => {
    const por = Object.fromEntries(CHEFES_ESPECIAIS_MONSTROS.map((m) => [m.id.split('-')[0], m]));
    expect(por.darius.passivas?.bonusDanoAbaixoMetadePercentual).toBe(10);
    expect(por.nymeria.passivas?.reducaoDanoFisicoPercentual).toBe(15);
    expect(por.nymeria.habilidades?.[0].acoes[0].nome).toBe('Lamento Eterno');
    expect(por.grizzham.passivas?.furia).toEqual({ percentualPorAcumulo: 5, maximoAcumulos: 4 });
    expect(por.grizzham.habilidades?.[0].acoes[0].nome).toBe('Dilacerar');
    expect(por.othrak.passivas?.reducaoDanoComNucleoPercentual).toBe(20);
    expect(por.othrak.habilidades?.[0]).toMatchObject({ aCada: 3 });
    expect(por.varkhazar.passivas?.bonusDanoACada).toEqual({ rodadas: 3, percentual: 5, limitePercentual: 25 });
    expect(por.noctharion.passivas?.reducaoDanoAbaixoMetadePercentual).toBe(10);
  });

  it('passivas em combate: bônus de dano e reduções de dano recebido', () => {
    const c = (id: string) => {
      const m = CHEFES_ESPECIAIS_MONSTROS.find((x) => x.id.startsWith(id))!;
      return { hpMax: 100, passivasMonstro: m.passivas } as unknown as Combatente;
    };
    // Darius: +10% só abaixo de 50% de HP
    expect(bonusDanoPassivasMonstro(c('darius'), 60, 1)).toBe(0);
    expect(bonusDanoPassivasMonstro(c('darius'), 40, 1)).toBe(10);
    // Grizzham: +5% por rodada que passou, até 4 acúmulos (20%)
    expect([1, 2, 3, 5, 9].map((r) => bonusDanoPassivasMonstro(c('grizzham'), 100, r))).toEqual([0, 5, 10, 20, 20]);
    // Varkhazar: +5% a cada 3 rodadas, até 25%
    expect([1, 3, 4, 7, 40].map((r) => bonusDanoPassivasMonstro(c('varkhazar'), 100, r))).toEqual([0, 0, 5, 10, 25]);
    // Nyméria: 15% só contra dano físico
    expect(reducaoDanoPassivasMonstro(c('nymeria'), 100, 0, true)).toBe(15);
    expect(reducaoDanoPassivasMonstro(c('nymeria'), 100, 0, false)).toBe(0);
    // Othrak: 20% enquanto o Núcleo (Sobreescudo) estiver de pé
    expect(reducaoDanoPassivasMonstro(c('othrak'), 100, 5, true)).toBe(20);
    expect(reducaoDanoPassivasMonstro(c('othrak'), 100, 0, true)).toBe(0);
    // Noctharion: 10% abaixo de 50% de HP
    expect(reducaoDanoPassivasMonstro(c('noctharion'), 70, 0, false)).toBe(0);
    expect(reducaoDanoPassivasMonstro(c('noctharion'), 30, 0, false)).toBe(10);
  });
});
