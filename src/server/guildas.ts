import { randomBytes } from 'node:crypto';
import {
  administraEntrada,
  chaveDoNomeDaGuilda,
  CONVITES_DA_GUILDA,
  CONVITES_DO_JOGADOR,
  membrosEmOrdem,
  NOME_DO_CARGO,
  PEDIDOS_DA_GUILDA,
  PEDIDOS_DO_JOGADOR,
  podeExpulsar,
  resumoDaGuilda,
  sucessorDoLider,
  validarDescricaoDaGuilda,
  validarNomeDaGuilda,
  type CargoDaGuilda,
  type ConviteDaGuilda,
  type GuildaDocumento,
  type MembroDaGuilda,
  type PedidoDaGuilda,
  type RegrasDeGuilda,
  type ResumoDaGuilda,
} from '@/rules/guilda';
import { PREFIXO_MAXIMO_DA_BUSCA, PREFIXO_MINIMO_DA_BUSCA } from '@/rules/social';
import { alterarSaldoEm, carregarPersonagem, salvarPersonagem, type CharacterDocument } from '@/server/characterService';
import { chaveDoNome, chaveDoNomeDeGuilda, repositorio, type ContextoTransacao } from '@/server/persistencia';
import { exigirSistemaLigado, lerConfiguracaoDeSistemas } from '@/server/sistemasLeitura';

/**
 * Guildas (7.3). Toda mudança é uma transação que lê e grava juntos o documento da guilda e o dos personagens
 * envolvidos: duas pessoas aceitando o último lugar ao mesmo tempo não passam do máximo, e ninguém fica em duas
 * guildas. Convites e pedidos que ficaram velhos (a guilda acabou, o jogador entrou noutra) são limpos quando
 * alguém olha ou tenta usá-los.
 */

export class ErroDeGuilda extends Error {
  constructor(
    mensagem: string,
    readonly status: 400 | 404 | 409 = 400
  ) {
    super(mensagem);
    this.name = 'ErroDeGuilda';
  }
}

/** Quantas guildas a lista (sem busca) mostra; ela fica 60 s na memória do servidor. */
export const GUILDAS_NA_LISTA = 20;
const GUARDA_DA_LISTA_MS = 60_000;
let listaGuardada: { em: number; guildas: ResumoDaGuilda[] } | null = null;

export function limparCacheDasGuildas(): void {
  listaGuardada = null;
}

const novoIdDeGuilda = () => `g_${randomBytes(9).toString('hex').slice(0, 14)}`;
const agora = () => new Date().toISOString();
const sem = (lista: readonly string[] | undefined, id: string) => (lista ?? []).filter((x) => x !== id);
const vazioParaUndefined = (lista: string[]) => (lista.length ? lista : undefined);

async function regras(): Promise<RegrasDeGuilda> {
  return (await lerConfiguracaoDeSistemas()).guildas;
}

// ---------------------------------------------------------------------------
// Peças usadas dentro das transações
// ---------------------------------------------------------------------------

/** A guilda do personagem e o lugar dele nela; erro se ele não está numa guilda. */
async function minhaGuildaNoContexto(ctx: ContextoTransacao, eu: CharacterDocument): Promise<{ guilda: GuildaDocumento; eu: MembroDaGuilda }> {
  const guilda = eu.guildaId ? await ctx.lerGuilda(eu.guildaId) : null;
  const membro = guilda?.membros.find((m) => m.uid === eu.uid);
  if (!guilda || !membro) throw new ErroDeGuilda('Você não está numa guilda.', 404);
  return { guilda, eu: membro };
}

/** Está mesmo numa guilda (o id no personagem pode ser de uma guilda que já acabou). */
async function estaNumaGuilda(ctx: ContextoTransacao, jogador: CharacterDocument): Promise<boolean> {
  if (!jogador.guildaId) return false;
  return (await ctx.lerGuilda(jogador.guildaId))?.membros.some((m) => m.uid === jogador.uid) ?? false;
}

function exigirCargo(membro: MembroDaGuilda, permitido: (c: CargoDaGuilda) => boolean, mensagem: string) {
  if (!permitido(membro.cargo)) throw new ErroDeGuilda(mensagem);
}

/**
 * Tira o jogador dos convites e pedidos das outras guildas (ele acabou de entrar numa, ou vai sair da conta).
 * Lê as guildas antes de gravar qualquer coisa, como o Firestore exige.
 */
async function limparPendenciasNoContexto(ctx: ContextoTransacao, jogador: CharacterDocument, exceto?: string): Promise<void> {
  const ids = [...new Set([...(jogador.convitesDeGuilda ?? []), ...(jogador.pedidosDeGuilda ?? [])])].filter((id) => id !== exceto);
  const guildas = await Promise.all(ids.map((id) => ctx.lerGuilda(id)));
  for (const g of guildas) {
    if (!g) continue;
    const convites = g.convites.filter((c) => c.uid !== jogador.uid);
    const pedidos = g.pedidos.filter((p) => p.uid !== jogador.uid);
    if (convites.length !== g.convites.length || pedidos.length !== g.pedidos.length) ctx.gravarGuilda({ ...g, convites, pedidos });
  }
}

/** Põe o jogador na guilda como Membro (a guilda já foi lida e conferida) e grava os dois lados. */
function entrarNoContexto(ctx: ContextoTransacao, guilda: GuildaDocumento, jogador: CharacterDocument): void {
  const membro: MembroDaGuilda = { uid: jogador.uid, nome: jogador.nome, cargo: 'membro', entrouEm: agora() };
  ctx.gravarGuilda({
    ...guilda,
    membros: [...guilda.membros, membro],
    convites: guilda.convites.filter((c) => c.uid !== jogador.uid),
    pedidos: guilda.pedidos.filter((p) => p.uid !== jogador.uid),
  });
  salvarPersonagem(ctx, jogador, { guildaId: guilda.id, guildaNome: guilda.nome, convitesDeGuilda: undefined, pedidosDeGuilda: undefined });
}

function exigirVaga(guilda: GuildaDocumento, r: RegrasDeGuilda) {
  if (guilda.membros.length >= r.maxMembros) throw new ErroDeGuilda(`A guilda está cheia (${r.maxMembros} membros).`, 409);
}

/**
 * Desfaz a guilda: tira todos os membros, limpa os convites e pedidos dos jogadores e libera o nome.
 * Até 50 membros + 40 pendências: cabe com folga no limite de uma transação do Firestore.
 */
async function desfazerNoContexto(ctx: ContextoTransacao, guilda: GuildaDocumento, ignorar?: string): Promise<void> {
  const uids = [...new Set([...guilda.membros.map((m) => m.uid), ...guilda.convites.map((c) => c.uid), ...guilda.pedidos.map((p) => p.uid)])].filter((u) => u !== ignorar);
  const jogadores = await Promise.all(uids.map((u) => ctx.lerPersonagem(u)));
  for (const j of jogadores) {
    if (!j) continue;
    const naGuilda = j.guildaId === guilda.id;
    const convites = sem(j.convitesDeGuilda, guilda.id);
    const pedidos = sem(j.pedidosDeGuilda, guilda.id);
    if (!naGuilda && convites.length === (j.convitesDeGuilda ?? []).length && pedidos.length === (j.pedidosDeGuilda ?? []).length) continue;
    ctx.gravarPersonagem({
      ...j,
      ...(naGuilda ? { guildaId: undefined, guildaNome: undefined } : {}),
      convitesDeGuilda: vazioParaUndefined(convites),
      pedidosDeGuilda: vazioParaUndefined(pedidos),
    });
  }
  ctx.apagarGuilda(guilda.id);
  ctx.liberarNomeDeGuilda(chaveDoNomeDeGuilda(guilda.nome));
}

// ---------------------------------------------------------------------------
// Leitura (tela da guilda)
// ---------------------------------------------------------------------------

export interface MinhaGuilda {
  id: string;
  nome: string;
  descricao: string;
  criadaEm: string;
  meuCargo: CargoDaGuilda;
  membros: MembroDaGuilda[];
  maxMembros: number;
  /** Só para Líder e Oficial. */
  convites: ConviteDaGuilda[];
  pedidos: PedidoDaGuilda[];
}

export interface EstadoDaGuilda {
  regras: RegrasDeGuilda;
  /** O que o jogador tem para criar (para a tela avisar o que falta). */
  eu: { nome: string; nivel: number; ouro: number };
  minha: MinhaGuilda | null;
  /** Guildas que convidaram o jogador e para onde ele pediu para entrar (só as que ainda valem). */
  convites: ResumoDaGuilda[];
  pedidos: ResumoDaGuilda[];
}

/**
 * O estado do jogador nas guildas. Custa 1 leitura do personagem + 1 da guilda (ou até 8 das guildas dos convites
 * e pedidos). Se encontrar algo velho (guilda que acabou, convite que já não vale), conserta o personagem numa
 * transação curta, para não se repetir.
 */
export async function estadoDaGuilda(uid: string): Promise<EstadoDaGuilda> {
  const r = await regras();
  const char = await repositorio.lerPersonagem(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  const eu = { nome: char.nome, nivel: char.nivel, ouro: char.ouro ?? 0 };

  if (char.guildaId) {
    const g = await repositorio.lerGuilda(char.guildaId);
    const membro = g?.membros.find((m) => m.uid === uid);
    if (g && membro) {
      const admin = administraEntrada(membro.cargo);
      return {
        regras: r,
        eu,
        minha: { id: g.id, nome: g.nome, descricao: g.descricao, criadaEm: g.criadaEm, meuCargo: membro.cargo, membros: membrosEmOrdem(g.membros), maxMembros: r.maxMembros, convites: admin ? g.convites : [], pedidos: admin ? g.pedidos : [] },
        convites: [],
        pedidos: [],
      };
    }
  }

  const ids = [...new Set([...(char.convitesDeGuilda ?? []), ...(char.pedidosDeGuilda ?? [])])];
  const guildas = new Map((await Promise.all(ids.map((id) => repositorio.lerGuilda(id)))).flatMap((g) => (g ? [[g.id, g] as const] : [])));
  const convitesValidos = (char.convitesDeGuilda ?? []).filter((id) => guildas.get(id)?.convites.some((c) => c.uid === uid));
  const pedidosValidos = (char.pedidosDeGuilda ?? []).filter((id) => guildas.get(id)?.pedidos.some((p) => p.uid === uid));
  const guildaVelha = char.guildaId !== undefined;
  if (guildaVelha || convitesValidos.length !== (char.convitesDeGuilda ?? []).length || pedidosValidos.length !== (char.pedidosDeGuilda ?? []).length) {
    await repositorio.executarTransacao('guilda:consertar', async (ctx) => {
      const atual = await carregarPersonagem(ctx, uid);
      const g = atual.guildaId ? await ctx.lerGuilda(atual.guildaId) : null;
      const aindaMembro = g?.membros.some((m) => m.uid === uid);
      salvarPersonagem(ctx, atual, {
        ...(aindaMembro ? {} : { guildaId: undefined, guildaNome: undefined }),
        convitesDeGuilda: vazioParaUndefined((atual.convitesDeGuilda ?? []).filter((id) => convitesValidos.includes(id) || !ids.includes(id))),
        pedidosDeGuilda: vazioParaUndefined((atual.pedidosDeGuilda ?? []).filter((id) => pedidosValidos.includes(id) || !ids.includes(id))),
      });
    });
  }
  return {
    regras: r,
    eu,
    minha: null,
    convites: convitesValidos.map((id) => resumoDaGuilda(guildas.get(id)!)),
    pedidos: pedidosValidos.map((id) => resumoDaGuilda(guildas.get(id)!)),
  };
}

export interface GuildaPublica extends ResumoDaGuilda {
  criadaEm: string;
  maxMembros: number;
  membros: { nome: string; cargo: CargoDaGuilda }[];
}

/** A página pública de uma guilda (qualquer jogador vê): 1 leitura. */
export async function verGuilda(id: unknown): Promise<GuildaPublica> {
  const g = typeof id === 'string' && /^g_[a-z0-9]{6,32}$/.test(id) ? await repositorio.lerGuilda(id) : null;
  if (!g) throw new ErroDeGuilda('Essa guilda não existe (ou foi desfeita).', 404);
  return { ...resumoDaGuilda(g), criadaEm: g.criadaEm, maxMembros: (await regras()).maxMembros, membros: membrosEmOrdem(g.membros).map((m) => ({ nome: m.nome, cargo: m.cargo })) };
}

/** As guildas com mais membros (sem texto) ou as que começam com o texto (2 a 24 letras). */
export async function listarGuildasParaJogador(texto: unknown): Promise<ResumoDaGuilda[]> {
  const prefixo = typeof texto === 'string' ? chaveDoNomeDaGuilda(texto) : '';
  if (prefixo) {
    if (prefixo.length < PREFIXO_MINIMO_DA_BUSCA) throw new ErroDeGuilda(`Digite pelo menos ${PREFIXO_MINIMO_DA_BUSCA} letras do nome da guilda.`);
    if (prefixo.length > PREFIXO_MAXIMO_DA_BUSCA) throw new ErroDeGuilda('Esse nome é longo demais.');
    return (await repositorio.buscarGuildasPorPrefixo(prefixo, GUILDAS_NA_LISTA)).map(resumoDaGuilda);
  }
  if (listaGuardada && Date.now() - listaGuardada.em < GUARDA_DA_LISTA_MS) return listaGuardada.guildas;
  const guildas = (await repositorio.listarGuildas(GUILDAS_NA_LISTA)).map(resumoDaGuilda);
  listaGuardada = { em: Date.now(), guildas };
  return guildas;
}

// ---------------------------------------------------------------------------
// Ações
// ---------------------------------------------------------------------------

export const ACOES_DE_GUILDA = [
  'criar',
  'convidar',
  'cancelarConvite',
  'aceitarConvite',
  'recusarConvite',
  'pedir',
  'cancelarPedido',
  'aceitarPedido',
  'recusarPedido',
  'sair',
  'expulsar',
  'promover',
  'rebaixar',
  'transferir',
  'desfazer',
  'editarDescricao',
] as const;
export type AcaoDeGuilda = (typeof ACOES_DE_GUILDA)[number];
export const ehAcaoDeGuilda = (v: unknown): v is AcaoDeGuilda => typeof v === 'string' && (ACOES_DE_GUILDA as readonly string[]).includes(v);

export interface PedidoDeAcao {
  /** criar, desfazer (confirmação): o nome da guilda. convidar: o nome do personagem. */
  nome?: unknown;
  descricao?: unknown;
  /** aceitarConvite, recusarConvite, pedir, cancelarPedido. */
  guildaId?: unknown;
  /** O personagem alvo (cancelarConvite, aceitarPedido, recusarPedido, expulsar, promover, rebaixar, transferir). */
  uid?: unknown;
}

const idDeGuilda = (v: unknown): string => {
  if (typeof v !== 'string' || !/^g_[a-z0-9]{6,32}$/.test(v)) throw new ErroDeGuilda('Guilda inválida.');
  return v;
};
const uidAlvo = (v: unknown): string => {
  if (typeof v !== 'string' || !v || v.length > 128) throw new ErroDeGuilda('Jogador inválido.');
  return v;
};

/** Faz a ação e devolve a mensagem para o jogador; a tela recarrega o estado em seguida. */
export async function agirNaGuilda(uid: string, acao: unknown, pedido: PedidoDeAcao): Promise<{ mensagem: string }> {
  if (!ehAcaoDeGuilda(acao)) throw new ErroDeGuilda('Ação desconhecida.');
  await exigirSistemaLigado(uid, 'guildas');
  const r = await regras();
  const resultado = await ACOES[acao](uid, pedido, r);
  limparCacheDasGuildas();
  return resultado;
}

type Acao = (uid: string, pedido: PedidoDeAcao, r: RegrasDeGuilda) => Promise<{ mensagem: string }>;

const ACOES: Record<AcaoDeGuilda, Acao> = {
  async criar(uid, pedido, r) {
    const nome = validarNomeDaGuilda(pedido.nome);
    if (!nome.ok) throw new ErroDeGuilda(nome.erro);
    const descricao = validarDescricaoDaGuilda(pedido.descricao);
    if (!descricao.ok) throw new ErroDeGuilda(descricao.erro);
    return repositorio.executarTransacao('guilda:criar', async (ctx) => {
      let eu = await carregarPersonagem(ctx, uid);
      if (await estaNumaGuilda(ctx, eu)) throw new ErroDeGuilda('Você já está numa guilda. Saia dela antes de criar outra.', 409);
      if (eu.nivel < r.nivelMinimo) throw new ErroDeGuilda(`Você precisa do nível ${r.nivelMinimo} para criar uma guilda.`);
      const chave = chaveDoNomeDeGuilda(nome.nome);
      if (await ctx.lerDonoDoNomeDeGuilda(chave)) throw new ErroDeGuilda('Já existe uma guilda com esse nome.', 409);
      await limparPendenciasNoContexto(ctx, eu);
      if (r.custoOuro > 0) {
        if ((eu.ouro ?? 0) < r.custoOuro) throw new ErroDeGuilda(`Você precisa de ${r.custoOuro} de ouro para criar uma guilda.`);
        eu = alterarSaldoEm(ctx, eu, 'ouro', -r.custoOuro, `Criação da guilda ${nome.nome}`).character;
      }
      const id = novoIdDeGuilda();
      const em = agora();
      ctx.gravarGuilda({ id, nome: nome.nome, nomeBusca: chaveDoNomeDaGuilda(nome.nome), descricao: descricao.descricao, criadaEm: em, membros: [{ uid, nome: eu.nome, cargo: 'lider', entrouEm: em }], convites: [], pedidos: [], quantidadeMembros: 1 });
      ctx.reservarNomeDeGuilda(chave, id, nome.nome);
      salvarPersonagem(ctx, eu, { ouro: eu.ouro, guildaId: id, guildaNome: nome.nome, convitesDeGuilda: undefined, pedidosDeGuilda: undefined });
      return { mensagem: `A guilda ${nome.nome} foi criada. Você é o Líder.` };
    });
  },

  async convidar(uid, pedido, r) {
    if (typeof pedido.nome !== 'string' || pedido.nome.trim().length < 2) throw new ErroDeGuilda('Digite o nome do personagem que você quer convidar.');
    const nomeAlvo = pedido.nome.trim();
    return repositorio.executarTransacao('guilda:convidar', async (ctx) => {
      const eu = await carregarPersonagem(ctx, uid);
      const { guilda, eu: membro } = await minhaGuildaNoContexto(ctx, eu);
      exigirCargo(membro, administraEntrada, 'Só o Líder e os Oficiais convidam.');
      const alvoUid = await ctx.lerDonoDoNome(chaveDoNome(nomeAlvo));
      const alvo = alvoUid ? await ctx.lerPersonagem(alvoUid) : null;
      if (!alvo) throw new ErroDeGuilda(`Nenhum personagem com o nome "${nomeAlvo}".`, 404);
      if (guilda.membros.some((m) => m.uid === alvo.uid)) throw new ErroDeGuilda(`${alvo.nome} já está na guilda.`, 409);
      if (await estaNumaGuilda(ctx, alvo)) throw new ErroDeGuilda(`${alvo.nome} já está numa guilda.`, 409);
      if (guilda.convites.some((c) => c.uid === alvo.uid)) throw new ErroDeGuilda(`${alvo.nome} já foi convidado(a).`, 409);
      if (guilda.pedidos.some((p) => p.uid === alvo.uid)) throw new ErroDeGuilda(`${alvo.nome} já pediu para entrar: aceite o pedido.`, 409);
      exigirVaga(guilda, r);
      if (guilda.convites.length >= CONVITES_DA_GUILDA) throw new ErroDeGuilda(`A guilda já tem ${CONVITES_DA_GUILDA} convites esperando resposta. Cancele algum antes.`, 409);
      if ((alvo.convitesDeGuilda ?? []).length >= CONVITES_DO_JOGADOR) throw new ErroDeGuilda(`${alvo.nome} tem convites demais esperando resposta.`, 409);
      ctx.gravarGuilda({ ...guilda, convites: [...guilda.convites, { uid: alvo.uid, nome: alvo.nome, por: eu.nome, em: agora() }] });
      ctx.gravarPersonagem({ ...alvo, convitesDeGuilda: [...(alvo.convitesDeGuilda ?? []), guilda.id] });
      return { mensagem: `Convite enviado para ${alvo.nome}.` };
    });
  },

  async cancelarConvite(uid, pedido) {
    const alvoUid = uidAlvo(pedido.uid);
    return repositorio.executarTransacao('guilda:cancelarConvite', async (ctx) => {
      const eu = await carregarPersonagem(ctx, uid);
      const { guilda, eu: membro } = await minhaGuildaNoContexto(ctx, eu);
      exigirCargo(membro, administraEntrada, 'Só o Líder e os Oficiais cancelam convites.');
      const convite = guilda.convites.find((c) => c.uid === alvoUid);
      if (!convite) throw new ErroDeGuilda('Esse convite não existe mais.', 404);
      const alvo = await ctx.lerPersonagem(alvoUid);
      ctx.gravarGuilda({ ...guilda, convites: guilda.convites.filter((c) => c.uid !== alvoUid) });
      if (alvo) ctx.gravarPersonagem({ ...alvo, convitesDeGuilda: vazioParaUndefined(sem(alvo.convitesDeGuilda, guilda.id)) });
      return { mensagem: `Convite de ${convite.nome} cancelado.` };
    });
  },

  async aceitarConvite(uid, pedido, r) {
    const id = idDeGuilda(pedido.guildaId);
    return repositorio.executarTransacao('guilda:aceitarConvite', async (ctx) => {
      const eu = await carregarPersonagem(ctx, uid);
      if (await estaNumaGuilda(ctx, eu)) throw new ErroDeGuilda('Você já está numa guilda.', 409);
      const guilda = await ctx.lerGuilda(id);
      if (!guilda || !guilda.convites.some((c) => c.uid === uid)) throw new ErroDeGuilda('Esse convite não vale mais.', 404);
      exigirVaga(guilda, r);
      await limparPendenciasNoContexto(ctx, eu, id);
      entrarNoContexto(ctx, guilda, eu);
      return { mensagem: `Você entrou na guilda ${guilda.nome}.` };
    });
  },

  async recusarConvite(uid, pedido) {
    const id = idDeGuilda(pedido.guildaId);
    return repositorio.executarTransacao('guilda:recusarConvite', async (ctx) => {
      const eu = await carregarPersonagem(ctx, uid);
      const guilda = await ctx.lerGuilda(id);
      if (guilda) ctx.gravarGuilda({ ...guilda, convites: guilda.convites.filter((c) => c.uid !== uid) });
      salvarPersonagem(ctx, eu, { convitesDeGuilda: vazioParaUndefined(sem(eu.convitesDeGuilda, id)) });
      return { mensagem: 'Convite recusado.' };
    });
  },

  async pedir(uid, pedido, r) {
    const id = idDeGuilda(pedido.guildaId);
    return repositorio.executarTransacao('guilda:pedir', async (ctx) => {
      const eu = await carregarPersonagem(ctx, uid);
      if (await estaNumaGuilda(ctx, eu)) throw new ErroDeGuilda('Você já está numa guilda.', 409);
      const guilda = await ctx.lerGuilda(id);
      if (!guilda) throw new ErroDeGuilda('Essa guilda não existe (ou foi desfeita).', 404);
      if (guilda.convites.some((c) => c.uid === uid)) throw new ErroDeGuilda('Essa guilda já convidou você: aceite o convite.', 409);
      if (guilda.pedidos.some((p) => p.uid === uid)) throw new ErroDeGuilda('Você já pediu para entrar nessa guilda.', 409);
      exigirVaga(guilda, r);
      if (guilda.pedidos.length >= PEDIDOS_DA_GUILDA) throw new ErroDeGuilda('Essa guilda tem pedidos demais esperando. Tente mais tarde.', 409);
      if ((eu.pedidosDeGuilda ?? []).length >= PEDIDOS_DO_JOGADOR) throw new ErroDeGuilda(`Você já tem ${PEDIDOS_DO_JOGADOR} pedidos esperando resposta. Cancele algum antes.`, 409);
      ctx.gravarGuilda({ ...guilda, pedidos: [...guilda.pedidos, { uid, nome: eu.nome, nivel: eu.nivel, classeId: eu.classeId, em: agora() }] });
      salvarPersonagem(ctx, eu, { pedidosDeGuilda: [...(eu.pedidosDeGuilda ?? []), id] });
      return { mensagem: `Pedido enviado para a guilda ${guilda.nome}.` };
    });
  },

  async cancelarPedido(uid, pedido) {
    const id = idDeGuilda(pedido.guildaId);
    return repositorio.executarTransacao('guilda:cancelarPedido', async (ctx) => {
      const eu = await carregarPersonagem(ctx, uid);
      const guilda = await ctx.lerGuilda(id);
      if (guilda) ctx.gravarGuilda({ ...guilda, pedidos: guilda.pedidos.filter((p) => p.uid !== uid) });
      salvarPersonagem(ctx, eu, { pedidosDeGuilda: vazioParaUndefined(sem(eu.pedidosDeGuilda, id)) });
      return { mensagem: 'Pedido cancelado.' };
    });
  },

  async aceitarPedido(uid, pedido, r) {
    const alvoUid = uidAlvo(pedido.uid);
    return repositorio.executarTransacao('guilda:aceitarPedido', async (ctx) => {
      const eu = await carregarPersonagem(ctx, uid);
      const { guilda, eu: membro } = await minhaGuildaNoContexto(ctx, eu);
      exigirCargo(membro, administraEntrada, 'Só o Líder e os Oficiais aceitam pedidos.');
      const pedidoDele = guilda.pedidos.find((p) => p.uid === alvoUid);
      if (!pedidoDele) throw new ErroDeGuilda('Esse pedido não existe mais.', 404);
      exigirVaga(guilda, r);
      const alvo = await ctx.lerPersonagem(alvoUid);
      const alvoLivre = alvo !== null && !(await estaNumaGuilda(ctx, alvo));
      if (alvoLivre) await limparPendenciasNoContexto(ctx, alvo, guilda.id);
      if (!alvoLivre) {
        // Entrou noutra guilda (ou saiu do jogo) depois do pedido: só tira o pedido velho
        ctx.gravarGuilda({ ...guilda, pedidos: guilda.pedidos.filter((p) => p.uid !== alvoUid) });
        return { mensagem: `${pedidoDele.nome} já não pode entrar (está noutra guilda). O pedido foi removido.` };
      }
      entrarNoContexto(ctx, guilda, alvo);
      return { mensagem: `${alvo.nome} entrou na guilda.` };
    });
  },

  async recusarPedido(uid, pedido) {
    const alvoUid = uidAlvo(pedido.uid);
    return repositorio.executarTransacao('guilda:recusarPedido', async (ctx) => {
      const eu = await carregarPersonagem(ctx, uid);
      const { guilda, eu: membro } = await minhaGuildaNoContexto(ctx, eu);
      exigirCargo(membro, administraEntrada, 'Só o Líder e os Oficiais recusam pedidos.');
      const pedidoDele = guilda.pedidos.find((p) => p.uid === alvoUid);
      if (!pedidoDele) throw new ErroDeGuilda('Esse pedido não existe mais.', 404);
      const alvo = await ctx.lerPersonagem(alvoUid);
      ctx.gravarGuilda({ ...guilda, pedidos: guilda.pedidos.filter((p) => p.uid !== alvoUid) });
      if (alvo) ctx.gravarPersonagem({ ...alvo, pedidosDeGuilda: vazioParaUndefined(sem(alvo.pedidosDeGuilda, guilda.id)) });
      return { mensagem: `Pedido de ${pedidoDele.nome} recusado.` };
    });
  },

  async sair(uid) {
    return repositorio.executarTransacao('guilda:sair', async (ctx) => {
      const eu = await carregarPersonagem(ctx, uid);
      const { guilda, eu: membro } = await minhaGuildaNoContexto(ctx, eu);
      if (membro.cargo === 'lider') {
        if (guilda.membros.length > 1) throw new ErroDeGuilda('Passe a liderança para outro membro antes de sair (ou desfaça a guilda).', 409);
        await desfazerNoContexto(ctx, guilda, uid);
        salvarPersonagem(ctx, eu, { guildaId: undefined, guildaNome: undefined });
        return { mensagem: `Você saiu e a guilda ${guilda.nome} foi desfeita (você era o único membro).` };
      }
      ctx.gravarGuilda({ ...guilda, membros: guilda.membros.filter((m) => m.uid !== uid) });
      salvarPersonagem(ctx, eu, { guildaId: undefined, guildaNome: undefined });
      return { mensagem: `Você saiu da guilda ${guilda.nome}.` };
    });
  },

  async expulsar(uid, pedido) {
    const alvoUid = uidAlvo(pedido.uid);
    return repositorio.executarTransacao('guilda:expulsar', async (ctx) => {
      const eu = await carregarPersonagem(ctx, uid);
      const { guilda, eu: membro } = await minhaGuildaNoContexto(ctx, eu);
      const alvo = guilda.membros.find((m) => m.uid === alvoUid);
      if (!alvo) throw new ErroDeGuilda('Esse jogador não está na guilda.', 404);
      if (!podeExpulsar(membro.cargo, alvo.cargo)) throw new ErroDeGuilda(membro.cargo === 'oficial' ? 'Oficiais só expulsam Membros.' : 'Você não pode expulsar ninguém.');
      const doc = await ctx.lerPersonagem(alvoUid);
      ctx.gravarGuilda({ ...guilda, membros: guilda.membros.filter((m) => m.uid !== alvoUid) });
      if (doc?.guildaId === guilda.id) ctx.gravarPersonagem({ ...doc, guildaId: undefined, guildaNome: undefined });
      return { mensagem: `${alvo.nome} foi expulso(a) da guilda.` };
    });
  },

  async promover(uid, pedido) {
    return mudarCargo(uid, pedido, 'membro', 'oficial');
  },

  async rebaixar(uid, pedido) {
    return mudarCargo(uid, pedido, 'oficial', 'membro');
  },

  async transferir(uid, pedido) {
    const alvoUid = uidAlvo(pedido.uid);
    return repositorio.executarTransacao('guilda:transferir', async (ctx) => {
      const eu = await carregarPersonagem(ctx, uid);
      const { guilda, eu: membro } = await minhaGuildaNoContexto(ctx, eu);
      exigirCargo(membro, (c) => c === 'lider', 'Só o Líder passa a liderança.');
      const alvo = guilda.membros.find((m) => m.uid === alvoUid);
      if (!alvo || alvo.uid === uid) throw new ErroDeGuilda('Escolha outro membro da guilda.', 404);
      ctx.gravarGuilda({ ...guilda, membros: guilda.membros.map((m) => (m.uid === alvoUid ? { ...m, cargo: 'lider' } : m.uid === uid ? { ...m, cargo: 'oficial' } : m)) });
      return { mensagem: `${alvo.nome} agora é o Líder. Você virou Oficial.` };
    });
  },

  async desfazer(uid, pedido) {
    return repositorio.executarTransacao('guilda:desfazer', async (ctx) => {
      const eu = await carregarPersonagem(ctx, uid);
      const { guilda, eu: membro } = await minhaGuildaNoContexto(ctx, eu);
      exigirCargo(membro, (c) => c === 'lider', 'Só o Líder desfaz a guilda.');
      if (typeof pedido.nome !== 'string' || chaveDoNomeDaGuilda(pedido.nome) !== chaveDoNomeDaGuilda(guilda.nome)) throw new ErroDeGuilda('Para confirmar, digite o nome da guilda exatamente.');
      await desfazerNoContexto(ctx, guilda, uid);
      salvarPersonagem(ctx, eu, { guildaId: undefined, guildaNome: undefined });
      return { mensagem: `A guilda ${guilda.nome} foi desfeita.` };
    });
  },

  async editarDescricao(uid, pedido) {
    const descricao = validarDescricaoDaGuilda(pedido.descricao);
    if (!descricao.ok) throw new ErroDeGuilda(descricao.erro);
    return repositorio.executarTransacao('guilda:descricao', async (ctx) => {
      const eu = await carregarPersonagem(ctx, uid);
      const { guilda, eu: membro } = await minhaGuildaNoContexto(ctx, eu);
      exigirCargo(membro, (c) => c === 'lider', 'Só o Líder muda a descrição.');
      ctx.gravarGuilda({ ...guilda, descricao: descricao.descricao });
      return { mensagem: 'Descrição salva.' };
    });
  },
};

async function mudarCargo(uid: string, pedido: PedidoDeAcao, de: CargoDaGuilda, para: CargoDaGuilda): Promise<{ mensagem: string }> {
  const alvoUid = uidAlvo(pedido.uid);
  return repositorio.executarTransacao(`guilda:${para}`, async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    const { guilda, eu: membro } = await minhaGuildaNoContexto(ctx, eu);
    exigirCargo(membro, (c) => c === 'lider', 'Só o Líder muda os cargos.');
    const alvo = guilda.membros.find((m) => m.uid === alvoUid);
    if (!alvo) throw new ErroDeGuilda('Esse jogador não está na guilda.', 404);
    if (alvo.cargo !== de) throw new ErroDeGuilda(`${alvo.nome} não é ${NOME_DO_CARGO[de]}.`, 409);
    ctx.gravarGuilda({ ...guilda, membros: guilda.membros.map((m) => (m.uid === alvoUid ? { ...m, cargo: para } : m)) });
    return { mensagem: `${alvo.nome} agora é ${NOME_DO_CARGO[para]}.` };
  });
}

/**
 * Antes de o Mestre excluir um jogador (3.5.4.4): tira o jogador da guilda (o Líder passa a liderança ao Oficial
 * mais antigo, ou ao Membro mais antigo; se era o único, a guilda é desfeita) e dos convites e pedidos.
 */
export async function tirarDaGuildaAntesDeExcluir(uid: string): Promise<void> {
  await repositorio.executarTransacao('guilda:excluirJogador', async (ctx) => {
    const eu = await ctx.lerPersonagem(uid);
    if (!eu) return;
    const guilda = eu.guildaId ? await ctx.lerGuilda(eu.guildaId) : null;
    const membro = guilda?.membros.find((m) => m.uid === uid);
    const sucessor = guilda && membro?.cargo === 'lider' ? sucessorDoLider(guilda.membros) : null;
    const desfazer = guilda && membro?.cargo === 'lider' && !sucessor;
    // Leituras antes das gravações (regra do Firestore): pendências e, se for desfazer, os demais jogadores
    await limparPendenciasNoContexto(ctx, eu, eu.guildaId);
    if (guilda && membro) {
      if (desfazer) await desfazerNoContexto(ctx, guilda, uid);
      else
        ctx.gravarGuilda({
          ...guilda,
          membros: guilda.membros.filter((m) => m.uid !== uid).map((m) => (sucessor && m.uid === sucessor.uid ? { ...m, cargo: 'lider' as const } : m)),
        });
    }
  });
  limparCacheDasGuildas();
}
