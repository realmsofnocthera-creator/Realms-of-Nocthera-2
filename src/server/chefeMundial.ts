import { resolverCombate } from '@/game/combat';
import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import {
  chefeDoDia,
  DIAS_GUARDADOS,
  diaSeguinte,
  FAIXAS_DO_CHEFE_MUNDIAL,
  JOGADORES_NO_RANKING_DO_DIA,
  montarChefeMundial,
  NIVEL_DO_CHEFE_MUNDIAL,
  VIDA_DO_CHEFE_MUNDIAL,
  type EntradaDoChefeMundial,
  type FaixaDoChefeMundial,
} from '@/rules/chefeMundial';
import { carregarPersonagem, combatenteDoPersonagem, salvarPersonagem } from '@/server/characterService';
import { gerarSementeCombate } from '@/server/combateSemente';
import { mandarRecompensasDoChefeMundial } from '@/server/correio';
import { repositorio } from '@/server/persistencia';
import { exigirSistemaLigado } from '@/server/sistemasLeitura';

/**
 * Provação de Chefe Mundial: um chefe por dia, lutas solo e ilimitadas, vale o maior dano do dia. O melhor de cada
 * jogador fica em chefeMundial/{dia}/jogadores/{uid}; a posição é a quantidade de jogadores com mais dano + 1. A
 * recompensa vai ao Correio quando o dia fecha (ver `mandarRecompensasDoChefeMundial`).
 */

export class ErroDoChefeMundial extends Error {
  readonly status = 400;
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDoChefeMundial';
  }
}

export interface EstadoDoChefeMundial {
  nivelNecessario: number;
  meuNivel: number;
  dia: string;
  chefe: string;
  /** Quando o dia fecha (meia-noite de Brasília, ISO). */
  fechaEm: string;
  meuMelhor: number;
  /** null se ainda não lutou hoje. */
  minhaPosicao: number | null;
  ranking: { posicao: number; nome: string; dano: number }[];
  faixas: readonly FaixaDoChefeMundial[];
}

const CACHE_DO_RANKING_MS = 60_000;
const rankingGuardado = new Map<string, { em: number; lista: EntradaDoChefeMundial[] }>();

async function rankingDoDia(dia: string, agora: Date): Promise<EntradaDoChefeMundial[]> {
  const guardado = rankingGuardado.get(dia);
  if (guardado && agora.getTime() - guardado.em < CACHE_DO_RANKING_MS) return guardado.lista;
  const lista = await repositorio.listarChefeMundial(dia, JOGADORES_NO_RANKING_DO_DIA);
  rankingGuardado.clear();
  rankingGuardado.set(dia, { em: agora.getTime(), lista });
  return lista;
}

/** Meia-noite de Brasília (UTC−3) do dia seguinte. */
const fimDoDia = (dia: string) => `${diaSeguinte(dia)}T03:00:00.000Z`;

export async function estadoDoChefeMundial(uid: string, agora = new Date()): Promise<EstadoDoChefeMundial> {
  await mandarRecompensasDoChefeMundial(uid, agora);
  const char = await repositorio.lerPersonagem(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  const dia = diaDeBrasilia(agora);
  const [minha, top] = await Promise.all([repositorio.lerEntradaChefeMundial(dia, uid), rankingDoDia(dia, agora)]);
  const minhaPosicao = minha ? (await repositorio.contarAcimaNoChefeMundial(dia, minha.dano)) + 1 : null;
  let anterior = { dano: -1, posicao: 0 };
  const ranking = top.map((e, i) => {
    // Empate divide a posição
    const posicao = e.dano === anterior.dano ? anterior.posicao : i + 1;
    anterior = { dano: e.dano, posicao };
    return { posicao, nome: e.nome, dano: e.dano };
  });
  return {
    nivelNecessario: NIVEL_DO_CHEFE_MUNDIAL,
    meuNivel: char.nivel,
    dia,
    chefe: chefeDoDia(dia).nome,
    fechaEm: fimDoDia(dia),
    meuMelhor: minha?.dano ?? 0,
    minhaPosicao,
    ranking,
    faixas: FAIXAS_DO_CHEFE_MUNDIAL,
  };
}

/** Uma luta contra o chefe do dia: guarda o dano se for o melhor do jogador hoje. */
export async function lutarChefeMundial(uid: string, semente = gerarSementeCombate(), agora = new Date()): Promise<{ mensagem: string; dano: number; melhor: number }> {
  await exigirSistemaLigado(uid, 'chefeMundial');
  const dia = diaDeBrasilia(agora);
  return repositorio.executarTransacao('chefeMundial:lutar', async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    if (eu.nivel < NIVEL_DO_CHEFE_MUNDIAL) throw new ErroDoChefeMundial(`O Chefe Mundial abre no nível ${NIVEL_DO_CHEFE_MUNDIAL}.`);
    const chefe = montarChefeMundial(dia);
    const resultado = resolverCombate(combatenteDoPersonagem(eu), chefe, semente);
    // Conta também o que foi tirado do Sobreescudo do chefe
    const final = resultado.monstroFinal;
    const dano = final ? Math.max(0, VIDA_DO_CHEFE_MUNDIAL + (chefe.sobreescudoInicial ?? 0) - final.hp - final.sobreescudo) : 0;
    const entrada = await ctx.lerEntradaChefeMundial(dia, uid);
    const anterior = entrada?.dano ?? 0;
    if (!entrada || dano > anterior) ctx.gravarEntradaChefeMundial({ dia, uid, nome: eu.nome, dano: Math.max(dano, anterior) });
    if (!(eu.chefeMundial ?? []).some((p) => p.dia === dia)) {
      salvarPersonagem(ctx, eu, { chefeMundial: [...(eu.chefeMundial ?? []), { dia }].slice(-DIAS_GUARDADOS) });
    }
    rankingGuardado.delete(dia);
    const melhor = Math.max(dano, anterior);
    return {
      mensagem:
        dano > anterior
          ? `Você causou ${dano.toLocaleString('pt-BR')} de dano em ${chefe.nome}: seu novo melhor de hoje!`
          : `Você causou ${dano.toLocaleString('pt-BR')} de dano em ${chefe.nome}. Seu melhor de hoje continua ${anterior.toLocaleString('pt-BR')}.`,
      dano,
      melhor,
    };
  });
}
