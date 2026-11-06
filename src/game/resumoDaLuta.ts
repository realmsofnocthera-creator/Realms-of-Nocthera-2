import type { ResultadoCombate, ResultadoCombatePvp } from './combat';
import { CONTADOR_DO_ELEMENTO, type Contador } from '@/rules/conquistas';
import type { Elemento } from '@/rules/elements';

/**
 * O que uma luta vencida conta para as Conquistas de Monstros: o monstro (id e elementos de ataque), o dano e os
 * golpes críticos do personagem, os status que ele aplicou e se terminou sem perder vida ou no limite.
 */
export interface DetalheDaVitoria {
  monstroId?: string;
  /** Os elementos de ataque do monstro (um, ou dois nas subespécies de dois elementos). */
  elementos: readonly Elemento[];
  /** Em combates de verdade; sem isso (monstro desconhecido) só o dano e os críticos contam. */
  contadores: Partial<Record<Contador, number>>;
}

/** No limite: a luta acabou com menos desta % da vida máxima. */
export const LIMITE_DA_VIDA_NO_LIMITE_PERCENTUAL = 10;

export function detalheDaVitoria(
  resultado: ResultadoCombate,
  nomeDoPersonagem: string,
  monstro?: { id: string; elementoAtaque?: Elemento; elementoAlternado?: Elemento },
): DetalheDaVitoria {
  let dano = 0;
  let criticos = 0;
  let status = 0;
  let perdeuVida = false;
  for (const turno of resultado.logTurnos) {
    for (const a of turno.ataques) {
      if (a.atacante === nomeDoPersonagem) {
        dano += Math.max(0, a.danoEfetivo ?? 0);
        criticos += a.golpesCriticos ?? 0;
      } else if (a.defensor === nomeDoPersonagem && (a.danoEfetivo ?? 0) > 0) {
        perdeuVida = true;
      }
    }
    for (const e of turno.eventosEfeitos ?? []) {
      if (e.tipo === 'aplicado' && e.alvo !== undefined && e.alvo !== nomeDoPersonagem) status++;
      // dano contínuo (sangramento, veneno…) no personagem também é perder vida
      if (e.tipo === 'dano' && (e.dano ?? 0) > 0 && (e.alvo === undefined || e.alvo === nomeDoPersonagem)) perdeuVida = true;
    }
  }
  const { hp, hpMax } = resultado.personagemFinal;
  const elementos = [...new Set([monstro?.elementoAtaque, monstro?.elementoAlternado].filter((e): e is Elemento => !!e))];
  const contadores: Partial<Record<Contador, number>> = {
    danoCausado: dano,
    golpesCriticos: criticos,
    statusAplicados: status,
    ...(!perdeuVida ? { vitoriasVidaCheia: 1 } : {}),
    ...(hpMax > 0 && (hp / hpMax) * 100 < LIMITE_DA_VIDA_NO_LIMITE_PERCENTUAL ? { vitoriasNoLimite: 1 } : {}),
  };
  for (const el of elementos) contadores[CONTADOR_DO_ELEMENTO[el]] = 1;
  return { ...(monstro ? { monstroId: monstro.id } : {}), elementos, contadores };
}

/**
 * O que uma luta de PvP (Arena e Arena ranqueada) conta para quem atacou: lutas, vitórias, dano, viradas (vencer com
 * menos de 10% de vida), vitórias contra nível maior, a vocação derrotada e a sequência de vitórias. A sequência é
 * um valor (não uma soma): volta a 0 na derrota ou no empate.
 */
export interface ResumoDoPvp {
  ganhos: Partial<Record<Contador, number>>;
  /** Valores novos da sequência de vitórias (atual e maior). */
  sequenciaAtual: number;
  maiorSequencia: number;
  /** A vocação do adversário, quando venceu (para o "todas as vocações"). */
  vocacaoDerrotada?: string;
}

export function resumoDoPvp(
  combate: ResultadoCombatePvp,
  eu: { nivel: number; sequenciaAtual?: number; maiorSequencia?: number },
  adversario: { nivel: number; classeId?: string },
): ResumoDoPvp {
  const nome = combate.finalA.nome;
  let dano = 0;
  for (const turno of combate.logTurnos) for (const a of turno.ataques) if (a.atacante === nome) dano += Math.max(0, a.danoEfetivo ?? 0);
  const venceu = combate.vencedor === 'a';
  const sequenciaAtual = venceu ? (eu.sequenciaAtual ?? 0) + 1 : 0;
  const ganhos: Partial<Record<Contador, number>> = {
    lutasPvp: 1,
    danoPvp: dano,
    ...(venceu ? { vitoriasPvp: 1 } : {}),
    ...(venceu && adversario.nivel > eu.nivel ? { vitoriasContraNivelMaior: 1 } : {}),
    ...(venceu && combate.finalA.hpMax > 0 && (combate.finalA.hp / combate.finalA.hpMax) * 100 < LIMITE_DA_VIDA_NO_LIMITE_PERCENTUAL ? { viradasPvp: 1 } : {}),
  };
  return {
    ganhos,
    sequenciaAtual,
    maiorSequencia: Math.max(eu.maiorSequencia ?? 0, sequenciaAtual),
    ...(venceu && adversario.classeId ? { vocacaoDerrotada: adversario.classeId } : {}),
  };
}
