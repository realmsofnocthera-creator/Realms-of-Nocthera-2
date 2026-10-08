import { describe, it, expect } from 'vitest';
import { resolverCombate, Combatente } from '@/game/combat';
import { MonsterDefinition } from '@/rules/monsters';
import { getRaceById } from '@/rules/races';
import { CLASSES, getClassById } from '@/rules/classes';
import { GAME_CONFIG } from '@/rules/config';
import { calcularHpMax, calcularSobreescudoMax } from '@/game/index';
import { AttributeName, Attributes } from '@/rules/attributes';

/**
 * ORDEM 48C.1 — Snapshot de Ultimates do Motor de Combate (7º Ataque Básico)
 *
 * Objetivo:
 * Congelar a execução determinística dos primeiros 10 ataques básicos das 6 classes (nível 30, Humano)
 * contra um Monstro Sintético de HP muito elevado (100.000) e Força 0, garantindo o acionamento
 * real da Ultimate de cada classe no 7º ataque básico e protegendo refatorações futuras em combat.ts.
 */

const PONTOS_INICIAIS_FIXOS: Attributes = {
  forca: 3,
  agilidade: 2,
  vigor: 2,
  vitalidade: 1,
  inteligencia: 1,
  sorte: 1,
  arcano: 0,
};

const CICLO_ATRIBUTOS: readonly AttributeName[] = [
  'forca',
  'agilidade',
  'vigor',
  'vitalidade',
  'inteligencia',
  'sorte',
  'arcano',
];

const SEED_FIXA = 42;
const NIVEL_TESTE = 30;

/**
 * Monstro sintético definido dentro do próprio teste com HP muito alto (100.000)
 * e Força 0 para garantir que a luta dure o suficiente e o jogador nunca morra antes do 7º ataque.
 */
const MONSTRO_SINTETICO_ULTIMATE: MonsterDefinition = {
  id: 'monstro-sintetico-ultimate',
  nome: 'Colosso de Treino Eterno',
  nivel: 30,
  hp: 100000,
  atributos: {
    vigor: 100,
    sorte: 10,
    forca: 0,
    vitalidade: 10,
    arcano: 0,
    inteligencia: 0,
    agilidade: 1,
  },
  xpConcedido: 1000,
  ouroConcedido: {
    min: 50,
    max: 50,
  },
};

const ULTIMATES_POR_CLASSE: Record<string, string> = {
  barbaro: 'Ira do Bárbaro',
  cavaleiro: 'Juramento do Guardião',
  feiticeiro: 'Cataclismo Arcano',
  bandido: 'Dança das Lâminas',
  profeta: 'Milagre Divino',
  samurai: 'Corte do Vazio',
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
    sorte: 0,
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
    sorte:
      GAME_CONFIG.VALOR_BASE_ATRIBUTOS.sorte +
      raca.bonusAtributos.sorte +
      classe.bonusAtributos.sorte +
      PONTOS_INICIAIS_FIXOS.sorte +
      pontosNivel.sorte,
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

describe('ORDEM 48C.1 — Snapshot de Ultimates do Motor de Combate (7º Ataque Básico)', () => {
  it('fotografia determinística dos 10 primeiros ataques básicos das 6 classes (nível 30) acionando suas ultimates', () => {
    const snapshotUltimates = CLASSES.map((classe) => {
      const combatente = criarCombatenteTeste(classe.id);
      const resultado = resolverCombate(combatente, MONSTRO_SINTETICO_ULTIMATE, SEED_FIXA);

      // Captura o log completo dos primeiros 10 ataques básicos do jogador
      const ataquesJogador = resultado.logTurnos
        .flatMap((turno) => turno.ataques)
        .filter((atk) => atk.atacante === combatente.nome)
        .slice(0, 10);

      expect(ataquesJogador.length).toBe(10);

      const ultimateEsperada = ULTIMATES_POR_CLASSE[classe.id];
      expect(ultimateEsperada).toBeDefined();

      // Asserção explícita de que o log contém o evento da ultimate de cada classe
      const ataqueUltimate = ataquesJogador.find(
        (atk) => atk.habilidadeAcionada === ultimateEsperada
      );
      expect(ataqueUltimate).toBeDefined();
      expect(ataqueUltimate?.habilidadeAcionada).toBe(ultimateEsperada);

      // Índice do ataque da ultimate (esperado: 7º ataque básico, índice 1-based = 7)
      const indiceAtaque =
        ataquesJogador.findIndex((atk) => atk.habilidadeAcionada === ultimateEsperada) + 1;
      expect(indiceAtaque).toBe(7);

      return {
        cenario: `humano | ${classe.id} | nível ${NIVEL_TESTE} vs ${MONSTRO_SINTETICO_ULTIMATE.id}`,
        classeId: classe.id,
        classeNome: classe.nome,
        ultimateEsperada,
        indiceAtaqueUltimate: indiceAtaque,
        primeiros10AtaquesBasicos: ataquesJogador,
      };
    });

    expect(snapshotUltimates.length).toBe(6);
    expect(snapshotUltimates).toMatchSnapshot();
  });
});
