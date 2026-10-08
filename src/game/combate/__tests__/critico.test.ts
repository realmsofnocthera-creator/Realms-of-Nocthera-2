import { describe, it, expect } from 'vitest';
import { Combatente, resolverCombate, turnoDeCombate } from '@/game/combat';
import { multiplicadorCritico, sorteioCritico } from '@/game/combate/critico';
import { calcularChanceCritico } from '@/game';
import { MONSTERS_MAP } from '@/rules/monsters';

/**
 * Sorte → crítico: chance = 2% + 0,1% por ponto de Sorte; cada golpe sorteia;
 * o crítico dobra o dano DEPOIS da defesa do alvo.
 */
const SEMPRE = () => 0; // sorteio 0 < qualquer chance → crítico
const NUNCA = () => 99.99; // sorteio acima de qualquer chance → normal

function atacante(parcial: Partial<Combatente> = {}): Combatente {
  return {
    nome: 'Herói',
    hp: 100,
    hpMax: 100,
    sobreescudo: 0,
    nivel: 1,
    atributos: { vigor: 20, sorte: 10, forca: 30, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
    ...parcial,
  };
}

function alvo(mitigacao: number): Combatente {
  return {
    nome: 'Alvo',
    hp: 1000,
    hpMax: 1000,
    sobreescudo: 0,
    mitigacao,
    atributos: { vigor: 200, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 100 },
  };
}

describe('Crítico (Sorte)', () => {
  it('chance = 2% + 0,1% por ponto: o sorteio crita só abaixo da chance', () => {
    const chance = calcularChanceCritico(10); // 3%
    expect(chance).toBe(3);
    expect(multiplicadorCritico(2.99, chance)).toBe(2);
    expect(multiplicadorCritico(3, chance)).toBe(1);
  });

  it('dobra o dano depois da defesa: 30 de dano − 10 de defesa = 20, crítico = 40', () => {
    const normal = turnoDeCombate(atacante(), alvo(10), 1, { sorteioCritico: NUNCA }).turnoLog.ataques[0];
    const critico = turnoDeCombate(atacante(), alvo(10), 1, { sorteioCritico: SEMPRE }).turnoLog.ataques[0];

    expect(normal.danoBruto).toBe(30);
    expect(normal.danoEfetivo).toBe(20);
    expect(normal.golpesCriticos).toBeUndefined();

    expect(critico.danoBruto).toBe(30); // o bruto não muda
    expect(critico.danoEfetivo).toBe(40); // (30 − 10) × 2, e não 30 × 2 − 10 = 50
    expect(critico.golpesCriticos).toBe(1);
    expect(critico.mensagem).toContain('CRÍTICO!');
  });

  it('o crítico tira o dobro do HP do alvo', () => {
    const alvoCritico = alvo(10);
    turnoDeCombate(atacante(), alvoCritico, 1, { sorteioCritico: SEMPRE });
    expect(alvoCritico.hp).toBe(1000 - 40);
  });

  it('sem sorteio (chamada direta do turno) não há crítico', () => {
    const atk = turnoDeCombate(atacante(), alvo(10), 1).turnoLog.ataques[0];
    expect(atk.danoEfetivo).toBe(20);
    expect(atk.golpesCriticos).toBeUndefined();
  });

  it('golpes múltiplos sorteiam um por um (Rajada do Bandido: só o 2º golpe crita)', () => {
    const bandido = atacante({
      classeId: 'bandido',
      nivel: 5,
      contadorRajadaGolpes: 2, // este ataque é a Rajada (2 golpes de 80%)
    });
    const atk = turnoDeCombate(bandido, alvo(10), 1, {
      sorteioCritico: (_idx, golpe) => (golpe === 1 ? 0 : 99.99),
    }).turnoLog.ataques[0];

    expect(atk.habilidadeAcionada).toBe('Rajada de Golpes');
    expect(atk.golpes).toEqual([24, 24]); // 80% de 30
    // 1º golpe: 24 − 10 = 14; 2º golpe crítico: (24 − 10) × 2 = 28
    expect(atk.danoEfetivo).toBe(14 + 28);
    expect(atk.golpesCriticos).toBe(1);
  });

  it('Cavaleiro defendendo: o crítico dobra o que passa pela defesa dele', () => {
    const cavaleiro: Combatente = {
      ...alvo(0),
      classeId: 'cavaleiro',
      nivel: 1,
      atributos: { ...alvo(0).atributos, vitalidade: 10 }, // defesa física 10
    };
    const normal = turnoDeCombate(atacante(), { ...cavaleiro }, 1, { sorteioCritico: NUNCA }).turnoLog.ataques[0];
    const critico = turnoDeCombate(atacante(), { ...cavaleiro }, 1, { sorteioCritico: SEMPRE }).turnoLog.ataques[0];
    expect(critico.danoEfetivo).toBe(normal.danoEfetivo * 2);
  });

  it('cura (Bênção Divina) nunca crita', () => {
    const profeta = atacante({ classeId: 'profeta', nivel: 5, hp: 20, contadorBencaoDivina: 2 });
    const atk = turnoDeCombate(profeta, alvo(0), 1, { sorteioCritico: SEMPRE }).turnoLog.ataques[0];
    expect(atk.habilidadeAcionada).toBe('Bênção Divina');
    expect(atk.curaHp).toBe(15);
    expect(atk.golpesCriticos).toBeUndefined();
  });

  describe('no combate completo', () => {
    const heroi = atacante({ hp: 500, hpMax: 500 });
    const monstro = MONSTERS_MAP['cavaleiro-do-vazio'];

    it('é determinístico: a mesma semente dá a mesma luta', () => {
      expect(resolverCombate(heroi, monstro, 777)).toEqual(resolverCombate(heroi, monstro, 777));
    });

    it('rngCritico força crítico nos dois lados', () => {
      const r = resolverCombate(heroi, monstro, 777, { rngCritico: SEMPRE });
      const ataques = r.logTurnos.flatMap((t) => t.ataques);
      expect(ataques.every((a) => a.golpesCriticos === 1)).toBe(true);
    });

    it('personagem e monstro sorteiam separados na mesma rodada', () => {
      const valores = new Set<number>();
      for (let rodada = 1; rodada <= 20; rodada++) {
        expect(sorteioCritico(777, rodada, 0, 0, 'personagem')).not.toBe(
          sorteioCritico(777, rodada, 0, 0, 'monstro')
        );
        valores.add(sorteioCritico(777, rodada, 0, 0, 'personagem'));
      }
      expect(valores.size).toBeGreaterThan(15);
    });

    it('em muitas lutas, a taxa de crítico fica perto da chance (3% com Sorte 10)', () => {
      let golpes = 0;
      let criticos = 0;
      for (let seed = 1; seed <= 400; seed++) {
        const r = resolverCombate(heroi, monstro, seed);
        for (const a of r.logTurnos.flatMap((t) => t.ataques)) {
          if (a.atacante !== heroi.nome || !a.danoEfetivo) continue;
          golpes++;
          criticos += a.golpesCriticos ?? 0;
        }
      }
      const taxa = (100 * criticos) / golpes;
      expect(golpes).toBeGreaterThan(1000);
      expect(taxa).toBeGreaterThan(1.5);
      expect(taxa).toBeLessThan(4.5);
    });
  });
});
