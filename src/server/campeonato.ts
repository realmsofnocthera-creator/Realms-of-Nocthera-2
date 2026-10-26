import { resolverCombatePvp, type ResultadoCombatePvp } from '@/game/combat';
import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import { NIVEL_DA_ARENA } from '@/rules/arena';
import { semanaDe } from '@/rules/chefeSemanal';
import {
  edicoesAte,
  FAIXAS_DO_CAMPEONATO,
  faixaPelaRodada,
  horaDaRodada,
  inicioDoCampeonato,
  MAXIMO_DE_JOGADORES,
  MINIMO_DE_JOGADORES,
  PONTOS_PARA_ENTRAR,
  presenteDaFaixaDoCampeonato,
  primeiraRodada,
  proximaRodada,
  proximoCampeonato,
  temCampeonato,
  TITULOS_DO_CAMPEAO,
  tituloPelasVitorias,
  totalDeRodadas,
  type CampeonatoDoDia,
  type FaixaDoCampeonato,
  type JogadorNoCampeonato,
} from '@/rules/campeonato';
import { ErroDaArena, ladoNaTela, opcoesDoBau, type LadoNaTela, type ReplayGuardado } from '@/server/arena';
import { carregarPersonagem, combatenteDoPersonagem, salvarPersonagem, type CharacterDocument } from '@/server/characterService';
import { gerarSementeCombate } from '@/server/combateSemente';
import { comMensagem, limparCacheDoCorreio, novaMensagem } from '@/server/correio';
import { repositorio } from '@/server/persistencia';
import { comLimiteSilencioso } from '@/server/sancoes';
import { exigirSistemaLigado } from '@/server/sistemasLeitura';

/**
 * Campeonato (7.5). Não há relógio no servidor: a edição anda quando alguém abre a Arena, o Campeonato ou o Correio
 * depois das 20h do sábado. A primeira visita monta a chave com os pontos da ranqueada naquela hora (ou cancela a
 * edição com menos de 32); depois, cada rodada cujo horário já passou é resolvida numa transação (as lutas usam a ficha
 * de cada jogador naquele momento). Os prêmios vão para o Correio de cada um quando ele abre o jogo (como na Arena).
 */

// A edição fica na memória por 5 segundos (muita gente acompanhando a chave custa poucas leituras); as que já
// acabaram (ou os dias passados sem edição) não mudam mais e ficam 10 minutos
const GUARDA_MS = 5_000;
const GUARDA_DAS_FECHADAS_MS = 10 * 60_000;
const guardados = new Map<string, { em: number; c: CampeonatoDoDia | null }>();
export function limparCacheDoCampeonato(): void {
  guardados.clear();
}
async function edicao(dia: string, agora: number): Promise<CampeonatoDoDia | null> {
  const g = guardados.get(dia);
  const fechada = !!g && ((g.c !== null && g.c.estado !== 'andamento') || dia < diaDeBrasilia(new Date(agora)));
  if (g && agora - g.em < (fechada ? GUARDA_DAS_FECHADAS_MS : GUARDA_MS)) return g.c;
  const c = await repositorio.lerCampeonato(dia);
  guardados.set(dia, { em: agora, c });
  return c;
}

/** A vida em % de um lado no fim da luta (com casas, para o desempate). */
const vidaFinal = (r: ResultadoCombatePvp['finalA']) => (r.hpMax > 0 ? Math.max(0, r.hp) / r.hpMax : 0);

/** Monta a chave (ou cancela, com menos de 32): os do Ascendente para cima na ranqueada, do mais pontos para o menos. */
async function montar(dia: string, agora: Date): Promise<CampeonatoDoDia> {
  const semana = semanaDe(inicioDoCampeonato(dia));
  const candidatos = (await repositorio.listarArenaPerto(semana, PONTOS_PARA_ENTRAR, true, MAXIMO_DE_JOGADORES * 2, 'ranqueada'))
    .filter((e) => e.nivel >= NIVEL_DA_ARENA)
    .sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome))
    .slice(0, MAXIMO_DE_JOGADORES);
  const jogadores: JogadorNoCampeonato[] = candidatos.map((e) => ({ uid: e.uid, nome: e.nome, nivel: e.nivel, classeId: e.classeId, pontos: e.pontos }));
  const cancelado = jogadores.length < MINIMO_DE_JOGADORES;
  const r = await repositorio.executarTransacao('campeonato:montar', async (ctx) => {
    const ja = await ctx.lerCampeonato(dia);
    if (ja) return { c: ja, novo: false };
    const c: CampeonatoDoDia = cancelado
      ? { dia, estado: 'cancelado', jogadores, rodadas: [], criadoEm: agora.toISOString() }
      : { dia, estado: 'andamento', jogadores, rodadas: [primeiraRodada(jogadores.length)], criadoEm: agora.toISOString() };
    ctx.gravarCampeonato(c);
    return { c, novo: true };
  });
  if (r.novo && cancelado) {
    const [ano, mes, d] = dia.split('-');
    await repositorio.gravarMensagemGeral(
      novaMensagem(
        {
          titulo: 'Campeonato cancelado',
          texto: `O Campeonato de ${d}/${mes}/${ano} não aconteceu: eram precisos ${MINIMO_DE_JOGADORES} jogadores do Ascendente para cima na Arena ranqueada, e havia ${jogadores.length}. O próximo é daqui a duas semanas.`,
          de: 'Campeonato',
        },
        agora,
        'cg'
      )
    );
    limparCacheDoCorreio();
  }
  return r.c;
}

/** Resolve a rodada `rodada` (se ainda não foi): as lutas, os replays e a rodada seguinte (ou o fim). */
async function resolverRodada(dia: string, rodada: number): Promise<void> {
  await repositorio.executarTransacao('campeonato:rodada', async (ctx) => {
    const c = await ctx.lerCampeonato(dia);
    if (!c || c.estado !== 'andamento' || c.rodadas.length !== rodada + 1) return;
    const lutas = c.rodadas[rodada];
    if (lutas.every((l) => l.vencedor !== undefined)) return;
    const personagens = new Map<string, CharacterDocument | null>();
    const ler = async (i: number) => {
      const uid = c.jogadores[i].uid;
      if (!personagens.has(uid)) personagens.set(uid, await carregarPersonagem(ctx, uid).catch(() => null));
      return personagens.get(uid)!;
    };
    for (const [i, l] of lutas.entries()) {
      if (l.b === null) {
        l.vencedor = l.a; // passou direto
        continue;
      }
      const [pa, pb] = [await ler(l.a), await ler(l.b)];
      // conta apagada: o outro passa
      if (!pa || !pb) {
        l.vencedor = pa ? l.a : l.b;
        continue;
      }
      const fichaA = combatenteDoPersonagem(pa);
      const fichaB = combatenteDoPersonagem(pb);
      const semente = gerarSementeCombate();
      const combate = resolverCombatePvp(fichaA, fichaB, semente);
      const [va, vb] = [vidaFinal(combate.finalA), vidaFinal(combate.finalB)];
      // no empate passa quem terminou com mais vida em %; com a mesma vida, quem tinha mais pontos (o de índice menor)
      l.vencedor = combate.vencedor === 'a' ? l.a : combate.vencedor === 'b' ? l.b : va > vb ? l.a : vb > va ? l.b : Math.min(l.a, l.b);
      l.vidaA = Math.round(va * 100);
      l.vidaB = Math.round(vb * 100);
      l.replay = `c_${dia}_${rodada}_${i}`;
      const guardado: ReplayGuardado = { semente, fichaA, fichaB, avatarA: pa.avatarId, avatarB: pb.avatarId, vencedor: combate.vencedor, hpFinalA: combate.finalA.hp, hpFinalB: combate.finalB.hp };
      ctx.gravarReplayDaArena({ id: l.replay, lutaId: l.replay, atacante: pa.nome, defensor: pb.nome, em: new Date().toISOString(), resultado: guardado });
    }
    if (lutas.length === 1) c.estado = 'encerrado';
    else c.rodadas.push(proximaRodada(lutas));
    ctx.gravarCampeonato(c);
  });
  guardados.delete(dia);
}

/** Faz a edição de hoje andar até agora: monta a chave às 20h e resolve as rodadas cujo horário já passou. */
export async function avancarCampeonato(agora = new Date()): Promise<CampeonatoDoDia | null> {
  const dia = diaDeBrasilia(agora);
  if (!temCampeonato(dia) || agora < inicioDoCampeonato(dia)) return null;
  let c: CampeonatoDoDia | null = (await edicao(dia, agora.getTime())) ?? (await montar(dia, agora));
  while (c && c.estado === 'andamento' && agora >= horaDaRodada(dia, c.rodadas.length - 1)) {
    await resolverRodada(dia, c.rodadas.length - 1);
    c = await repositorio.lerCampeonato(dia);
  }
  guardados.set(dia, { em: agora.getTime(), c });
  return c;
}

/** A colocação de um jogador numa edição encerrada: a faixa e a rodada em que caiu (ou null se não jogou). */
function colocacao(c: CampeonatoDoDia, uid: string): { faixa: FaixaDoCampeonato; campeao: boolean } | null {
  const i = c.jogadores.findIndex((j) => j.uid === uid);
  if (i < 0) return null;
  const total = c.rodadas.length;
  for (const [r, lutas] of c.rodadas.entries()) {
    const luta = lutas.find((l) => l.a === i || l.b === i);
    if (luta && luta.vencedor !== i) return { faixa: faixaPelaRodada(r, total), campeao: false };
  }
  return { faixa: faixaPelaRodada(total, total), campeao: true };
}

/**
 * Manda ao Correio os prêmios das edições encerradas em que o jogador entrou (as 4 últimas). O campeão ganha também o
 * baú de escolha mítico e o título da vez (1º, 2º, 3º e 5º campeonato ganho).
 */
export async function mandarPremiosDoCampeonato(uid: string, agora = new Date()): Promise<void> {
  await avancarCampeonato(agora);
  const char = await repositorio.lerPersonagem(uid);
  if (!char) return;
  const recebidas = new Set(char.campeonatos ?? []);
  const edicoes = (await Promise.all(edicoesAte(diaDeBrasilia(agora), 4).map((d) => edicao(d, agora.getTime())))).filter(
    (c): c is CampeonatoDoDia => !!c && c.estado === 'encerrado' && !recebidas.has(c.dia) && c.jogadores.some((j) => j.uid === uid)
  );
  if (!edicoes.length) return;
  await repositorio.executarTransacao('correio:campeonato', async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    let caixa = eu.correio ?? [];
    let baus = eu.bausDeEscolha ?? [];
    let vitorias = eu.campeonatosVencidos ?? 0;
    const feitas = new Set(eu.campeonatos ?? []);
    for (const c of edicoes) {
      if (feitas.has(c.dia)) continue;
      const pos = colocacao(c, uid);
      feitas.add(c.dia);
      if (!pos) continue;
      const [ano, mes, d] = c.dia.split('-');
      let titulo: string | undefined;
      if (pos.campeao) {
        vitorias++;
        titulo = tituloPelasVitorias(vitorias);
        baus = [...baus, { id: `bau-campeonato-${c.dia}`, tipo: 'mitico' as const, origem: `Campeão do Campeonato de ${d}/${mes}/${ano}`, em: agora.toISOString() }];
      }
      caixa = comMensagem(
        caixa,
        novaMensagem(
          {
            titulo: `Campeonato: ${pos.faixa.nome}`,
            texto: pos.campeao
              ? `Você é o campeão do Campeonato de ${d}/${mes}/${ano}! Ganhou também um baú de escolha mítico (carta ou emblema): abra na aba Campeonato da Arena.`
              : `Sua colocação no Campeonato de ${d}/${mes}/${ano}: ${pos.faixa.nome}.`,
            de: 'Campeonato',
            presente: { ...presenteDaFaixaDoCampeonato(pos.faixa), ...(titulo ? { titulos: [titulo] } : {}) },
          },
          agora
        ),
        agora
      );
    }
    salvarPersonagem(ctx, eu, {
      correio: caixa,
      campeonatos: [...feitas].sort().slice(-30),
      ...(vitorias !== (eu.campeonatosVencidos ?? 0) ? { campeonatosVencidos: vitorias } : {}),
      ...(baus.length ? { bausDeEscolha: baus } : {}),
    });
  });
}

export interface LutaNaTela {
  indice: number;
  a: { nome: string; classeId: string; pontos: number } | null;
  b: { nome: string; classeId: string; pontos: number } | null;
  vencedor: 'a' | 'b' | null;
  vidaA?: number;
  vidaB?: number;
  temReplay: boolean;
  /** Uma das lutas é do jogador que pediu. */
  minha: boolean;
}

export interface EstadoDoCampeonato {
  nivelNecessario: number;
  pontosParaEntrar: number;
  /** Os pontos de quem pediu na ranqueada desta semana (para saber se entra). */
  meusPontos: number;
  proxima: { dia: string; inicio: string };
  /** A edição de hoje (em andamento ou encerrada) ou a última; null se ainda não houve. */
  edicao: {
    dia: string;
    estado: CampeonatoDoDia['estado'];
    jogadores: number;
    entrei: boolean;
    proximaRodadaEm: string | null;
    rodadas: { nome: string; lutas: LutaNaTela[] }[];
    campeao: string | null;
  } | null;
  faixas: typeof FAIXAS_DO_CAMPEONATO;
  titulos: typeof TITULOS_DO_CAMPEAO;
  vitorias: number;
  baus: { id: string; origem: string }[];
  opcoesMiticas: { id: string; nome: string }[];
}

const NOME_DA_RODADA = (r: number, total: number) => {
  const daFinal = total - 1 - r;
  return daFinal === 0 ? 'Final' : daFinal === 1 ? 'Semifinais' : daFinal === 2 ? 'Quartas de final' : daFinal === 3 ? 'Oitavas de final' : `Rodada ${r + 1}`;
};

export async function estadoDoCampeonato(uid: string, agora = new Date()): Promise<EstadoDoCampeonato> {
  await mandarPremiosDoCampeonato(uid, agora);
  const char = await repositorio.lerPersonagem(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  const hoje = diaDeBrasilia(agora);
  const oculto = await comLimiteSilencioso(uid);
  const minha = await repositorio.lerEntradaDaArena(semanaDe(agora), uid, oculto, 'ranqueada');
  const proximaDia = temCampeonato(hoje) && agora >= inicioDoCampeonato(hoje) ? proximoCampeonato(new Date(Date.parse(`${hoje}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10)) : proximoCampeonato(hoje);
  const ultima = edicoesAte(hoje, 2).find((d) => d !== hoje || agora >= inicioDoCampeonato(d));
  const c = ultima ? await edicao(ultima, agora.getTime()) : null;
  const eu = c ? c.jogadores.findIndex((j) => j.uid === uid) : -1;
  const total = c ? totalDeRodadas(c.jogadores.length) : 0;
  const pessoa = (i: number | null) => (i === null || !c ? null : { nome: c.jogadores[i].nome, classeId: c.jogadores[i].classeId, pontos: c.jogadores[i].pontos });
  const ultimaLuta = c?.estado === 'encerrado' ? c.rodadas.at(-1)?.[0] : undefined;
  return {
    nivelNecessario: NIVEL_DA_ARENA,
    pontosParaEntrar: PONTOS_PARA_ENTRAR,
    meusPontos: minha?.pontos ?? 0,
    proxima: { dia: proximaDia, inicio: inicioDoCampeonato(proximaDia).toISOString() },
    edicao: c
      ? {
          dia: c.dia,
          estado: c.estado,
          jogadores: c.jogadores.length,
          entrei: eu >= 0,
          proximaRodadaEm: c.estado === 'andamento' ? horaDaRodada(c.dia, c.rodadas.length - 1).toISOString() : null,
          rodadas: c.rodadas.map((lutas, r) => ({
            nome: NOME_DA_RODADA(r, total),
            lutas: lutas.map((l, i) => ({
              indice: i,
              a: pessoa(l.a),
              b: pessoa(l.b),
              vencedor: l.vencedor === undefined ? null : l.vencedor === l.a ? 'a' : 'b',
              ...(l.vidaA !== undefined ? { vidaA: l.vidaA, vidaB: l.vidaB } : {}),
              temReplay: !!l.replay,
              minha: eu >= 0 && (l.a === eu || l.b === eu),
            })),
          })),
          campeao: ultimaLuta?.vencedor !== undefined ? c.jogadores[ultimaLuta.vencedor].nome : null,
        }
      : null,
    faixas: FAIXAS_DO_CAMPEONATO,
    titulos: TITULOS_DO_CAMPEAO,
    vitorias: char.campeonatosVencidos ?? 0,
    baus: (char.bausDeEscolha ?? []).filter((b) => b.tipo === 'mitico').map((b) => ({ id: b.id, origem: b.origem })),
    opcoesMiticas: opcoesDoBau('mitico').map((o) => ({ id: o.id, nome: o.nome })),
  };
}

/** Assiste a uma luta da chave (qualquer jogador pode: o Campeonato é público). */
export async function replayDoCampeonato(uid: string, diaBruto: unknown, rodadaBruta: unknown, lutaBruta: unknown): Promise<{ combate: ResultadoCombatePvp; lados: { a: LadoNaTela; b: LadoNaTela } }> {
  await exigirSistemaLigado(uid, 'campeonato');
  const dia = typeof diaBruto === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(diaBruto) ? diaBruto : '';
  const rodada = Number(rodadaBruta);
  const luta = Number(lutaBruta);
  const c = dia ? await repositorio.lerCampeonato(dia) : null;
  const l = c?.rodadas[rodada]?.[luta];
  if (!l?.replay) throw new ErroDaArena('Essa luta ainda não aconteceu.');
  const doc = await repositorio.lerReplayDaArena(l.replay);
  const g = doc?.resultado as ReplayGuardado | undefined;
  if (!g) throw new ErroDaArena('O replay dessa luta não está mais guardado.');
  const combate = resolverCombatePvp(g.fichaA, g.fichaB, g.semente);
  if (combate.vencedor !== g.vencedor || combate.finalA.hp !== g.hpFinalA || combate.finalB.hp !== g.hpFinalB)
    throw new ErroDaArena('O combate mudou desde essa luta (ajuste de equilíbrio): o replay dela não está mais disponível.');
  return { combate, lados: { a: ladoNaTela(g.fichaA, g.avatarA, combate.finalA.nome), b: ladoNaTela(g.fichaB, g.avatarB, combate.finalB.nome) } };
}
