import { Combatente, resolverCombate, type ResultadoCombate } from '@/game/combat';
import { xpParaProximoNivel } from '@/game';
import { MONSTROS_CACADA_MAP } from '@/rules/cacada';
import { GAME_CONFIG } from '@/rules/config';
import type { MonsterDefinition } from '@/rules/monsters';
import { carregarPersonagem, combatenteDoPersonagem, salvarPersonagem, type CharacterDocument } from '@/server/characterService';
import { repositorio } from '@/server/persistencia';

/**
 * A introdução do jogo, logo depois de criar o personagem: depois do vídeo, uma luta contra um lobo que o jogador SEMPRE vence (o XP dela leva
 * direto ao nível 2) e, em seguida, uma criatura de 9★ que o derrota (cena roteirizada, sem perda de ouro nem de nada). Vale uma vez por personagem
 * (`introConcluida`). Uma só gravação no documento do personagem; as duas lutas são calculadas na hora e não são gravadas.
 */
export class ErroDaIntro extends Error {
  readonly status: 404 | 409;
  constructor(mensagem: string, status: 404 | 409 = 409) {
    super(mensagem);
    this.name = 'ErroDaIntro';
    this.status = status;
  }
}

export const MONSTRO_DA_INTRO = 'lobo-cinzento';
export const CRIATURA_DE_9_ESTRELAS_DA_INTRO = 'urdumor';

export interface RespostaDaIntro {
  /** A luta contra o lobo (o personagem vence). */
  vitoria: ResultadoCombate;
  /** A luta contra a criatura de 9★ (o personagem cai). */
  derrota: ResultadoCombate;
  /** O XP da vitória (o necessário para o nível 2). */
  xpGanho: number;
  levelUps: number;
  character: CharacterDocument;
  loboId: string;
  criaturaId: string;
}

const ATRIBUTOS_DE_COMBATE = ['forca', 'inteligencia', 'arcano', 'agilidade', 'vitalidade', 'sorte'] as const;

/**
 * A luta do lobo, com o resultado garantido: se a ficha pura não vence, o combatente ganha força (só atributos; a vida fica como é, para as barras da
 * tela baterem com o personagem) até vencer, e a semente muda a cada tentativa.
 */
export function vitoriaGarantida(c: Combatente, monstro: MonsterDefinition, seedBase: number): ResultadoCombate {
  for (let fator = 1; fator <= 4096; fator *= 2) {
    for (let t = 0; t < 4; t++) {
      const forte = structuredClone(c);
      if (fator > 1) for (const a of ATRIBUTOS_DE_COMBATE) forte.atributos[a] = Math.max(1, Math.round((forte.atributos[a] || 1) * fator));
      const r = resolverCombate(forte, structuredClone(monstro), seedBase + t * 7919 + fator);
      if (r.vencedor === 'personagem') return r;
    }
  }
  // último recurso (não deve acontecer): o lobo cai com 1 de vida
  return resolverCombate(structuredClone(c), { ...structuredClone(monstro), hp: 1, sobreescudoInicial: 0 }, seedBase);
}

/** A luta da criatura de 9★, com a derrota garantida (a criatura é de nível 30; o personagem, de nível 1). */
export function derrotaGarantida(c: Combatente, monstro: MonsterDefinition, seedBase: number): ResultadoCombate {
  for (let t = 0; t < 8; t++) {
    const r = resolverCombate(structuredClone(c), structuredClone(monstro), seedBase + t * 104729);
    if (r.vencedor === 'monstro') return r;
  }
  const forte = structuredClone(monstro);
  forte.atributos = { ...forte.atributos, forca: forte.atributos.forca * 100 };
  return resolverCombate(structuredClone(c), forte, seedBase);
}

export async function executarIntro(uid: string, seed: number): Promise<RespostaDaIntro> {
  const lobo = MONSTROS_CACADA_MAP[MONSTRO_DA_INTRO];
  const criatura = MONSTROS_CACADA_MAP[CRIATURA_DE_9_ESTRELAS_DA_INTRO];
  if (!lobo || !criatura) throw new ErroDaIntro('A introdução não está disponível.', 404);
  return repositorio.executarTransacao('intro', async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    if (eu.introConcluida) throw new ErroDaIntro('Você já viveu a introdução.');
    if (eu.nivel !== 1) throw new ErroDaIntro('A introdução é só para quem acabou de criar o personagem.');
    const combatente = combatenteDoPersonagem(eu);
    const vitoria = vitoriaGarantida(combatente, lobo, seed);
    const derrota = derrotaGarantida(combatente, criatura, seed + 1);
    // o XP da vitória leva exatamente ao nível 2 (o que sobrar do XP que o personagem já tinha fica)
    const necessario = xpParaProximoNivel(1);
    const xpGanho = Math.max(0, necessario - eu.xpAtual);
    vitoria.xpGanho = xpGanho;
    vitoria.ouroGanho = 0;
    derrota.xpGanho = 0;
    derrota.ouroGanho = 0;
    const character = salvarPersonagem(ctx, eu, {
      nivel: 2,
      xpAtual: eu.xpAtual + xpGanho - necessario,
      pontosDisponiveis: eu.pontosDisponiveis + GAME_CONFIG.PONTOS_POR_NIVEL,
      introConcluida: true,
    });
    return { vitoria, derrota, xpGanho, levelUps: 1, character, loboId: lobo.id, criaturaId: criatura.id };
  });
}
