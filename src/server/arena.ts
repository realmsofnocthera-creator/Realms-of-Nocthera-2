import { randomInt, randomUUID } from 'node:crypto';
import { resolverCombatePvp, type Combatente, type ResultadoCombatePvp } from '@/game/combat';
import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import { criarCarta, TIPOS_DE_CARTA } from '@/rules/almas';
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
  type ModoDaArena,
  type SemanaNaArena,
} from '@/rules/arena';
import { indiceDoRanque, pontosDepoisDasQuedas, pontosRanqueadosDepois, RANQUES, type BauDeEscolha } from '@/rules/arenaRanqueada';
import type { SistemaId } from '@/rules/sistemas';
import { sorteadorDaSemente } from '@/server/almas';
import { alterarSaldoEm, carregarPersonagem, combatenteDoPersonagem, salvarPersonagem, type CharacterDocument } from '@/server/characterService';
import { gerarSementeCombate } from '@/server/combateSemente';
import { comMensagem, mandarPremiosDaArena, novaMensagem } from '@/server/correio';
import { marcaDaRede } from '@/server/integridade';
import { entregarItem } from '@/server/mercado';
import { repositorio } from '@/server/persistencia';
import type { ContextoTransacao } from '@/server/persistencia/tipos';
import { comLimiteSilencioso, uidsComLimiteSilencioso } from '@/server/sancoes';
import { exigirSistemaLigado } from '@/server/sistemasLeitura';

/**
 * Arena e Arena ranqueada (7.5). Cada jogador tem uma entrada por semana em cada modo (arena/{semana}/jogadores/{uid}
 * e arenaRanqueada/...) com os pontos, as lutas do dia, a lista de adversários e o histórico. Cada luta é uma transação
 * que grava as duas entradas e o replay (3 gravações). O replay guarda a semente e as fichas: assistir de novo refaz a
 * luta (determinística), sem guardar o log inteiro. Os dois modos usam as mesmas funções; o que muda está em MODOS.
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
const SEMANA_MS = 7 * 86_400_000;

interface ConfigDoModo {
  modo: ModoDaArena;
  nome: string;
  sistema: SistemaId;
  /** O campo do personagem com as semanas jogadas (para o prêmio, a passagem dos pontos e apagar a conta). */
  campo: 'arena' | 'ranqueada';
  /** O começo do id das vagas de replay (`${uid}_${prefixo}${vaga}`). */
  prefixoReplay: string;
  /** Os pontos de quem ainda não jogou a semana (os que completam a lista aparecem com eles). */
  pontosPadrao: number;
  podeComprarLuta: boolean;
  pontosDepois(pontosA: number, pontosB: number, vencedor: ResultadoCombatePvp['vencedor']): { atacante: number; defensor: number };
}

const MODOS: Readonly<Record<ModoDaArena, ConfigDoModo>> = {
  arena: {
    modo: 'arena',
    nome: 'Arena',
    sistema: 'arena',
    campo: 'arena',
    prefixoReplay: '',
    pontosPadrao: PONTOS_INICIAIS,
    podeComprarLuta: true,
    pontosDepois: pontosDepoisDaLuta,
  },
  ranqueada: {
    modo: 'ranqueada',
    nome: 'Arena ranqueada',
    sistema: 'arenaRanqueada',
    campo: 'ranqueada',
    prefixoReplay: 'r',
    pontosPadrao: 0,
    podeComprarLuta: false,
    // só quem ataca ganha ou perde pontos; no empate, quem atacou perde
    pontosDepois: (a, b, vencedor) => ({ atacante: pontosRanqueadosDepois(a, vencedor === 'a'), defensor: b }),
  },
};

export const ehModoDaArena = (v: unknown): v is ModoDaArena => v === 'arena' || v === 'ranqueada';
const configDe = (modo: unknown) => MODOS[ehModoDaArena(modo) ? modo : 'arena'];

/**
 * Os pontos com que o jogador começa a semana: 1.000 na Arena; na ranqueada, os da última semana jogada, menos 40% por
 * segunda que passou (lidos fora da transação: a semana anterior já fechou).
 */
async function pontosDoComeco(c: CharacterDocument | null, cfg: ConfigDoModo, semana: string, oculto: boolean): Promise<number> {
  if (cfg.modo === 'arena' || !c) return cfg.pontosPadrao;
  const anterior = [...(c.ranqueada ?? [])].filter((s) => s.semana < semana).sort((a, b) => a.semana.localeCompare(b.semana)).at(-1);
  if (!anterior) return cfg.pontosPadrao;
  const e = await repositorio.lerEntradaDaArena(anterior.semana, c.uid, oculto, 'ranqueada');
  if (!e) return cfg.pontosPadrao;
  return pontosDepoisDasQuedas(e.pontos, Math.round((Date.parse(`${semana}T12:00:00Z`) - Date.parse(`${anterior.semana}T12:00:00Z`)) / SEMANA_MS));
}

function entradaNova(c: CharacterDocument, cfg: ConfigDoModo, semana: string, oculto: boolean, pontos: number): EntradaDaArena {
  return {
    uid: c.uid,
    ...(cfg.modo === 'ranqueada' ? { modo: 'ranqueada' as const } : {}),
    semana,
    nome: c.nome,
    nivel: c.nivel,
    classeId: c.classeId,
    pontos,
    lutas: 0,
    ...(oculto ? { oculto: true } : {}),
  };
}

/** Marca a semana no personagem; só grava quando a semana é nova. */
function comSemana(c: CharacterDocument, cfg: ConfigDoModo, semana: string): SemanaNaArena[] | null {
  const atuais = c[cfg.campo] ?? [];
  if (atuais.some((s) => s.semana === semana)) return null;
  return [...atuais, { semana }].slice(-SEMANAS_GUARDADAS);
}

// O pódio (10 primeiros) fica na memória por 30 segundos: muita gente abrindo a Arena custa poucas leituras
const GUARDA_DO_PODIO_MS = 30_000;
const podiosGuardados = new Map<string, { em: number; lista: EntradaDaArena[] }>();
export function limparCacheDaArena(): void {
  podiosGuardados.clear();
}
async function podio(cfg: ConfigDoModo, semana: string, agora: number): Promise<EntradaDaArena[]> {
  const chave = `${cfg.modo}/${semana}`;
  const g = podiosGuardados.get(chave);
  if (g && agora - g.em < GUARDA_DO_PODIO_MS) return g.lista;
  const lista = await repositorio.listarArenaTopo(semana, 10, cfg.modo);
  podiosGuardados.set(chave, { em: agora, lista });
  return lista;
}

const adversarioDe = (e: Pick<EntradaDaArena, 'uid' | 'nome' | 'nivel' | 'classeId' | 'pontos'>): AdversarioNaLista => ({ uid: e.uid, nome: e.nome, nivel: e.nivel, classeId: e.classeId, pontos: e.pontos });

/**
 * Os 5 adversários: os mais próximos em pontos na semana (na ranqueada, primeiro os de um ranque acima ou abaixo, e
 * sem ninguém ali, os do ranque mais próximo); se faltar gente (começo da semana, poucos jogadores), completa com
 * jogadores do nível 4 para cima que ainda não jogaram a semana.
 */
async function montarLista(uid: string, cfg: ConfigDoModo, semana: string, pontos: number): Promise<AdversarioNaLista[]> {
  const ocultos = await uidsComLimiteSilencioso();
  const fora = (id: string) => id === uid || ocultos.has(id);
  const [acima, abaixo] = await Promise.all([
    repositorio.listarArenaPerto(semana, pontos, true, 6, cfg.modo),
    repositorio.listarArenaPerto(semana, pontos, false, 6, cfg.modo),
  ]);
  let perto = [...acima, ...abaixo].filter((e) => !fora(e.uid)).sort((a, b) => Math.abs(a.pontos - pontos) - Math.abs(b.pontos - pontos));
  if (cfg.modo === 'ranqueada') {
    const meu = indiceDoRanque(pontos);
    const vizinhos = perto.filter((e) => Math.abs(indiceDoRanque(e.pontos) - meu) <= 1);
    if (vizinhos.length) perto = vizinhos;
  }
  const lista = perto.slice(0, ADVERSARIOS_NA_LISTA).map(adversarioDe);
  if (lista.length < ADVERSARIOS_NA_LISTA) {
    const ja = new Set([...acima, ...abaixo].map((e) => e.uid));
    const candidatos = (await repositorio.consultarTopo('nivel', 60)).filter((r) => r.uid && r.nivel >= NIVEL_DA_ARENA && !fora(r.uid) && !ja.has(r.uid));
    for (let i = candidatos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidatos[i], candidatos[j]] = [candidatos[j], candidatos[i]];
    }
    for (const r of candidatos.slice(0, ADVERSARIOS_NA_LISTA - lista.length)) lista.push({ uid: r.uid!, nome: r.nome, nivel: r.nivel, classeId: r.classeId, pontos: cfg.pontosPadrao });
  }
  return lista;
}

export interface EstadoDaArena {
  modo: ModoDaArena;
  nivelNecessario: number;
  podeLutar: boolean;
  semana: string;
  /** Quando a semana acaba (segunda à meia-noite de Brasília). */
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
  /** Ranqueada: os baús de escolha ainda não abertos e as cartas lendárias para escolher. */
  baus: BauDeEscolha[];
  cartasLendarias: { id: string; nome: string; categoria: string }[];
}

const acabaEm = (agora: Date) => new Date(`${fimDaSemana(semanaDe(agora))}T03:00:00.000Z`).toISOString();
const CARTAS_LENDARIAS = TIPOS_DE_CARTA.filter((t) => t.raridade === 'lendario');

export async function estadoDaArena(uid: string, agora = new Date(), modo: ModoDaArena = 'arena'): Promise<EstadoDaArena> {
  const cfg = configDe(modo);
  await mandarPremiosDaArena(uid, agora);
  const char = await repositorio.lerPersonagem(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  const semana = semanaDe(agora);
  const oculto = await comLimiteSilencioso(uid);
  let minha = await repositorio.lerEntradaDaArena(semana, uid, oculto, cfg.modo);
  const podeLutar = char.nivel >= NIVEL_DA_ARENA;
  // a lista é montada (e gravada) na primeira vez da semana
  if (podeLutar && !minha?.lista) {
    const base = minha ?? entradaNova(char, cfg, semana, oculto, await pontosDoComeco(char, cfg, semana, oculto));
    const adversarios = await montarLista(uid, cfg, semana, base.pontos);
    minha = await repositorio.executarTransacao(`${cfg.modo}:lista`, async (ctx) => {
      const atual = (await ctx.lerEntradaDaArena(semana, uid, oculto, cfg.modo)) ?? base;
      if (atual.lista) return atual;
      const nova = { ...atual, lista: { adversarios, trocadaEm: new Date(0).toISOString() } };
      ctx.gravarEntradaDaArena(nova);
      return nova;
    });
  }
  const top = await podio(cfg, semana, agora.getTime());
  const jogou = !!minha && minha.lutas + (minha.historico?.length ?? 0) > 0;
  const posicao = minha && !oculto && jogou ? (await repositorio.contarAcimaNaArena(semana, minha.pontos, cfg.modo)) + 1 : null;
  const hoje = diaDeBrasilia(agora);
  const lutas = lutasRestantes(minha, hoje);
  const trocaEm = minha?.lista ? Date.parse(minha.lista.trocadaEm) + TROCA_DA_LISTA_MS : 0;
  let pos = 0;
  return {
    modo: cfg.modo,
    nivelNecessario: NIVEL_DA_ARENA,
    podeLutar,
    semana,
    acabaEm: acabaEm(agora),
    pontos: minha?.pontos ?? (await pontosDoComeco(char, cfg, semana, oculto)),
    posicao,
    lutasRestantes: lutas.restantes,
    comprasFeitas: lutas.compradas,
    podeComprarLuta: cfg.podeComprarLuta && lutas.podeComprar,
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
    baus: cfg.modo === 'ranqueada' ? char.bausDeEscolha ?? [] : [],
    cartasLendarias: cfg.modo === 'ranqueada' ? CARTAS_LENDARIAS.map((t) => ({ id: t.id, nome: t.nome, categoria: t.categoria })) : [],
  };
}

/** Troca a lista de adversários (de graça, uma vez por hora). */
export async function trocarLista(uid: string, agora = new Date(), modo: ModoDaArena = 'arena'): Promise<{ mensagem: string }> {
  const cfg = configDe(modo);
  await exigirSistemaLigado(uid, cfg.sistema);
  const semana = semanaDe(agora);
  const oculto = await comLimiteSilencioso(uid);
  const char = await repositorio.lerPersonagem(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  if (char.nivel < NIVEL_DA_ARENA) throw new ErroDaArena(`A ${cfg.nome} abre no nível ${NIVEL_DA_ARENA}.`);
  const antes = await repositorio.lerEntradaDaArena(semana, uid, oculto, cfg.modo);
  const pontos = antes?.pontos ?? (await pontosDoComeco(char, cfg, semana, oculto));
  const adversarios = await montarLista(uid, cfg, semana, pontos);
  await repositorio.executarTransacao(`${cfg.modo}:trocarLista`, async (ctx) => {
    const atual = (await ctx.lerEntradaDaArena(semana, uid, oculto, cfg.modo)) ?? entradaNova(char, cfg, semana, oculto, pontos);
    if (atual.lista && Date.parse(atual.lista.trocadaEm) + TROCA_DA_LISTA_MS > agora.getTime()) {
      const min = Math.ceil((Date.parse(atual.lista.trocadaEm) + TROCA_DA_LISTA_MS - agora.getTime()) / 60_000);
      throw new ErroDaArena(`Você poderá trocar a lista de novo em ${min} min.`);
    }
    ctx.gravarEntradaDaArena({ ...atual, lista: { adversarios, trocadaEm: agora.toISOString() } });
  });
  return { mensagem: 'Lista de adversários trocada.' };
}

/** Compra uma luta a mais hoje (só na Arena: 5 Diamantes; até 5 por dia). */
export async function comprarLuta(uid: string, agora = new Date()): Promise<{ mensagem: string }> {
  const cfg = MODOS.arena;
  await exigirSistemaLigado(uid, cfg.sistema);
  const semana = semanaDe(agora);
  const hoje = diaDeBrasilia(agora);
  const oculto = await comLimiteSilencioso(uid);
  return repositorio.executarTransacao('arena:comprarLuta', async (ctx) => {
    let eu = await carregarPersonagem(ctx, uid);
    if (eu.nivel < NIVEL_DA_ARENA) throw new ErroDaArena(`A Arena abre no nível ${NIVEL_DA_ARENA}.`);
    const atual = (await ctx.lerEntradaDaArena(semana, uid, oculto)) ?? entradaNova(eu, cfg, semana, oculto, PONTOS_INICIAIS);
    const lutas = lutasRestantes(atual, hoje);
    if (!lutas.podeComprar) throw new ErroDaArena(`Você já comprou as ${COMPRAS_DE_LUTA_POR_DIA} lutas de hoje.`);
    eu = alterarSaldoEm(ctx, eu, 'diamantes', -PRECO_DA_LUTA_EM_DIAMANTES, 'Arena: luta extra').character;
    const doDia = atual.dia === hoje;
    ctx.gravarEntradaDaArena({ ...atual, dia: hoje, lutasHoje: doDia ? atual.lutasHoje ?? 0 : 0, comprasHoje: lutas.compradas + 1 });
    const semanas = comSemana(eu, cfg, semana);
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

/** Ataca um adversário da lista: a luta contra a ficha atual dele, os pontos e o replay. */
export async function lutar(uid: string, alvoBruto: unknown, ip: string, agora = new Date(), modo: ModoDaArena = 'arena'): Promise<ResultadoDaLuta> {
  const cfg = configDe(modo);
  await exigirSistemaLigado(uid, cfg.sistema);
  const alvo = typeof alvoBruto === 'string' && alvoBruto.length <= 128 ? alvoBruto : '';
  if (!alvo || alvo === uid) throw new ErroDaArena('Escolha um adversário da lista.');
  const semana = semanaDe(agora);
  const hoje = diaDeBrasilia(agora);
  const [eOculto, eleOculto] = await Promise.all([comLimiteSilencioso(uid), comLimiteSilencioso(alvo)]);
  // os pontos de começo da semana (na ranqueada vêm da semana anterior): lidos antes, fora da transação
  const [eu0, ele0] = await Promise.all([repositorio.lerPersonagem(uid), repositorio.lerPersonagem(alvo)]);
  const [meuComeco, deleComeco] = await Promise.all([pontosDoComeco(eu0, cfg, semana, eOculto), pontosDoComeco(ele0, cfg, semana, eleOculto)]);
  const marca = marcaDaRede(ip);
  const semente = gerarSementeCombate();
  return repositorio.executarTransacao(`${cfg.modo}:lutar`, async (ctx: ContextoTransacao) => {
    const eu = await carregarPersonagem(ctx, uid);
    if (eu.nivel < NIVEL_DA_ARENA) throw new ErroDaArena(`A ${cfg.nome} abre no nível ${NIVEL_DA_ARENA}.`);
    const ele = await carregarPersonagem(ctx, alvo, 'Esse adversário não existe mais. Troque a lista.');
    const minha = (await ctx.lerEntradaDaArena(semana, uid, eOculto, cfg.modo)) ?? entradaNova(eu, cfg, semana, eOculto, meuComeco);
    if (!minha.lista?.adversarios.some((a) => a.uid === alvo)) throw new ErroDaArena('Esse adversário não está na sua lista. Atualize a tela.');
    if (lutasRestantes(minha, hoje).restantes <= 0)
      throw new ErroDaArena(cfg.podeComprarLuta ? 'Suas lutas de hoje acabaram. Compre uma luta extra ou volte amanhã.' : 'Suas lutas de hoje acabaram. Volte amanhã.');
    const contraEleHoje = (minha.historico ?? []).filter((h) => h.atacou && h.adversarioUid === alvo && diaDeBrasilia(new Date(h.em)) === hoje).length;
    if (contraEleHoje >= ATAQUES_NO_MESMO_POR_DIA) throw new ErroDaArena(`Você já atacou ${ele.nome} ${ATAQUES_NO_MESMO_POR_DIA} vezes hoje.`);
    const dele = (await ctx.lerEntradaDaArena(semana, alvo, eleOculto, cfg.modo)) ?? entradaNova(ele, cfg, semana, eleOculto, deleComeco);

    const fichaA = combatenteDoPersonagem(eu);
    const fichaB = combatenteDoPersonagem(ele);
    const combate = resolverCombatePvp(fichaA, fichaB, semente);
    // contra trapaça: vitória contra conta criada na mesma rede (nas últimas 24 horas) não muda os pontos
    const mesmaRede = !!marca && !!(await ctx.lerCadastrosDaRede(marca))?.contas.some((c) => c.uid === alvo);
    const novos = mesmaRede ? { atacante: minha.pontos, defensor: dele.pontos } : cfg.pontosDepois(minha.pontos, dele.pontos, combate.vencedor);

    const vaga = minha.proximaVaga ?? 0;
    const replay = `${uid}_${cfg.prefixoReplay}${vaga}`;
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
    const minhasSemanas = comSemana(eu, cfg, semana);
    if (minhasSemanas) salvarPersonagem(ctx, eu, { [cfg.campo]: minhasSemanas });
    const semanasDele = comSemana(ele, cfg, semana);
    if (semanasDele) salvarPersonagem(ctx, ele, { [cfg.campo]: semanasDele });

    const ganhos = novos.atacante - minha.pontos;
    const placar = `${ganhos >= 0 ? '+' : ''}${ganhos} pontos`;
    const subiu = cfg.modo === 'ranqueada' && indiceDoRanque(novos.atacante) > indiceDoRanque(minha.pontos) ? ` Você subiu para ${RANQUES[indiceDoRanque(novos.atacante)].nome}!` : '';
    const caiu = cfg.modo === 'ranqueada' && indiceDoRanque(novos.atacante) < indiceDoRanque(minha.pontos) ? ` Você caiu para ${RANQUES[indiceDoRanque(novos.atacante)].nome}.` : '';
    return {
      mensagem:
        (empate
          ? `Empate com ${ele.nome}: no PvP, os dois perdem (${placar}).`
          : combate.vencedor === 'a'
            ? `Você venceu ${ele.nome}! ${placar}.`
            : `${ele.nome} venceu. ${placar}.`) +
        subiu +
        caiu,
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
export async function verReplay(
  uid: string,
  lutaIdBruto: unknown,
  agora = new Date(),
  modo: ModoDaArena = 'arena'
): Promise<{ combate: ResultadoCombatePvp; lados: { a: LadoNaTela; b: LadoNaTela }; em: string }> {
  const cfg = configDe(modo);
  const lutaId = typeof lutaIdBruto === 'string' ? lutaIdBruto : '';
  const semana = semanaDe(agora);
  const oculto = await comLimiteSilencioso(uid);
  const minha = await repositorio.lerEntradaDaArena(semana, uid, oculto, cfg.modo);
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

/** Abre um baú de escolha (o de carta lendária do Eterno): a carta escolhida vai para a mochila (cheia: pelo Correio). */
export async function abrirBauDeEscolha(uid: string, bauBruto: unknown, cartaBruta: unknown, agora = new Date()): Promise<{ mensagem: string }> {
  const bauId = typeof bauBruto === 'string' ? bauBruto : '';
  const tipo = CARTAS_LENDARIAS.find((t) => t.id === cartaBruta);
  if (!tipo) throw new ErroDaArena('Escolha a carta lendária.');
  return repositorio.executarTransacao('ranqueada:abrirBau', async (ctx) => {
    let eu = await carregarPersonagem(ctx, uid);
    const bau = (eu.bausDeEscolha ?? []).find((b) => b.id === bauId);
    if (!bau) throw new ErroDaArena('Esse baú já foi aberto.');
    const carta = criarCarta(randomUUID(), tipo.id, sorteadorDaSemente(randomInt(1, 2 ** 31)));
    const r = entregarItem(ctx, eu, { tipo: 'carta', carta }, `Baú de escolha: ${tipo.nome}`);
    eu = r.doc;
    const correio = r.pelaCaixa
      ? comMensagem(eu.correio, novaMensagem({ titulo: 'Baú de escolha', texto: `${tipo.nome} não cabia na sua mochila e chegou pelo Correio.`, de: 'Arena ranqueada', presente: r.pelaCaixa }, agora), agora)
      : eu.correio;
    const bausDeEscolha = (eu.bausDeEscolha ?? []).filter((b) => b.id !== bauId);
    salvarPersonagem(ctx, eu, { ...r.patch, correio, bausDeEscolha: bausDeEscolha.length ? bausDeEscolha : undefined });
    return { mensagem: `Você escolheu ${tipo.nome}.${r.pelaCaixa ? ' Ela não cabia na mochila e foi para o Correio.' : ''}` };
  });
}
