import { describe, it, expect } from 'vitest';
import { resolverCombate, Combatente } from '../combat';
import { MONSTERS } from '../../rules/monsters';
import { RACES, getRaceById } from '../../rules/races';
import { CLASSES, getClassById } from '../../rules/classes';
import { GAME_CONFIG } from '../../rules/config';
import { calcularHpMax, calcularSobreescudoMax } from '../index';
import { AttributeName, Attributes } from '../../rules/attributes';

/**
 * ORDEM 45 — Teste de Fotografia (Snapshot) do Motor de Combate
 *
 * Objetivo: Congelar e garantir que nenhuma refatoração altere logs, danos,
 * turnos ou resultados de combate.
 *
 * Regras fixas e documentadas para o combatente:
 * - Raças: 6 raças de Yggdrasil (humano, anao, elfo, orc, vampiro, draconiano).
 * - Draconiano usa linhagem 'fogo' obrigatoriamente.
 * - Classes: 6 classes (barbaro, cavaleiro, feiticeiro, bandido, profeta, samurai).
 * - Níveis: [1, 5, 12, 20, 30].
 * - Monstros: os 3 monstros cadastrados em MONSTERS (rato-da-peste, cultista-das-sombras, cavaleiro-do-vazio).
 *
 * Distribuição fixa de atributos:
 * 1. Base: GAME_CONFIG.VALOR_BASE_ATRIBUTOS (vigor: 2, mente: 2, demais 0).
 * 2. Bônus racial de cada raça (RACES).
 * 3. Bônus de classe de cada classe (CLASSES).
 * 4. Pontos iniciais de criação (10 pontos fixos):
 *    forca: 3, agilidade: 2, vigor: 2, vitalidade: 1, inteligencia: 1, mente: 1, arcano: 0.
 * 5. Pontos por nível (para níveis > 1, cada nível concede GAME_CONFIG.PONTOS_POR_NIVEL = 3 pontos):
 *    Total de pontos alocados: (nivel - 1) * 3, distribuídos ciclicamente na ordem:
 *    ['forca', 'agilidade', 'vigor', 'vitalidade', 'inteligencia', 'mente', 'arcano'].
 * 6. HP máximo e Sobreescudo máximo derivados com calcularHpMax e calcularSobreescudoMax.
 * 7. Seed fixa: 42 para todas as lutas.
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

const NIVEIS_TESTE = [1, 5, 12, 20, 30] as const;
const SEED_FIXA = 42;

function criarCombatenteTeste(racaId: string, classeId: string, nivel: number): Combatente {
  const raca = getRaceById(racaId);
  if (!raca) throw new Error(`Raça ${racaId} não encontrada`);

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

  const totalPontosLevelUp = (nivel - 1) * GAME_CONFIG.PONTOS_POR_NIVEL;
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

  const hpMax = calcularHpMax(atributosFinais.vigor, { classeId, nivel });
  const sobreescudo = calcularSobreescudoMax(atributosFinais.vitalidade, { classeId, nivel });

  return {
    nome: `${raca.nome} ${classe.nome}`,
    racaId: raca.id,
    classeId: classe.id,
    linhagem: raca.id === 'draconiano' ? 'fogo' : undefined,
    nivel,
    hp: hpMax,
    hpMax,
    sobreescudo,
    atributos: atributosFinais,
    ouro: 100,
    mitigacao: 0,
  };
}

describe('ORDEM 45 — Rede de Segurança do Combate (Snapshot das 540 Lutas)', () => {
  for (const monstro of MONSTERS) {
    it(`fotografia determinística contra ${monstro.nome} (${monstro.id})`, () => {
      const lutasMonstro: Array<{
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

      for (const raca of RACES) {
        for (const classe of CLASSES) {
          for (const nivel of NIVEIS_TESTE) {
            const combatente = criarCombatenteTeste(raca.id, classe.id, nivel);
            const resultado = resolverCombate(combatente, monstro, SEED_FIXA);

            lutasMonstro.push({
              cenario: `${raca.id} | ${classe.id} | nível ${nivel} vs ${monstro.id}`,
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
        }
      }

      // 6 raças * 6 classes * 5 níveis = 180 combates por monstro
      expect(lutasMonstro.length).toBe(180);
      expect(lutasMonstro).toMatchSnapshot();
    });
  }
});
