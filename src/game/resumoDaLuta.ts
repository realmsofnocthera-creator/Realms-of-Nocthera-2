import type { ResultadoCombate } from './combat';
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
