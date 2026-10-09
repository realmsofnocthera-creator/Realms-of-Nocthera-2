import { describe, it, expect } from 'vitest';
import { Combatente, turnoDeCombate } from '@/game/combat';
import { adicionarBuffs, avancarBuffs, bonusDanoDosBuffs, bonusDefesaDosBuffs } from '@/game/combate/efeitosBuffs';

/** 1.10.2 e 1.10.3 — Milagre Divino (+15% de dano e de defesa por 2 rodadas) e acúmulo de buffs (sem teto por enquanto). */

const milagre = { tipo: 'bonusDanoDefesa' as const, id: 'milagreDivino', danoPercentual: 15, defesaPercentual: 15, rodadas: 2 };
const furiaOrc = { tipo: 'bonusDano' as const, percentual: 10, tipoDano: 'fisico' as const, rodadas: 3 };

const ativar = (lista: ReturnType<typeof adicionarBuffs>) => lista.map((b) => ({ ...b, recemAplicado: false }));

describe('1.10.2 — acúmulo de buffs', () => {
  it('buffs diferentes empilham: Milagre Divino (+15%) com Fúria Orc (+10%) = +25% de dano físico', () => {
    const lista = ativar(adicionarBuffs(adicionarBuffs([], [milagre]), [furiaOrc]));
    expect(bonusDanoDosBuffs(lista, 'fisico')).toBe(25);
    expect(bonusDanoDosBuffs(lista, 'magico')).toBe(15); // a Fúria Orc só vale para dano físico
    expect(bonusDefesaDosBuffs(lista)).toBe(15);
  });

  it('o mesmo buff ativo de novo só renova (duração volta a 2, sem somar)', () => {
    let lista = ativar(adicionarBuffs([], [milagre]));
    lista = avancarBuffs(lista).buffs; // 1 rodada restante
    expect(lista[0].rodadasRestantes).toBe(1);
    lista = ativar(adicionarBuffs(lista, [milagre]));
    expect(lista).toHaveLength(1);
    expect(lista[0].rodadasRestantes).toBe(2);
    expect(bonusDanoDosBuffs(lista, 'magico')).toBe(15);
  });

  it('sem teto por enquanto: vários buffs somam sem limite', () => {
    const lista = ativar(adicionarBuffs([], [
      { ...milagre, id: 'a', danoPercentual: 60 },
      { ...milagre, id: 'b', danoPercentual: 60 },
    ]));
    expect(bonusDanoDosBuffs(lista, 'magico')).toBe(120);
  });

  it('dura 2 rodadas e expira', () => {
    let lista = adicionarBuffs([], [milagre]);
    lista = avancarBuffs(lista).buffs; // passa a valer
    lista = avancarBuffs(lista).buffs; // 1
    expect(lista).toHaveLength(1);
    lista = avancarBuffs(lista).buffs; // 0
    expect(lista).toHaveLength(0);
  });
});

describe('1.10.3 — Milagre Divino em combate', () => {
  const profeta = (extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Profeta', classeId: 'profeta', nivel: 30, hp: 500, hpMax: 1000, sobreescudo: 0,
    atributos: { vigor: 40, sorte: 0, forca: 1, vitalidade: 5, arcano: 0, inteligencia: 30, agilidade: 5 },
    contadorMilagreDivino: 6,
    ...extra,
  });
  const alvo = (): Combatente => ({
    nome: 'Alvo', hp: 100000, hpMax: 100000, sobreescudo: 0, mitigacao: 0,
    atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 5 },
  });

  it('no 7º ataque o Profeta ganha +15% de dano e de defesa por 2 rodadas', () => {
    const p = profeta();
    const atk = turnoDeCombate(p, alvo(), 1).turnoLog.ataques[0];
    expect(atk.habilidadeAcionada).toBe('Milagre Divino');
    const b = p.buffs?.find((x) => x.tipo === 'bonusDanoDefesa');
    expect(b).toMatchObject({ bonusDanoPercentual: 15, bonusDefesaPercentual: 15, rodadasRestantes: 2 });
  });

  it('o ataque seguinte causa mais dano (+15%) que o mesmo ataque sem o Milagre', () => {
    const comMilagre = profeta();
    turnoDeCombate(comMilagre, alvo(), 1);
    const depois = turnoDeCombate(comMilagre, alvo(), 2).turnoLog.ataques[0].danoBruto;
    const semBuff = turnoDeCombate(profeta({ contadorMilagreDivino: 0 }), alvo(), 1).turnoLog.ataques[0].danoBruto;
    expect(depois).toBeGreaterThan(semBuff);
  });
});
