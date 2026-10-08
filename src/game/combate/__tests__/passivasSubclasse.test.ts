import { describe, it, expect, beforeEach } from 'vitest';
import { Combatente, turnoDeCombate } from '../../combat';
import { MONSTERS_MAP } from '../../../rules/monsters';
import {
  obterModificadoresPassivaSubclasse,
  registrarHabilidadesDeSubclasse,
} from '../habilidades';
import { reduzirDanoPercentual } from '../efeitos';

describe('ORDEM 48D — Passivas de Subclasse (Frenesi e Casca de Pedra)', () => {
  beforeEach(() => {
    registrarHabilidadesDeSubclasse();
  });

  describe('1. Testes Puros dos Modificadores de Passiva', () => {
    it('Frenesi — Cálculo exato por percentual de HP perdido (teto 20%)', () => {
      // HP 100% -> 0% de bônus
      const m100 = obterModificadoresPassivaSubclasse({
        subclasseAtualId: 'berserker',
        subclasseTiers: { berserker: 1 },
        hp: 100,
        hpMax: 100,
      });
      expect(m100.bonusDanoFisicoPercentual).toBe(0);

      // HP 95% -> 5% perdido -> 1% de bônus
      const m95 = obterModificadoresPassivaSubclasse({
        subclasseAtualId: 'berserker',
        subclasseTiers: { berserker: 1 },
        hp: 95,
        hpMax: 100,
      });
      expect(m95.bonusDanoFisicoPercentual).toBe(1);

      // HP 50% -> 50% perdido -> 10% de bônus
      const m50 = obterModificadoresPassivaSubclasse({
        subclasseAtualId: 'berserker',
        subclasseTiers: { berserker: 1 },
        hp: 50,
        hpMax: 100,
      });
      expect(m50.bonusDanoFisicoPercentual).toBe(10);

      // HP 20% -> 80% perdido -> 16% de bônus
      const m20 = obterModificadoresPassivaSubclasse({
        subclasseAtualId: 'berserker',
        subclasseTiers: { berserker: 1 },
        hp: 20,
        hpMax: 100,
      });
      expect(m20.bonusDanoFisicoPercentual).toBe(16);

      // HP 1 de 100 -> 99% perdido -> floor(99 / 5) = 19% de bônus
      const m1 = obterModificadoresPassivaSubclasse({
        subclasseAtualId: 'berserker',
        subclasseTiers: { berserker: 1 },
        hp: 1,
        hpMax: 100,
      });
      expect(m1.bonusDanoFisicoPercentual).toBe(19);

      // Demais campos zerados no Frenesi
      expect(m50.reducaoDanoFisicoRecebidoPercentual).toBe(0);
      expect(m50.bonusSobreescudoMaxPercentual).toBe(0);
    });

    it('Frenesi — Retorna zeros se não tiver tier 1, se subclasse for incorreta ou nula', () => {
      // Tier 0
      const tier0 = obterModificadoresPassivaSubclasse({
        subclasseAtualId: 'berserker',
        subclasseTiers: { berserker: 0 },
        hp: 50,
        hpMax: 100,
      });
      expect(tier0.bonusDanoFisicoPercentual).toBe(0);

      // Subclasse errada
      const outraSubclasse = obterModificadoresPassivaSubclasse({
        subclasseAtualId: 'subclasse_desconhecida',
        subclasseTiers: { subclasse_desconhecida: 1 },
        hp: 50,
        hpMax: 100,
      });
      expect(outraSubclasse.bonusDanoFisicoPercentual).toBe(0);

      // Sem subclasse
      const semSubclasse = obterModificadoresPassivaSubclasse({
        subclasseAtualId: null,
        hp: 50,
        hpMax: 100,
      });
      expect(semSubclasse.bonusDanoFisicoPercentual).toBe(0);
    });

    it('Casca de Pedra — Tier 1 retorna 8% de redução e 5% de bônus de sobreescudo máx', () => {
      const colosso = obterModificadoresPassivaSubclasse({
        subclasseAtualId: 'colosso',
        subclasseTiers: { colosso: 1 },
        hp: 100,
        hpMax: 100,
      });
      expect(colosso.reducaoDanoFisicoRecebidoPercentual).toBe(8);
      expect(colosso.bonusSobreescudoMaxPercentual).toBe(5);
      expect(colosso.bonusDanoFisicoPercentual).toBe(0);
    });
  });

  describe('2. Testes de Integração no Motor (turnoDeCombate)', () => {
    it('Berserker Tier 1 com HP em 50% dá +10% no primeiro ataque físico em relação ao caso sem subclasse', () => {
      const defensor: Combatente = {
        nome: 'Alvo Robusto',
        hp: 500,
        hpMax: 500,
        sobreescudo: 0,
        mitigacao: 0,
        atributos: {
          vigor: 50,
          mente: 0,
          forca: 1,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 5,
        },
      };

      // Bárbaro nível 5 (ainda não tem Instinto de Sobrevivência que entra no nível 12),
      // Força 20 -> dano físico base = 20.
      const baseAtacante: Combatente = {
        nome: 'Bárbaro Nv5',
        classeId: 'barbaro',
        nivel: 5,
        hp: 50,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 0,
          forca: 20,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 10,
        },
      };

      // 1. Sem subclasse
      const tSemSubclasse = turnoDeCombate({ ...baseAtacante }, { ...defensor }, 1);
      const atkSemSubclasse = tSemSubclasse.turnoLog.ataques[0];
      expect(atkSemSubclasse.danoBruto).toBe(20);
      expect(atkSemSubclasse.danoEfetivo).toBe(20);

      // 2. Com Berserker Tier 1 e HP em 50% -> +10% de dano
      // danoBruto esperado = ceil(20 * 110 / 100) = 22
      const atacanteBerserkerTier1: Combatente = {
        ...baseAtacante,
        subclasseAtualId: 'berserker',
        subclasseTiers: { berserker: 1 },
      };
      const tTier1 = turnoDeCombate(atacanteBerserkerTier1, { ...defensor }, 1);
      const atkTier1 = tTier1.turnoLog.ataques[0];
      expect(atkTier1.danoBruto).toBe(22);
      expect(atkTier1.danoEfetivo).toBe(22);

      // 3. Com Berserker Tier 0 e HP em 50% -> sem bônus (igual a sem subclasse)
      const atacanteBerserkerTier0: Combatente = {
        ...baseAtacante,
        subclasseAtualId: 'berserker',
        subclasseTiers: { berserker: 0 },
      };
      const tTier0 = turnoDeCombate(atacanteBerserkerTier0, { ...defensor }, 1);
      const atkTier0 = tTier0.turnoLog.ataques[0];
      expect(atkTier0.danoBruto).toBe(20);
      expect(atkTier0.danoEfetivo).toBe(20);
    });

    it('Colosso Tier 1 defendendo contra dano físico aplica redução de 8%', () => {
      // Atacante com golpe físico de 50 de dano bruto
      const atacanteFisico: Combatente = {
        nome: 'Golias Físico',
        hp: 500,
        hpMax: 500,
        sobreescudo: 0,
        atributos: {
          vigor: 50,
          mente: 0,
          forca: 50,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 8, // ataca uma vez (8 < 5 * 2)
        },
      };

      // Defensor Bárbaro com Colosso Tier 1
      const defensorColosso: Combatente = {
        nome: 'Defensor Colosso',
        classeId: 'barbaro',
        nivel: 30,
        hp: 200,
        hpMax: 200,
        sobreescudo: 0,
        mitigacao: 0,
        subclasseAtualId: 'colosso',
        subclasseTiers: { colosso: 1 },
        atributos: {
          vigor: 40,
          mente: 0,
          forca: 10,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 5,
        },
      };

      // Dano físico bruto inicial = 50.
      // Com redução de 8% da Casca de Pedra:
      // reduzirDanoPercentual(50, 8) = floor(50 * 92 / 100) = floor(46) = 46.
      const danoEsperado = reduzirDanoPercentual(50, 8);
      expect(danoEsperado).toBe(46);

      const t = turnoDeCombate(atacanteFisico, defensorColosso, 1);
      const atkMonstro = t.turnoLog.ataques[0];
      expect(atkMonstro.danoBruto).toBe(46);
      expect(atkMonstro.danoEfetivo).toBe(46);
      expect(defensorColosso.hp).toBe(200 - 46);
    });

    it('Colosso Tier 1 defendendo contra dano mágico (Cultista) não sofre redução de 8%', () => {
      const cultista = MONSTERS_MAP['cultista-das-sombras'];
      expect(cultista).toBeDefined();

      const atacanteMagico: Combatente = {
        nome: cultista.nome,
        hp: cultista.hp,
        hpMax: cultista.hp,
        sobreescudo: 0,
        atributos: cultista.atributos,
      };

      const defensorColosso: Combatente = {
        nome: 'Defensor Colosso',
        classeId: 'barbaro',
        nivel: 30,
        hp: 200,
        hpMax: 200,
        sobreescudo: 0,
        mitigacao: 0,
        subclasseAtualId: 'colosso',
        subclasseTiers: { colosso: 1 },
        atributos: {
          vigor: 40,
          mente: 0,
          forca: 10,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 1, // Cultista ataca primeiro
        },
      };

      // Cultista usa dano mágico (Inteligência 4 = dano base 4)
      const t = turnoDeCombate(atacanteMagico, defensorColosso, 1);
      const atkCultista = t.turnoLog.ataques[0];
      // Dano mágico de 4 não sofre redução física de 8%
      expect(atkCultista.danoBruto).toBe(4);
      expect(atkCultista.danoEfetivo).toBe(4);
    });
  });
});
