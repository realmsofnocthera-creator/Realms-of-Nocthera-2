import { randomUUID } from 'node:crypto';
import { resolverCombatePvp, type Combatente, type ResultadoCombatePvp } from '@/game/combat';
import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import { semanaDe, fimDaSemana } from '@/rules/chefeSemanal';
import {
  ADVERSARIOS_NA_LISTA,
  COMPRAS_DE_LUTA_POR_DIA,
  FAIXAS_DA_ARENA,
  LUTAS_GUARDADAS,
  lutasRestantes,
  NIVEL_DA_ARENA,
  PONTOS_INICIAIS,
  pontosDepoisDaLuta,
  PRECO_DA_LUTA_EM_DIAMANTES,
  SEMANAS_GUARDADAS,
  TROCA_DA_LISTA_MS,
  type AdversarioNaLista,
  type EntradaDaArena,
  type LutaNoHistorico,
  type SemanaNaArena,
} from '@/rules/arena';
import { alterarSaldoEm, carregarPersonagem, combatenteDoPersonagem, salvarPersonagem, type CharacterDocument } from '@/server/characterService';
import { gerarSementeCombate } from '@/server/combateSemente';
import { mandarPremiosDaArena } from '@/server/correio';
import { marcaDaRede } from '@/server/integridade';
import { repositorio } from '@/server/persistencia';
import type { ContextoTransacao } from '@/server/persistencia/tipos';
import { comLimiteSilencioso, uidsComLimiteSilencioso } from '@/server/sancoes';
import { exigirSistemaLigado } from '@/server/sistemasLeitura';

/**
 * Arena (7.5). Cada jogador tem uma entrada por semana (arena/{semana}/jogadores/{uid}) com os pontos, as lutas do dia,
 * a lista de adversários e o histórico. Cada luta é uma transação que grava as duas entradas e o replay (3 gravações).
 * O replay guarda a semente e as fichas: assistir de novo refaz a luta (determinística), sem guardar o log inteiro.
 */

export class ErroDaArena extends Error {
  readonly status = 400;
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDaArena';
  }
}

/** Quantas vezes por dia o mesmo adversário pode ser atacado (contra trapaça). */
const ATAQUES_NO_MESMO_POR_DIA = 3;

function entradaNova(c: CharacterDocument, semana: string, oculto: boolean): EntradaDaArena {
  return { uid: c.uid, semana, nome: c.nome, nivel: c.nivel, classeId: c.classeId, pontos: PONTOS_INICIAIS, lutas: 0, ...(oculto ? { oculto: true } : {}) };
}

/** Marca a semana no personagem (para o prêmio e para apagar os dados da conta); só grava quando a semana é nova. */
function comSemana(c: CharacterDocument, semana: string): SemanaNaArena[] | null {
  if ((c.arena ?? []).some((s) => s.semana === semana)) return null;
  return [...(c.arena ?? []), { semana }].slice(-SEMANAS_GUARDADAS);
}

// O pódio (10 primeiros) fica na memória por 30 segundos: muita gente abrindo a Arena custa poucas leituras
const GUARDA_DO_PODIO_MS = 30_000;
let podioGuardado: { semana: string; em: number; lista: EntradaDaArena[] } | null = null;
export function limparCacheDaArena(): void {
  podioGuardado = null;
}
async function podio(semana: string, agora: number): Promise<EntradaDaArena[]> {
  if (podioGuardado && podioGuardado.semana === semana && agora - podioGuardado.em < GUARDA_DO_PODIO_MS) return podioGuardado.lista;
  const lista = await repositorio.listarArenaTopo(semana, 10);
  podioGuardado = { semana, em: agora, lista };
  return lista;
}

const adversarioDe = (e: Pick<EntradaDaArena, 'uid' | 'nome' | 'nivel' | 'classeId' | 'pontos'>): AdversarioNaLista => ({ uid: e.uid, nome: e.nome, nivel: e.nivel, classeId: e.classeId, pontos: e.pontos });

/**
 * Os 5 adversários: os mais próximos em pontos na semana; se faltar gente (começo da semana, poucos jogadores),
 * completa com jogadores de qualquer pontuação (do nível 4 para cima), que entram com 1.000 pontos.
 */
async function montarLista(uid: string, semana: string, pontos: number): Promise<AdversarioNaLista[]> {
  const ocultos = await uidsComLimiteSilencioso();
  const fora = (id: string) => id === uid || ocultos.has(id);
  const [acima, abaixo] = await Promise.all([repositorio.listarArenaPerto(semana, pontos, true, 6), repositorio.listarArenaPerto(semana, pontos, false, 6)]);
  const perto = [...acima, ...abaixo].filter((e) => !fora(e.uid)).sort((a, b) => Math.abs(a.pontos - pontos) - Math.abs(b.pontos - pontos));
  const lista = perto.slice(0, ADVERSARIOS_NA_LISTA).map(adversarioDe);
  if (lista.length < ADVERSARIOS_NA_LISTA) {
    const ja = new Set(lista.map((a) => a.uid));
    const candidatos = (await repositorio.consultarTopo('nivel', 60)).filter((r) => r.uid && r.nivel >= NIVEL_DA_ARENA && !fora(r.uid) && !ja.has(r.uid));
    for (let i = candidatos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidatos[i], candidatos[j]] = [candidatos[j], candidatos[i]];
    }
    for (const r of candidatos.slice(0, ADVERSARIOS_NA_LISTA - lista.length)) lista.push({ uid: r.uid!, nome: r.nome, nivel: r.nivel, classeId: r.classeId, pontos: PONTOS_INICIAIS });
  }
  return lista;
}

export interface EstadoDaArena {
  nivelNecessario: number;
  podeLutar: boolean;
  semana: string;
  /** Quando a semana acaba (segunda à meia-noite de Brasília): sai o pódio e os pontos voltam a 1.000. */
  acabaEm: string;
  pontos: number;
  posicao: number | null;
  lutasRestantes: number;
  comprasFeitas: number;
  podeComprarLuta: boolean;
  precoDaLuta: number;
  diamantes: number;
  adversarios: AdversarioNaLista[];
  /** Quando a lista pode ser trocada de graça de novo (null = já pode). */
  trocaLiberadaEm: string | null;
  podio: { posicao: number; nome: string; nivel: number; classeId: string; pontos: number }[];
  historico: LutaNoHistorico[];
  faixas: typeof FAIXAS_DA_ARENA;
}

const acabaEm = (agora: Date) => new Date(`${fimDaSemana(semanaDe(agora))}T03:00:00.000Z`).toISOString();

export async function estadoDaArena(uid: string, agora = new Date()): Promise<EstadoDaArena> {
  await mandarPremiosDaArena(uid, agora);
  const char = await repositorio.lerPersonagem(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  const semana = semanaDe(agora);
  const oculto = await comLimiteSilencioso(uid);
  let minha = await repositorio.lerEntradaDaArena(semana, uid, oculto);
  const podeLutar = char.nivel >= NIVEL_DA_ARENA;
  // a lista é montada (e gravada) na primeira vez da semana
  if (podeLutar && !minha?.lista) {
    const base = minha ?? entradaNova(char, semana, oculto);
    const adversarios = await montarLista(uid, semana, base.pontos);
    minha = await repositorio.executarTransacao('arena:lista', async (ctx) => {
      const atual = (await ctx.lerEntradaDaArena(semana, uid, oculto)) ?? base;
      if (atual.lista) return atual;
      const nova = { ...atual, lista: { adversarios, trocadaEm: new Date(0).toISOString() } };
      ctx.gravarEntradaDaArena(nova);
      return nova;
    });
  }
  const top = await podio(semana, agora.getTime());
  const posicao = minha && !oculto && minha.lutas + (minha.historico?.length ?? 0) > 0 ? (await repositorio.contarAcimaNaArena(semana, minha.pontos)) + 1 : null;
  const hoje = diaDeBrasilia(agora);
  const lutas = lutasRestantes(minha, hoje);
  const trocaEm = minha?.lista ? Date.parse(minha.lista.trocadaEm) + TROCA_DA_LISTA_MS : 0;
  let pos = 0;
  return {
    nivelNecessario: NIVEL_DA_ARENA,
    podeLutar,
    semana,
    acabaEm: acabaEm(agora),
    pontos: minha?.pontos ?? PONTOS_INICIAIS,
    posicao,
    lutasRestantes: lutas.restantes,
    comprasFeitas: lutas.compradas,
    podeComprarLuta: lutas.podeComprar,
    precoDaLuta: PRECO_DA_LUTA_EM_DIAMANTES,
    diamantes: char.diamantes ?? 0,
    adversarios: minha?.lista?.adversarios ?? [],
    trocaLiberadaEm: trocaEm > agora.getTime() ? new Date(trocaEm).toISOString() : null,
    podio: top.map((e, i) => {
      // empatados em pontos dividem a posição
      if (i === 0 || e.pontos !== top[i - 1].pontos) pos = i + 1;
      return { posicao: pos, nome: e.nome, nivel: e.nivel, classeId: e.classeId, pontos: e.pontos };
    }),
    historico: [...(minha?.historico ?? [])].reverse(),
    faixas: FAIXAS_DA_ARENA,
  };
}

/** Troca a lista de adversários (de graça, uma vez por hora). */
export async function trocarLista(uid: string, agora = new Date()): Promise<{ mensagem: string }> {
  await exigirSistemaLigado(uid, 'arena');
  const semana = semanaDe(agora);
  const oculto = await comLimiteSilencioso(uid);
  const char = await repositorio.lerPersonagem(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  if (char.nivel < NIVEL_DA_ARENA) throw new ErroDaArena(`A Arena abre no nível ${NIVEL_DA_ARENA}.`);
  const antes = await repositorio.lerEntradaDaArena(semana, uid, oculto);
  const adversarios = await montarLista(uid, semana, antes?.pontos ?? PONTOS_INICIAIS);
  await repositorio.executarTransacao('arena:trocarLista', async (ctx) => {
    const atual = (await ctx.lerEntradaDaArena(semana, uid, oculto)) ?? entradaNova(char, semana, oculto);
    if (atual.lista && Date.parse(atual.lista.trocadaEm) + TROCA_DA_LISTA_MS > agora.getTime()) {
      const min = Math.ceil((Date.parse(atual.lista.trocadaEm) + TROCA_DA_LISTA_MS - agora.getTime()) / 60_000);
      throw new ErroDaArena(`Você poderá trocar a lista de novo em ${min} min.`);
    }
    ctx.gravarEntradaDaArena({ ...atual, lista: { adversarios, trocadaEm: agora.toISOString() } });
  });
  return { mensagem: 'Lista de adversários trocada.' };
}

/** Compra uma luta a mais hoje (5 Diamantes; até 5 por dia). */
export async function comprarLuta(uid: string, agora = new Date()): Promise<{ mensagem: string }> {
  await exigirSistemaLigado(uid, 'arena');
  const semana = semanaDe(agora);
  const hoje = diaDeBrasilia(agora);
  const oculto = await comLimiteSilencioso(uid);
  return repositorio.executarTransacao('arena:comprarLuta', async (ctx) => {
    let eu = await carregarPersonagem(ctx, uid);
    if (eu.nivel < NIVEL_DA_ARENA) throw new ErroDaArena(`A Arena abre no nível ${NIVEL_DA_ARENA}.`);
    const atual = (await ctx.lerEntradaDaArena(semana, uid, oculto)) ?? entradaNova(eu, semana, oculto);
    const lutas = lutasRestantes(atual, hoje);
    if (!lutas.podeComprar) throw new ErroDaArena(`Você já comprou as ${COMPRAS_DE_LUTA_POR_DIA} lutas de hoje.`);
    eu = alterarSaldoEm(ctx, eu, 'diamantes', -PRECO_DA_LUTA_EM_DIAMANTES, 'Arena: luta extra').character;
    const doDia = atual.dia === hoje;
    ctx.gravarEntradaDaArena({ ...atual, dia: hoje, lutasHoje: doDia ? atual.lutasHoje ?? 0 : 0, comprasHoje: lutas.compradas + 1 });
    const semanas = comSemana(eu, semana);
    salvarPersonagem(ctx, eu, { diamantes: eu.diamantes, ...(semanas ? { arena: semanas } : {}) });
    return { mensagem: `Luta extra comprada por ${PRECO_DA_LUTA_EM_DIAMANTES} Diamantes.` };
  });
}

/** Quem está em cada lado da luta, para a tela (retrato, classe, vida e escudo do começo). */
export interface LadoNaTela {
  nome: string;
  nivel: number;
  classeId: string;
  avatarId: string;
  hpMax: number;
  sobreescudo: number;
}
const ladoNaTela = (ficha: Combatente, avatarId: string, nome = ficha.nome): LadoNaTela => ({
  nome,
  nivel: ficha.nivel ?? 1,
  classeId: ficha.classeId ?? '',
  avatarId,
  hpMax: ficha.hpMax,
  sobreescudo: ficha.sobreescudo,
});

/** O replay guardado: a semente, as fichas e o resultado (para conferir que a luta refeita é a mesma). */
interface ReplayGuardado {
  semente: number;
  fichaA: Combatente;
  fichaB: Combatente;
  avatarA: string;
  avatarB: string;
  vencedor: ResultadoCombatePvp['vencedor'];
  hpFinalA: number;
  hpFinalB: number;
}

export interface ResultadoDaLuta {
  mensagem: string;
  venceu: boolean;
  empate: boolean;
  pontos: number;
  pontosGanhos: number;
  combate: ResultadoCombatePvp;
  lados: { a: LadoNaTela; b: LadoNaTela };
}

/** Ataca um adversário da lista: a luta contra a ficha atual dele, os pontos dos dois e o replay. */
export async function lutar(uid: string, alvoBruto: unknown, ip: string, agora = new Date()): Promise<ResultadoDaLuta> {
  await exigirSistemaLigado(uid, 'arena');
  const alvo = typeof alvoBruto === 'string' && alvoBruto.length <= 128 ? alvoBruto : '';
  if (!alvo || alvo === uid) throw new ErroDaArena('Escolha um adversário da lista.');
  const semana = semanaDe(agora);
  const hoje = diaDeBrasilia(agora);
  const [eOculto, eleOculto] = await Promise.all([comLimiteSilencioso(uid), comLimiteSilencioso(alvo)]);
  const marca = marcaDaRede(ip);
  const semente = gerarSementeCombate();
  return repositorio.executarTransacao('arena:lutar', async (ctx: ContextoTransacao) => {
    const eu = await carregarPersonagem(ctx, uid);
    if (eu.nivel < NIVEL_DA_ARENA) throw new ErroDaArena(`A Arena abre no nível ${NIVEL_DA_ARENA}.`);
    const ele = await carregarPersonagem(ctx, alvo, 'Esse adversário não existe mais. Troque a lista.');
    const minha = (await ctx.lerEntradaDaArena(semana, uid, eOculto)) ?? entradaNova(eu, semana, eOculto);
    if (!minha.lista?.adversarios.some((a) => a.uid === alvo)) throw new ErroDaArena('Esse adversário não está na sua lista. Atualize a tela.');
    if (lutasRestantes(minha, hoje).restantes <= 0) throw new ErroDaArena('Suas lutas de hoje acabaram. Compre uma luta extra ou volte amanhã.');
    const contraEleHoje = (minha.historico ?? []).filter((h) => h.atacou && h.adversarioUid === alvo && diaDeBrasilia(new Date(h.em)) === hoje).length;
    if (contraEleHoje >= ATAQUES_NO_MESMO_POR_DIA) throw new ErroDaArena(`Você já atacou ${ele.nome} ${ATAQUES_NO_MESMO_POR_DIA} vezes hoje.`);
    const dele = (await ctx.lerEntradaDaArena(semana, alvo, eleOculto)) ?? entradaNova(ele, semana, eleOculto);

    const fichaA = combatenteDoPersonagem(eu);
    const fichaB = combatenteDoPersonagem(ele);
    const combate = resolverCombatePvp(fichaA, fichaB, semente);
    // contra trapaça: vitória contra conta criada na mesma rede (nas últimas 24 horas) não muda os pontos
    const mesmaRede = !!marca && !!(await ctx.lerCadastrosDaRede(marca))?.contas.some((c) => c.uid === alvo);
    const novos = mesmaRede ? { atacante: minha.pontos, defensor: dele.pontos } : pontosDepoisDaLuta(minha.pontos, dele.pontos, combate.vencedor);

    const vaga = minha.proximaVaga ?? 0;
    const replay = `${uid}_${vaga}`;
    const lutaId = randomUUID();
    const guardado: ReplayGuardado = { semente, fichaA, fichaB, avatarA: eu.avatarId, avatarB: ele.avatarId, vencedor: combate.vencedor, hpFinalA: combate.finalA.hp, hpFinalB: combate.finalB.hp };
    ctx.gravarReplayDaArena({ id: replay, lutaId, atacante: eu.nome, defensor: ele.nome, em: agora.toISOString(), resultado: guardado });

    const empate = combate.vencedor === 'ninguem';
    const minhaLuta: LutaNoHistorico = { id: lutaId, replay, atacou: true, adversario: ele.nome, adversarioUid: alvo, venceu: combate.vencedor === 'a', ...(empate ? { empate } : {}), pontos: novos.atacante - minha.pontos, em: agora.toISOString() };
    const deleLuta: LutaNoHistorico = { id: lutaId, replay, atacou: false, adversario: eu.nome, adversarioUid: uid, venceu: combate.vencedor === 'b', ...(empate ? { empate } : {}), pontos: novos.defensor - dele.pontos, em: agora.toISOString() };
    const doDia = minha.dia === hoje;
    ctx.gravarEntradaDaArena({
      ...minha,
      nome: eu.nome,
      nivel: eu.nivel,
      classeId: eu.classeId,
      pontos: novos.atacante,
      lutas: minha.lutas + 1,
      dia: hoje,
      lutasHoje: (doDia ? minha.lutasHoje ?? 0 : 0) + 1,
      comprasHoje: doDia ? minha.comprasHoje ?? 0 : 0,
      lista: { ...minha.lista!, adversarios: minha.lista!.adversarios.map((a) => (a.uid === alvo ? { ...a, pontos: novos.defensor } : a)) },
      historico: [...(minha.historico ?? []), minhaLuta].slice(-LUTAS_GUARDADAS),
      proximaVaga: (vaga + 1) % LUTAS_GUARDADAS,
    });
    ctx.gravarEntradaDaArena({ ...dele, nome: ele.nome, nivel: ele.nivel, classeId: ele.classeId, pontos: novos.defensor, historico: [...(dele.historico ?? []), deleLuta].slice(-LUTAS_GUARDADAS) });
    // as semanas no personagem: só grava na primeira luta (ou defesa) da semana
    const minhasSemanas = comSemana(eu, semana);
    if (minhasSemanas) salvarPersonagem(ctx, eu, { arena: minhasSemanas });
    const semanasDele = comSemana(ele, semana);
    if (semanasDele) salvarPersonagem(ctx, ele, { arena: semanasDele });

    const ganhos = novos.atacante - minha.pontos;
    const placar = `${ganhos >= 0 ? '+' : ''}${ganhos} pontos`;
    return {
      mensagem: empate
        ? `Empate com ${ele.nome}: no PvP, os dois perdem (${placar}).`
        : combate.vencedor === 'a'
          ? `Você venceu ${ele.nome}! ${placar}.`
          : `${ele.nome} venceu. ${placar}.`,
      venceu: combate.vencedor === 'a',
      empate,
      pontos: novos.atacante,
      pontosGanhos: ganhos,
      combate,
      lados: { a: ladoNaTela(fichaA, eu.avatarId, combate.finalA.nome), b: ladoNaTela(fichaB, ele.avatarId, combate.finalB.nome) },
    };
  });
}

/** Assiste de novo a uma luta do histórico (refaz a luta pela semente e confere com o resultado guardado). */
export async function verReplay(uid: string, lutaIdBruto: unknown, agora = new Date()): Promise<{ combate: ResultadoCombatePvp; lados: { a: LadoNaTela; b: LadoNaTela }; em: string }> {
  const lutaId = typeof lutaIdBruto === 'string' ? lutaIdBruto : '';
  const semana = semanaDe(agora);
  const oculto = await comLimiteSilencioso(uid);
  const minha = await repositorio.lerEntradaDaArena(semana, uid, oculto);
  const luta = minha?.historico?.find((h) => h.id === lutaId);
  if (!luta) throw new ErroDaArena('Essa luta não está mais no seu histórico.');
  const doc = await repositorio.lerReplayDaArena(luta.replay);
  const g = doc?.resultado as ReplayGuardado | undefined;
  if (!doc || doc.lutaId !== lutaId || !g) throw new ErroDaArena('O replay dessa luta não está mais guardado (só as 20 lutas mais recentes de quem atacou ficam).');
  const combate = resolverCombatePvp(g.fichaA, g.fichaB, g.semente);
  if (combate.vencedor !== g.vencedor || combate.finalA.hp !== g.hpFinalA || combate.finalB.hp !== g.hpFinalB)
    throw new ErroDaArena('O combate mudou desde essa luta (ajuste de equilíbrio): o replay dela não está mais disponível.');
  return { combate, lados: { a: ladoNaTela(g.fichaA, g.avatarA, combate.finalA.nome), b: ladoNaTela(g.fichaB, g.avatarB, combate.finalB.nome) }, em: doc.em };
}
