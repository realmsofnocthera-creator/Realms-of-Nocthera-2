import { describe, it, expect } from 'vitest';
import { Combatente, turnoDeCombate } from '@/game/combat';
import { CLASSES } from '@/rules/classes';

/** A Vitalidade reduz o dano recebido de TODAS as classes (1 ponto = 1 de Defesa Física), não só do Cavaleiro. */
const atacante = (): Combatente => ({
  nome: 'Atacante', hp: 5000, hpMax: 5000, sobreescudo: 0,
  atributos: { vigor: 100, sorte: 0, forca: 80, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
});
const defensor = (classeId: string, vitalidade: number): Combatente => ({
  nome: `Defensor ${classeId}`, classeId, nivel: 1, hp: 5000, hpMax: 5000, sobreescudo: 0,
  atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade, arcano: 0, inteligencia: 0, agilidade: 1 },
});
const danoContra = (classeId: string, vitalidade: number) => turnoDeCombate(atacante(), defensor(classeId, vitalidade), 1).turnoLog.ataques[0].danoEfetivo;

describe('Vitalidade reduz o dano em todas as classes', () => {
  for (const c of CLASSES) {
    it(`${c.id}: 20 de Vitalidade tiram 20 do dano de um golpe físico`, () => {
      expect(danoContra(c.id, 0) - danoContra(c.id, 20)).toBe(20);
    });
  }

  it('o monstro (sem classe) não ganha defesa a mais pela Vitalidade dele: a DEF dele já vem pronta', () => {
    const m = (v: number): Combatente => ({ nome: 'Monstro', hp: 5000, hpMax: 5000, sobreescudo: 0, mitigacao: 7, atributos: { vigor: 1, sorte: 0, forca: 1, vitalidade: v, arcano: 0, inteligencia: 0, agilidade: 1 } });
    expect(turnoDeCombate(atacante(), m(0), 1).turnoLog.ataques[0].danoEfetivo).toBe(turnoDeCombate(atacante(), m(50), 1).turnoLog.ataques[0].danoEfetivo);
  });
});
