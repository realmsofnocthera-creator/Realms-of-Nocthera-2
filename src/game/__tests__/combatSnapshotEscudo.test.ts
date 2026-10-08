import { describe, it, expect } from 'vitest';
import { resolverCombate, Combatente } from '../combat';
import { MonsterDefinition } from '../../rules/monsters';
import { getRaceById } from '../../rules/races';
import { CLASSES, getClassById } from '../../rules/classes';
import { GAME_CONFIG } from '../../rules/config';
import { calcularHpMax, calcularSobreescudoMax } from '../index';
import { AttributeName, Attributes } from '../../rules/attributes';

/**
 * ORDEM 46A — Reforço do Snapshot do Motor de Combate (Monstro Sintético de Alta Vitalidade)
 *
 * Objetivo:
 * Congelar a execução determinística do nível 30 das 6 classes (raça Humano)
 * contra um Monstro Sintético de HP muito elevado e alta Vitalidade, com seed fixa 42.
 */

const PONTOS_INICIAIS_FIXOS: Attributes = {
  forca: 3,
  agilidade: 2,
  vigor: 2,
  vitalidade: 1,
  inteligencia: 1,
  mente: 1,
  arcano: 0,
};

const CICLO_ATRIBUTOS: readonly AttributeName[] = [
  'forca',
  'agilidade',
  'vigor',
  'vitalidade',
  'inteligencia',
  'mente',
  'arcano',
];

const SEED_FIXA = 42;
const NIVEL_TESTE = 30;

/**
 * Monstro Sintético com Vitalidade alta e HP massivo para garantir múltiplos
 * ciclos de rotação de habilidades especiais e ultimates (nível 30).
 */
const MONSTRO_SINTETICO_ESCUDO: MonsterDefinition = {
  id: 'monstro-sintetico-escudo',
  nome: 'Guardião Ancestral Blindado',
  nivel: 30,
  hp: 25000,
  atributos: {
    vigor: 80,
    mente: 30,
    forca: 50,
    vitalidade: 150, // Vitalidade alta
    arcano: 20,
    inteligencia: 20,
    agilidade: 12,
  },
  xpConcedido: 2000,
  ouroConcedido: {
    min: 100,
    max: 300,
  },
};

function criarCombatenteTeste(classeId: string): Combatente {
  const raca = getRaceById('humano');
  if (!raca) throw new Error('Raça humano não encontrada');

  const classe = getClassById(classeId);
  if (!classe) throw new Error(`Classe ${classeId} não encontrada`);

  const pontosNivel: Attributes = {
    forca: 0,
    agilidade: 0,
    vigor: 0,
    vitalidade: 0,
    inteligencia: 0,
    mente: 0,
    arcano: 0,
  };

  const totalPontosLevelUp = (NIVEL_TESTE - 1) * GAME_CONFIG.PONTOS_POR_NIVEL;
  for (let i = 0; i < totalPontosLevelUp; i++) {
    const attr = CICLO_ATRIBUTOS[i % CICLO_ATRIBUTOS.length];
    pontosNivel[attr] += 1;
  }

  const atributosFinais: Attributes = {
    vigor:
      GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vigor +
      raca.bonusAtributos.vigor +
      classe.bonusAtributos.vigor +
      PONTOS_INICIAIS_FIXOS.vigor +
      pontosNivel.vigor,
    mente:
      GAME_CONFIG.VALOR_BASE_ATRIBUTOS.mente +
      raca.bonusAtributos.mente +
      classe.bonusAtributos.mente +
      PONTOS_INICIAIS_FIXOS.mente +
      pontosNivel.mente,
    forca:
      GAME_CONFIG.VALOR_BASE_ATRIBUTOS.forca +
      raca.bonusAtributos.forca +
      classe.bonusAtributos.forca +
      PONTOS_INICIAIS_FIXOS.forca +
      pontosNivel.forca,
    vitalidade:
      GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vitalidade +
      raca.bonusAtributos.vitalidade +
      classe.bonusAtributos.vitalidade +
      PONTOS_INICIAIS_FIXOS.vitalidade +
      pontosNivel.vitalidade,
    arcano:
      GAME_CONFIG.VALOR_BASE_ATRIBUTOS.arcano +
      raca.bonusAtributos.arcano +
      classe.bonusAtributos.arcano +
      PONTOS_INICIAIS_FIXOS.arcano +
      pontosNivel.arcano,
    inteligencia:
      GAME_CONFIG.VALOR_BASE_ATRIBUTOS.inteligencia +
      raca.bonusAtributos.inteligencia +
      classe.bonusAtributos.inteligencia +
      PONTOS_INICIAIS_FIXOS.inteligencia +
      pontosNivel.inteligencia,
    agilidade:
      GAME_CONFIG.VALOR_BASE_ATRIBUTOS.agilidade +
      raca.bonusAtributos.agilidade +
      classe.bonusAtributos.agilidade +
      PONTOS_INICIAIS_FIXOS.agilidade +
      pontosNivel.agilidade,
  };

  const hpMax = calcularHpMax(atributosFinais.vigor, { classeId, nivel: NIVEL_TESTE });
  const sobreescudo = calcularSobreescudoMax(atributosFinais.vitalidade, { classeId, nivel: NIVEL_TESTE });

  return {
    nome: `${raca.nome} ${classe.nome}`,
    racaId: raca.id,
    classeId: classe.id,
    nivel: NIVEL_TESTE,
    hp: hpMax,
    hpMax,
    sobreescudo,
    atributos: atributosFinais,
    ouro: 100,
    mitigacao: 0,
  };
}

describe('ORDEM 46A — Snapshot de Combate contra Monstro Sintético Blindado', () => {
  it('fotografia determinística das 6 classes (nível 30, Humano) vs Guardião Ancestral Blindado', () => {
    const lutasSnapshot: Array<{
      cenario: string;
      vencedor: 'personagem' | 'monstro';
      xpGanho: number;
      ouroGanho: number;
      ouroPerdido: number;
      personagemFinal: {
        hp: number;
        hpMax: number;
        mana: number;
        manaMax: number;
        ouro: number;
      };
      totalTurnos: number;
      mensagens: string[];
      logTurnos: unknown[];
    }> = [];

    for (const classe of CLASSES) {
      const combatente = criarCombatenteTeste(classe.id);
      const resultado = resolverCombate(combatente, MONSTRO_SINTETICO_ESCUDO, SEED_FIXA);

      lutasSnapshot.push({
        cenario: `humano | ${classe.id} | nível ${NIVEL_TESTE} vs ${MONSTRO_SINTETICO_ESCUDO.id}`,
        vencedor: resultado.vencedor,
        xpGanho: resultado.xpGanho,
        ouroGanho: resultado.ouroGanho,
        ouroPerdido: resultado.ouroPerdido,
        personagemFinal: resultado.personagemFinal,
        totalTurnos: resultado.logTurnos.length,
        mensagens: resultado.mensagens,
        logTurnos: resultado.logTurnos,
      });
    }

    expect(lutasSnapshot.length).toBe(6);
    expect(lutasSnapshot).toMatchSnapshot();
  });
});
