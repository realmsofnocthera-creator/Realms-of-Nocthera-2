import { describe, it, expect } from 'vitest';
import {
  aplicarReforcoAtributos,
  bonusReforcoEmAtributos,
  calcularHpMax,
  calcularSobreescudoMax,
  proximaAscensao,
  proximoNivelReforco,
} from '@/game';
import { calcularGolpeBarbaro, calcularGolpeFeiticeiro, calcularUltimoBastiao } from '@/game/combat';
import { obterModificadoresPassivaSubclasse } from '@/game/combate/habilidades/passivas';
import { bonusHabilidadePorAscensao } from '@/rules/progressaoHabilidade';

const ATR = { vigor: 100, sorte: 40, forca: 200, vitalidade: 50, arcano: 10, inteligencia: 7, agilidade: 3 };

describe('Reforço de Habilidade nos atributos (2.2.2)', () => {
  it('nível 0 não muda nada', () => {
    expect(aplicarReforcoAtributos(ATR, 0)).toEqual(ATR);
  });

  it('nível 30: +25% em cada atributo, arredondado para baixo', () => {
    expect(aplicarReforcoAtributos(ATR, 30)).toEqual({
      vigor: 125, sorte: 50, forca: 250, vitalidade: 62, arcano: 12, inteligencia: 8, agilidade: 3,
    });
    expect(bonusReforcoEmAtributos(ATR, 30).forca).toBe(50);
  });

  it('nível 10 (+5%): 200 de Força vira 210', () => {
    expect(aplicarReforcoAtributos(ATR, 10).forca).toBe(210);
  });

  it('próximo nível: custo e saldo', () => {
    expect(proximoNivelReforco(0, 100)).toEqual({ nivel: 1, custo: 100 });
    expect(proximoNivelReforco(0, 99)).toEqual({ nivel: 1, custo: 100, motivo: 'essenciaInsuficiente' });
    expect(proximoNivelReforco(29, 10_000)).toEqual({ nivel: 30, custo: 10_000 });
    expect(proximoNivelReforco(30, 999_999)).toBeNull();
  });
});

describe('Ascensão de Habilidade (2.2.1)', () => {
  it('só libera com o Reforço no 30 e 1 fragmento', () => {
    expect(proximaAscensao(0, 29, 5)).toEqual({ ascensao: 1, custo: 1, motivo: 'reforcoIncompleto' });
    expect(proximaAscensao(0, 30, 0)).toEqual({ ascensao: 1, custo: 1, motivo: 'fragmentosInsuficientes' });
    expect(proximaAscensao(0, 30, 1)).toEqual({ ascensao: 1, custo: 1 });
    expect(proximaAscensao(10, 30, 9)).toBeNull();
  });

  it('ataque básico no nível 2 (A1): Golpe Bárbaro +10% no grupo de soma', () => {
    const base = { forcaBase: 100, hpAtual: 100, hpMax: 100, nivel: 1, contadorFuria: 0, contadorIra: 0 };
    expect(calcularGolpeBarbaro(base).danoBruto).toBe(100);
    expect(calcularGolpeBarbaro({ ...base, bonusNivel: bonusHabilidadePorAscensao(1) }).danoBruto).toBe(110);
    // A6 = nível 3: +20%
    expect(calcularGolpeBarbaro({ ...base, bonusNivel: bonusHabilidadePorAscensao(6) }).danoBruto).toBe(120);
  });

  it('ultimate só melhora no A5: Cataclismo Arcano +10%', () => {
    const base = { inteligenciaBase: 100, nivel: 30, contadorExplosao: 0, contadorAcumulo: 0, cargasAcumulo: 0, contadorCataclismo: 6 };
    const semNivel = calcularGolpeFeiticeiro(base);
    expect(semNivel.habilidadeAcionada).toBe('Cataclismo Arcano');
    // Só o ultimate muda do A4 para o A5 (o A3 já tinha subido o Fluxo Arcano, que é a Passiva I)
    const a4 = calcularGolpeFeiticeiro({ ...base, bonusNivel: { ...bonusHabilidadePorAscensao(4) } });
    const a5 = calcularGolpeFeiticeiro({ ...base, bonusNivel: { ...bonusHabilidadePorAscensao(5) } });
    const soUltimate = calcularGolpeFeiticeiro({ ...base, bonusNivel: { ultimate: 10 } });
    expect(a4.danoBruto).toBeGreaterThan(semNivel.danoBruto);
    expect(a5.danoBruto).toBeGreaterThan(a4.danoBruto);
    expect(soUltimate.danoBruto).toBeGreaterThan(semNivel.danoBruto);
    expect(calcularGolpeFeiticeiro({ ...base, bonusNivel: { ataqueBasico: 20 } }).danoBruto).toBe(semNivel.danoBruto);
  });

  it('Passiva II no nível 2 (A4): Resistência Bárbara +10% de HP vira +11%', () => {
    expect(calcularHpMax(200, { classeId: 'barbaro', nivel: 20 })).toBe(1100);
    expect(calcularHpMax(200, { classeId: 'barbaro', nivel: 20, ascensaoHabilidade: 3 })).toBe(1100);
    expect(calcularHpMax(200, { classeId: 'barbaro', nivel: 20, ascensaoHabilidade: 4 })).toBe(1110);
    expect(calcularHpMax(200, { classeId: 'barbaro', nivel: 20, ascensaoHabilidade: 9 })).toBe(1120);
  });

  it('Passiva I no nível 2 (A3): Muralha de Ferro e a passiva da subclasse (Casca de Pedra) sobem juntas', () => {
    // Colosso tier 1: Casca de Pedra +5% de Sobreescudo; Bárbaro 20+: Resistência Bárbara +5% (Passiva II)
    const opcoes = { classeId: 'barbaro', nivel: 20, subclasseAtualId: 'colosso', subclasseTiers: { colosso: 1 } };
    expect(calcularSobreescudoMax(100, opcoes)).toBe(220); // 200 × 110%
    expect(calcularSobreescudoMax(100, { ...opcoes, ascensaoHabilidade: 3 })).toBe(221); // 5,5% + 5%
    expect(calcularSobreescudoMax(100, { ...opcoes, ascensaoHabilidade: 4 })).toBe(222); // 5,5% + 5,5%
    const mods = obterModificadoresPassivaSubclasse({ subclasseAtualId: 'colosso', subclasseTiers: { colosso: 1 }, hp: 1, hpMax: 1, bonusNivelPercentual: 20 });
    expect(mods.bonusSobreescudoMaxPercentual).toBe(6);
  });

  it('Último Bastião (Passiva II do Cavaleiro) no nível 3: 15% vira 18%', () => {
    expect(calcularUltimoBastiao(10, 100, 20, 20).bonusDefesaFisicaPercentual).toBe(18);
    expect(calcularUltimoBastiao(10, 100, 20).bonusDefesaFisicaPercentual).toBe(15);
  });
});
