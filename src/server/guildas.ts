import { randomBytes, randomUUID } from 'node:crypto';
import {
  administraEntrada,
  chaveDoNomeDaGuilda,
  CONVITES_DA_GUILDA,
  CONVITES_DO_JOGADOR,
  membrosEmOrdem,
  nivelDaGuilda,
  type NivelAtualDaGuilda,
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
import { contratoPronto, gerarContratos, progressoDoContrato, type Contrato } from '@/game/contratos';
import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import { MATERIAIS, MATERIAIS_MAP } from '@/rules/materiais';
import { resolverCombate } from '@/game/combat';
import { sobreescudoInicialDoMonstro } from '@/game/combate/sobreescudoMonstro';
import { contarVitorias } from '@/game/contratos';
import {
  incursaoNova,
  LUTAS_DE_INCURSAO_POR_DIA,
  montarChefeDeIncursao,
  NIVEIS_DE_INCURSAO,
  NIVEL_DA_GUILDA_PARA_INCURSOES,
  nivelDeIncursao,
  recompensaDaIncursao,
  xpDeGuildaDaIncursao,
  type IncursaoDaGuilda,
} from '@/rules/incursao';
import {
  bonusDoRamo,
  bonusDosMembros,
  custoDoNivel,
  ehRamoDaPesquisa,
  NIVEL_DA_GUILDA_PARA_PESQUISA,
  NIVEL_MAXIMO_DO_RAMO,
  PONTOS_POR_RARIDADE,
  progressoDoRamo,
  RAMOS_DA_PESQUISA,
  type RamoDaPesquisa,
} from '@/rules/pesquisa';
import { gerarSementeCombate } from '@/server/combateSemente';
import { entregarCartas, sorteadorDaSemente, sortearTipoDaRaridade } from '@/server/almas';
import { CHANCE_DE_CARTA_DA_INCURSAO, RARIDADE_DA_CARTA_DA_INCURSAO } from '@/rules/almas';
import {
  chefeDaSemana,
  faixaDaPosicao,
  fimDaSemana,
  GUILDAS_NO_RANKING_SEMANAL,
  montarChefeSemanal,
  NIVEL_DA_GUILDA_PARA_CHEFE_SEMANAL,
  semanaDe,
  totalDosMembros,
  VIDA_DO_CHEFE_SEMANAL,
  type EntradaDoChefeSemanal,
  type FaixaDoChefeSemanal,
  FAIXAS_DO_CHEFE_SEMANAL,
} from '@/rules/chefeSemanal';
import { escolherTipoDaRaridade, type EmblemaItem } from '@/game/emblemas';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { PREFIXO_MAXIMO_DA_BUSCA, PREFIXO_MINIMO_DA_BUSCA } from '@/rules/social';
import { alterarSaldoEm, carregarPersonagem, combatenteDoPersonagem, ganharXp, progressoDasVitorias, salvarPersonagem, type CharacterDocument } from '@/server/characterService';
import { xpParaProximoNivel } from '@/game';
import { chaveDoNome, chaveDoNomeDeGuilda, repositorio, type ContextoTransacao } from '@/server/persistencia';
import { comLimiteSilencioso } from '@/server/sancoes';
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
/** O que sai do personagem quando ele deixa a guilda (inclui o bônus da Pesquisa). */
const SEM_GUILDA = { guildaId: undefined, guildaNome: undefined, bonusDeGuilda: undefined } as const;

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
  salvarPersonagem(ctx, jogador, { guildaId: guilda.id, guildaNome: guilda.nome, convitesDeGuilda: undefined, pedidosDeGuilda: undefined, bonusDeGuilda: bonusDosMembros(guilda.pesquisa) });
}

function exigirVaga(guilda: GuildaDocumento, r: RegrasDeGuilda) {
  const { maxMembros, nome } = nivelDaGuilda(guilda.xp, r);
  if (guilda.membros.length >= maxMembros) throw new ErroDeGuilda(`A guilda está cheia (${maxMembros} membros no nível ${nome}).`, 409);
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
      ...(naGuilda ? SEM_GUILDA : {}),
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
  xp: number;
  nivel: NivelAtualDaGuilda;
  incursao: IncursaoNaTela;
  pesquisa: PesquisaNaTela;
  chefeSemanal: ChefeSemanalNaTela;
  /** Só para Líder e Oficial. */
  convites: ConviteDaGuilda[];
  pedidos: PedidoDaGuilda[];
}

export interface EstadoDaGuilda {
  regras: RegrasDeGuilda;
  /** O que o jogador tem para criar (para a tela avisar o que falta). */
  eu: { nome: string; nivel: number; ouro: number; materiais: { id: string; nome: string; raridade: string; qtd: number }[] };
  minha: MinhaGuilda | null;
  /** Guildas que convidaram o jogador e para onde ele pediu para entrar (só as que ainda valem). */
  convites: ResumoDaGuilda[];
  pedidos: ResumoDaGuilda[];
  /** Os contratos do dia (só para quem está numa guilda), com o progresso de agora. */
  contratos: ContratoNaTela[];
}

export interface ContratoNaTela extends Contrato {
  /** Quanto já tem (para entregar: o que está na mochila). */
  feito: number;
  pronto: boolean;
}

const contratosNaTela = (lista: readonly Contrato[], inventario: Readonly<Record<string, number>> | undefined): ContratoNaTela[] =>
  lista.map((c) => ({ ...c, feito: progressoDoContrato(c, inventario), pronto: contratoPronto(c, inventario) }));

/**
 * O estado do jogador nas guildas. Custa 1 leitura do personagem + 1 da guilda (ou até 8 das guildas dos convites
 * e pedidos). Se encontrar algo velho (guilda que acabou, convite que já não vale), conserta o personagem numa
 * transação curta, para não se repetir.
 */
export async function estadoDaGuilda(uid: string): Promise<EstadoDaGuilda> {
  const r = await regras();
  const char = await repositorio.lerPersonagem(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  const materiais = Object.entries(char.inventario ?? {})
    .filter(([id, qtd]) => MATERIAIS_MAP[id] && qtd > 0)
    .map(([id, qtd]) => ({ id, nome: MATERIAIS_MAP[id].nome, raridade: MATERIAIS_MAP[id].raridade, qtd }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const eu = { nome: char.nome, nivel: char.nivel, ouro: char.ouro ?? 0, materiais };

  if (char.guildaId) {
    const g = await repositorio.lerGuilda(char.guildaId);
    const membro = g?.membros.find((m) => m.uid === uid);
    if (g && membro) {
      const admin = administraEntrada(membro.cargo);
      const nivel = nivelDaGuilda(g.xp, r);
      // Os contratos do dia nascem quando o membro abre a guilda (1 gravação por dia); depois as lutas os contam
      const hoje = diaDeBrasilia(new Date());
      let contratos = char.contratos?.dia === hoje ? char.contratos : null;
      if (!contratos) {
        contratos = await repositorio.executarTransacao('guilda:contratosDoDia', async (ctx) => {
          const atual = await carregarPersonagem(ctx, uid);
          if (atual.contratos?.dia === hoje) return atual.contratos;
          const novos = gerarContratos(uid, hoje, atual.nivel, atual.cacadaChavesVencidas);
          salvarPersonagem(ctx, atual, { contratos: novos });
          return novos;
        });
      }
      return {
        regras: r,
        eu,
        minha: {
          id: g.id,
          nome: g.nome,
          descricao: g.descricao,
          criadaEm: g.criadaEm,
          meuCargo: membro.cargo,
          membros: membrosEmOrdem(g.membros),
          maxMembros: nivel.maxMembros,
          xp: g.xp,
          nivel,
          incursao: incursaoNaTela(g, nivel.nivel, char, hoje),
          pesquisa: pesquisaNaTela(g, nivel.nivel),
          chefeSemanal: await chefeSemanalNaTela(g, nivel.nivel, char),
          convites: admin ? g.convites : [],
          pedidos: admin ? g.pedidos : [],
        },
        convites: [],
        pedidos: [],
        contratos: contratosNaTela(contratos.lista, char.inventario),
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
        ...(aindaMembro ? {} : SEM_GUILDA),
        convitesDeGuilda: vazioParaUndefined((atual.convitesDeGuilda ?? []).filter((id) => convitesValidos.includes(id) || !ids.includes(id))),
        pedidosDeGuilda: vazioParaUndefined((atual.pedidosDeGuilda ?? []).filter((id) => pedidosValidos.includes(id) || !ids.includes(id))),
      });
    });
  }
  return {
    regras: r,
    eu,
    minha: null,
    contratos: [],
    convites: convitesValidos.map((id) => resumoDaGuilda(guildas.get(id)!)),
    pedidos: pedidosValidos.map((id) => resumoDaGuilda(guildas.get(id)!)),
  };
}

export interface GuildaPublica extends ResumoDaGuilda {
  criadaEm: string;
  maxMembros: number;
  nivel: NivelAtualDaGuilda;
  membros: { nome: string; cargo: CargoDaGuilda }[];
}

/** A página pública de uma guilda (qualquer jogador vê): 1 leitura. */
export async function verGuilda(id: unknown): Promise<GuildaPublica> {
  const g = typeof id === 'string' && /^g_[a-z0-9]{6,32}$/.test(id) ? await repositorio.lerGuilda(id) : null;
  if (!g) throw new ErroDeGuilda('Essa guilda não existe (ou foi desfeita).', 404);
  const nivel = nivelDaGuilda(g.xp, await regras());
  return { ...resumoDaGuilda(g), criadaEm: g.criadaEm, maxMembros: nivel.maxMembros, nivel, membros: membrosEmOrdem(g.membros).map((m) => ({ nome: m.nome, cargo: m.cargo })) };
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
  'entregarContrato',
  'lutarIncursao',
  'doarPesquisa',
  'lutarChefeSemanal',
  'resgatarChefeSemanal',
] as const;
export type AcaoDeGuilda = (typeof ACOES_DE_GUILDA)[number];
export const ehAcaoDeGuilda = (v: unknown): v is AcaoDeGuilda => typeof v === 'string' && (ACOES_DE_GUILDA as readonly string[]).includes(v);

export interface PedidoDeAcao {
  /** criar, desfazer (confirmação): o nome da guilda. convidar: o nome do personagem. */
  nome?: unknown;
  descricao?: unknown;
  /** aceitarConvite, recusarConvite, pedir, cancelarPedido. */
  guildaId?: unknown;
  /** entregarContrato: c1, c2 ou c3. */
  contratoId?: unknown;
  /** doarPesquisa: o ramo, o ouro e os materiais ({ id: quantidade }). */
  ramo?: unknown;
  /** resgatarChefeSemanal: a semana (a segunda-feira, AAAA-MM-DD). */
  semana?: unknown;
  ouro?: unknown;
  materiais?: unknown;
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
      ctx.gravarGuilda({ id, nome: nome.nome, nomeBusca: chaveDoNomeDaGuilda(nome.nome), descricao: descricao.descricao, criadaEm: em, membros: [{ uid, nome: eu.nome, cargo: 'lider', entrouEm: em }], convites: [], pedidos: [], quantidadeMembros: 1, xp: 0 });
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
        salvarPersonagem(ctx, eu, SEM_GUILDA);
        return { mensagem: `Você saiu e a guilda ${guilda.nome} foi desfeita (você era o único membro).` };
      }
      ctx.gravarGuilda({ ...guilda, membros: guilda.membros.filter((m) => m.uid !== uid) });
      salvarPersonagem(ctx, eu, SEM_GUILDA);
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
      if (doc?.guildaId === guilda.id) ctx.gravarPersonagem({ ...doc, ...SEM_GUILDA });
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
      salvarPersonagem(ctx, eu, SEM_GUILDA);
      return { mensagem: `A guilda ${guilda.nome} foi desfeita.` };
    });
  },

  async lutarIncursao(uid, _pedido, r) {
    return lutarIncursao(uid, r, gerarSementeCombate());
  },

  async doarPesquisa(uid, pedido, r) {
    return doarPesquisa(uid, pedido, r);
  },

  async lutarChefeSemanal(uid, _pedido, r) {
    return lutarChefeSemanal(uid, r, gerarSementeCombate());
  },

  async resgatarChefeSemanal(uid, pedido) {
    return resgatarChefeSemanal(uid, pedido.semana);
  },

  async entregarContrato(uid, pedido) {
    return entregarContrato(uid, pedido);
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

/**
 * Entrega um contrato pronto: dá o ouro e os materiais ao jogador (tira da mochila o que o contrato pede) e soma o
 * XP de guilda à guilda e à contribuição do membro, tudo na mesma transação.
 */
async function entregarContrato(uid: string, pedido: PedidoDeAcao): Promise<{ mensagem: string }> {
  const contratoId = typeof pedido.contratoId === 'string' ? pedido.contratoId : '';
  const hoje = diaDeBrasilia(new Date());
  return repositorio.executarTransacao('guilda:entregarContrato', async (ctx) => {
    let eu = await carregarPersonagem(ctx, uid);
    const { guilda } = await minhaGuildaNoContexto(ctx, eu);
    if (eu.contratos?.dia !== hoje) throw new ErroDeGuilda('Esses contratos já venceram. Abra a guilda de novo para ver os de hoje.', 409);
    const contrato = eu.contratos.lista.find((c) => c.id === contratoId);
    if (!contrato) throw new ErroDeGuilda('Contrato não encontrado.', 404);
    if (contrato.entregue) throw new ErroDeGuilda('Esse contrato já foi entregue.', 409);
    if (!contratoPronto(contrato, eu.inventario)) throw new ErroDeGuilda('Esse contrato ainda não está pronto.');
    const inventario = { ...(eu.inventario ?? {}) };
    if (contrato.tipo === 'entregar') {
      inventario[contrato.alvo] -= contrato.quantidade;
      if (inventario[contrato.alvo] <= 0) delete inventario[contrato.alvo];
    }
    for (const m of contrato.recompensa.materiais) inventario[m.id] = (inventario[m.id] ?? 0) + m.qtd;
    const ouroDoContrato = Math.floor((contrato.recompensa.ouro * (100 + bonusDoRamo(guilda.pesquisa, 'contratos'))) / 100);
    if (ouroDoContrato > 0) eu = alterarSaldoEm(ctx, eu, 'ouro', ouroDoContrato, `Contrato de guilda: ${contrato.nomeAlvo}`).character;
    const contratos = { dia: hoje, lista: eu.contratos!.lista.map((c) => (c.id === contrato.id ? { ...c, entregue: true } : c)) };
    salvarPersonagem(ctx, eu, { ouro: eu.ouro, inventario, contratos });
    const antes = nivelDaGuilda(guilda.xp, await regras());
    // Pesquisa da guilda: Renome (+% de XP de guilda) e Comércio (+% de ouro dos contratos)
    const xpGuilda = Math.floor((contrato.recompensa.xpGuilda * (100 + bonusDoRamo(guilda.pesquisa, 'xpGuilda'))) / 100);
    const xp = guilda.xp + xpGuilda;
    ctx.gravarGuilda({ ...guilda, xp, membros: guilda.membros.map((m) => (m.uid === uid ? { ...m, xpContribuido: (m.xpContribuido ?? 0) + xpGuilda } : m)) });
    const depois = nivelDaGuilda(xp, await regras());
    const materiais = contrato.recompensa.materiais.map((m) => `${MATERIAIS_MAP[m.id]?.nome ?? m.id} x${m.qtd}`);
    const ganhos = [`${ouroDoContrato} de ouro`, ...materiais, `${xpGuilda} de XP para a guilda`].join(', ');
    return { mensagem: `Contrato entregue: ${ganhos}.${depois.nivel > antes.nivel ? ` A guilda subiu para ${depois.nome}!` : ''}` };
  });
}

// ---------------------------------------------------------------------------
// Incursões e Pesquisa
// ---------------------------------------------------------------------------

export interface IncursaoNaTela {
  liberada: boolean;
  nivelDaGuildaParaLiberar: number;
  nivel: number;
  chefe: string;
  dificuldade: string;
  hp: number;
  hpMax: number;
  /** Do maior dano para o menor. */
  participantes: { nome: string; dano: number; lutas: number }[];
  minhasLutasHoje: number;
  lutasPorDia: number;
  ultima?: IncursaoDaGuilda['ultima'];
}

function incursaoNaTela(g: GuildaDocumento, nivelDaGuildaAtual: number, eu: CharacterDocument, hoje: string): IncursaoNaTela {
  const inc = g.incursao ?? incursaoNova(1);
  const n = nivelDeIncursao(inc.nivel);
  return {
    liberada: nivelDaGuildaAtual >= NIVEL_DA_GUILDA_PARA_INCURSOES,
    nivelDaGuildaParaLiberar: NIVEL_DA_GUILDA_PARA_INCURSOES,
    nivel: n.nivel,
    chefe: n.chefe.nome,
    dificuldade: n.nomeDaDificuldade,
    hp: inc.hp,
    hpMax: inc.hpMax,
    participantes: [...inc.participantes].sort((a, b) => b.dano - a.dano).map(({ nome, dano, lutas }) => ({ nome, dano, lutas })),
    minhasLutasHoje: eu.incursaoTentativas?.dia === hoje ? eu.incursaoTentativas.usadas : 0,
    lutasPorDia: LUTAS_DE_INCURSAO_POR_DIA,
    ...(inc.ultima ? { ultima: inc.ultima } : {}),
  };
}

export interface PesquisaNaTela {
  liberada: boolean;
  nivelDaGuildaParaLiberar: number;
  ramos: {
    id: RamoDaPesquisa;
    nome: string;
    descricao: string;
    unidade: string;
    nivel: number;
    nivelMaximo: number;
    bonus: number;
    /** O que foi doado e o que falta para o próximo nível (null no máximo). */
    ouro: number;
    materiais: number;
    custo: { ouro: number; materiais: number } | null;
  }[];
}

function pesquisaNaTela(g: GuildaDocumento, nivelDaGuildaAtual: number): PesquisaNaTela {
  return {
    liberada: nivelDaGuildaAtual >= NIVEL_DA_GUILDA_PARA_PESQUISA,
    nivelDaGuildaParaLiberar: NIVEL_DA_GUILDA_PARA_PESQUISA,
    ramos: RAMOS_DA_PESQUISA.map((r) => {
      const p = progressoDoRamo(g.pesquisa, r.id);
      return {
        id: r.id,
        nome: r.nome,
        descricao: r.descricao,
        unidade: r.unidade,
        nivel: p.nivel,
        nivelMaximo: NIVEL_MAXIMO_DO_RAMO,
        bonus: bonusDoRamo(g.pesquisa, r.id),
        ouro: p.ouro,
        materiais: p.materiais,
        custo: p.nivel < NIVEL_MAXIMO_DO_RAMO ? custoDoNivel(p.nivel + 1) : null,
      };
    }),
  };
}

/** Um material da raridade pedida, escolhido pela semente (o mesmo combate dá sempre o mesmo). */
function materialDaIncursao(raridade: 'raro' | 'muitoRaro', semente: number): string | null {
  const pool = MATERIAIS.filter((m) => m.raridade === raridade);
  return pool.length ? pool[Math.abs(semente) % pool.length].id : null;
}

/**
 * Uma luta da Incursão: o combate normal contra o chefe com a vida global que sobrou. O dano entra na vida global
 * (sem cura entre lutas). Se o chefe cai, todos os que lutaram (e ainda estão na guilda) recebem a recompensa na
 * mesma transação, a guilda ganha XP e passa ao próximo nível de incursão.
 */
export async function lutarIncursao(uid: string, r: RegrasDeGuilda, semente: number): Promise<{ mensagem: string }> {
  const hoje = diaDeBrasilia(new Date());
  return repositorio.executarTransacao('guilda:incursao', async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    const { guilda } = await minhaGuildaNoContexto(ctx, eu);
    if (nivelDaGuilda(guilda.xp, r).nivel < NIVEL_DA_GUILDA_PARA_INCURSOES) throw new ErroDeGuilda('As Incursões abrem quando a guilda chega ao nível Reconhecida.');
    const usadas = eu.incursaoTentativas?.dia === hoje ? eu.incursaoTentativas.usadas : 0;
    if (usadas >= LUTAS_DE_INCURSAO_POR_DIA) throw new ErroDeGuilda(`Você já fez as ${LUTAS_DE_INCURSAO_POR_DIA} lutas de Incursão de hoje.`, 409);
    const inc = guilda.incursao ?? incursaoNova(1);
    // A vida é a global que sobrou; o Sobreescudo continua o de uma luta (senão cresceria com a vida global)
    const base = montarChefeDeIncursao(inc.nivel);
    const chefe = { ...base, hp: inc.hp, sobreescudoInicial: sobreescudoInicialDoMonstro(base.hp) };
    const resultado = resolverCombate(combatenteDoPersonagem(eu), chefe, semente);
    const dano = Math.max(0, inc.hp - (resultado.monstroFinal?.hp ?? inc.hp));
    const participantes = inc.participantes.some((p) => p.uid === uid)
      ? inc.participantes.map((p) => (p.uid === uid ? { ...p, nome: eu.nome, dano: p.dano + dano, lutas: p.lutas + 1 } : p))
      : [...inc.participantes, { uid, nome: eu.nome, dano, lutas: 1 }];
    const hp = Math.max(0, inc.hp - dano);
    const info = nivelDeIncursao(inc.nivel);
    const contratos = resultado.vencedor === 'personagem' ? contarVitorias(eu.contratos, [chefe.id], hoje) : null;
    let euDepois = salvarPersonagem(ctx, eu, {
      incursaoTentativas: { dia: hoje, usadas: usadas + 1 },
      ...(contratos ? { contratos } : {}),
      ...(resultado.vencedor === 'personagem' ? progressoDasVitorias(eu, [true], new Date()) : {}),
    });
    const restantes = LUTAS_DE_INCURSAO_POR_DIA - usadas - 1;

    if (hp > 0) {
      ctx.gravarGuilda({ ...guilda, incursao: { ...inc, hp, participantes } });
      return { mensagem: `Você causou ${dano} de dano em ${info.chefe.nome} (${info.nomeDaDificuldade}). Restam ${hp} de ${inc.hpMax} de vida. Lutas de hoje: ${restantes}.` };
    }

    // Chefe derrotado: recompensa para quem lutou e ainda está na guilda
    const danoTotal = participantes.reduce((s, p) => s + p.dano, 0) || 1;
    const membros = new Set(guilda.membros.map((m) => m.uid));
    const quemRecebe = participantes.filter((p) => membros.has(p.uid));
    const outros = await Promise.all(quemRecebe.filter((p) => p.uid !== uid).map((p) => ctx.lerPersonagem(p.uid)));
    const docs = new Map<string, CharacterDocument>([[uid, euDepois], ...outros.flatMap((d) => (d ? [[d.uid, d] as const] : []))]);
    const bonus = bonusDoRamo(guilda.pesquisa, 'incursao');
    for (const [i, p] of quemRecebe.entries()) {
      let doc = docs.get(p.uid);
      if (!doc || doc.guildaId !== guilda.id) continue;
      const rec = recompensaDaIncursao(inc.nivel, p.dano / danoTotal, quemRecebe.length, bonus);
      const motivo = `Incursão ${inc.nivel}: ${info.chefe.nome}`;
      if (rec.ouro > 0) doc = alterarSaldoEm(ctx, doc, 'ouro', rec.ouro, motivo).character;
      if (rec.diamantes > 0) doc = alterarSaldoEm(ctx, doc, 'diamantes', rec.diamantes, motivo).character;
      const xp = ganharXp(doc, Math.floor(xpParaProximoNivel(doc.nivel) * rec.fracaoDeXp));
      const material = materialDaIncursao(rec.raridadeDoMaterial, semente + i * 7919);
      const inventario = { ...(doc.inventario ?? {}) };
      if (material) inventario[material] = (inventario[material] ?? 0) + 1;
      // Alma (7.8): 50% de chance de uma carta, mais rara nas dificuldades altas
      const sorteioDaCarta = sorteadorDaSemente(semente + i * 15485863);
      const carta = sorteioDaCarta() < CHANCE_DE_CARTA_DA_INCURSAO ? entregarCartas(doc, [sortearTipoDaRaridade(RARIDADE_DA_CARTA_DA_INCURSAO[info.dificuldade], sorteioDaCarta)], semente + i) : null;
      const salvo = { ...doc, ouro: doc.ouro, diamantes: doc.diamantes, xpAtual: xp.xpAtual, nivel: xp.nivel, pontosDisponiveis: xp.pontosDisponiveis, inventario, ...(carta?.patch ?? {}) };
      if (p.uid === uid) euDepois = salvarPersonagem(ctx, doc, salvo);
      else ctx.gravarPersonagem(salvo);
    }
    const proximo = Math.min(NIVEIS_DE_INCURSAO, inc.nivel + 1);
    const xpGuilda = xpDeGuildaDaIncursao(inc.nivel);
    ctx.gravarGuilda({
      ...guilda,
      xp: guilda.xp + xpGuilda,
      incursao: { ...incursaoNova(proximo), ultima: { nivel: inc.nivel, chefe: info.chefe.nome, dificuldade: info.nomeDaDificuldade, em: new Date().toISOString() } },
    });
    return { mensagem: `${info.chefe.nome} (${info.nomeDaDificuldade}) foi derrotado! Seu golpe final causou ${dano} de dano. Quem lutou recebeu ouro, XP, diamantes e um material (e, às vezes, uma carta da Alma), e a guilda ganhou ${xpGuilda} de XP.` };
  });
}

/**
 * Doação para um ramo da Pesquisa: ouro e/ou materiais (pontos pela raridade). Só tira o que falta para o próximo
 * nível. Quando as duas barras enchem, o ramo sobe e o bônus novo vai para o personagem de todos os membros.
 */
export async function doarPesquisa(uid: string, pedido: PedidoDeAcao, r: RegrasDeGuilda): Promise<{ mensagem: string }> {
  if (!ehRamoDaPesquisa(pedido.ramo)) throw new ErroDeGuilda('Escolha um ramo da Pesquisa.');
  const ramo = pedido.ramo;
  const ouroPedido = pedido.ouro === undefined ? 0 : pedido.ouro;
  if (typeof ouroPedido !== 'number' || !Number.isInteger(ouroPedido) || ouroPedido < 0) throw new ErroDeGuilda('Quantidade de ouro inválida.');
  const materiaisPedidos: [string, number][] = [];
  if (pedido.materiais !== undefined) {
    if (typeof pedido.materiais !== 'object' || pedido.materiais === null) throw new ErroDeGuilda('Materiais inválidos.');
    for (const [id, qtd] of Object.entries(pedido.materiais as Record<string, unknown>)) {
      if (!MATERIAIS_MAP[id] || typeof qtd !== 'number' || !Number.isInteger(qtd) || qtd < 0) throw new ErroDeGuilda('Materiais inválidos.');
      if (qtd > 0) materiaisPedidos.push([id, qtd]);
    }
  }
  if (ouroPedido === 0 && materiaisPedidos.length === 0) throw new ErroDeGuilda('Escolha o ouro ou os materiais para doar.');
  return repositorio.executarTransacao('guilda:pesquisa', async (ctx) => {
    let eu = await carregarPersonagem(ctx, uid);
    const { guilda } = await minhaGuildaNoContexto(ctx, eu);
    if (nivelDaGuilda(guilda.xp, r).nivel < NIVEL_DA_GUILDA_PARA_PESQUISA) throw new ErroDeGuilda('A Pesquisa abre quando a guilda chega ao nível Respeitada.');
    const atual = progressoDoRamo(guilda.pesquisa, ramo);
    if (atual.nivel >= NIVEL_MAXIMO_DO_RAMO) throw new ErroDeGuilda('Esse ramo já está no nível máximo.', 409);
    const custo = custoDoNivel(atual.nivel + 1);
    // Ouro: só o que falta
    const ouro = Math.min(ouroPedido, custo.ouro - atual.ouro);
    if (ouro > (eu.ouro ?? 0)) throw new ErroDeGuilda('Ouro insuficiente.');
    // Materiais: um por um, até completar os pontos
    const inventario = { ...(eu.inventario ?? {}) };
    let pontos = 0;
    const usados: string[] = [];
    for (const [id, qtd] of materiaisPedidos) {
      if ((inventario[id] ?? 0) < qtd) throw new ErroDeGuilda(`Você não tem ${qtd}× ${MATERIAIS_MAP[id].nome}.`);
      const valor = PONTOS_POR_RARIDADE[MATERIAIS_MAP[id].raridade];
      let qtdUsada = 0;
      while (qtdUsada < qtd && atual.materiais + pontos < custo.materiais) {
        pontos += valor;
        qtdUsada++;
      }
      if (qtdUsada > 0) {
        inventario[id] -= qtdUsada;
        if (inventario[id] <= 0) delete inventario[id];
        usados.push(`${qtdUsada}× ${MATERIAIS_MAP[id].nome}`);
      }
    }
    if (ouro <= 0 && pontos <= 0) throw new ErroDeGuilda('Essa barra já está cheia: doe o que falta na outra.', 409);
    if (ouro > 0) eu = alterarSaldoEm(ctx, eu, 'ouro', -ouro, `Pesquisa da guilda: ${ramo}`).character;
    let progresso = { nivel: atual.nivel, ouro: atual.ouro + ouro, materiais: Math.min(custo.materiais, atual.materiais + pontos) };
    const subiu = progresso.ouro >= custo.ouro && progresso.materiais >= custo.materiais;
    if (subiu) progresso = { nivel: atual.nivel + 1, ouro: 0, materiais: 0 };
    const pesquisa = { ...(guilda.pesquisa ?? {}), [ramo]: progresso };
    const def = RAMOS_DA_PESQUISA.find((x) => x.id === ramo)!;
    if (subiu && (ramo === 'xp' || ramo === 'ouro' || ramo === 'materiais')) {
      // O bônus das lutas vive no personagem: atualiza o de todos os membros (lê todos antes de gravar)
      const bonusDeGuilda = bonusDosMembros(pesquisa);
      const outros = await Promise.all(guilda.membros.filter((m) => m.uid !== uid).map((m) => ctx.lerPersonagem(m.uid)));
      for (const o of outros) if (o && o.guildaId === guilda.id) ctx.gravarPersonagem({ ...o, bonusDeGuilda });
      salvarPersonagem(ctx, eu, { ouro: eu.ouro, inventario, bonusDeGuilda });
    } else {
      salvarPersonagem(ctx, eu, { ouro: eu.ouro, inventario });
    }
    ctx.gravarGuilda({ ...guilda, pesquisa });
    const doado = [ouro > 0 ? `${ouro} de ouro` : '', ...usados].filter(Boolean).join(', ');
    return { mensagem: `Você doou ${doado} para ${def.nome}.${subiu ? ` ${def.nome} subiu para o nível ${progresso.nivel}: +${progresso.nivel * def.porNivel}${def.unidade} de ${def.descricao}!` : ''}` };
  });
}

// ---------------------------------------------------------------------------
// Chefe de guildas (semanal)
// ---------------------------------------------------------------------------

export interface ChefeSemanalNaTela {
  liberado: boolean;
  nivelDaGuildaParaLiberar: number;
  semana: string;
  /** A segunda-feira em que a semana acaba (0h de Brasília). */
  termina: string;
  chefe: string;
  meuMelhor: number;
  totalDaGuilda: number;
  /** Posição da guilda agora (null se ainda não lutou ninguém). */
  posicao: number | null;
  top: { posicao: number; nome: string; total: number; minha: boolean }[];
  /** Semanas que já acabaram e o jogador ainda pode resgatar. */
  pendentes: string[];
  faixas: FaixaDoChefeSemanal[];
}

const GUARDA_DO_TOP_MS = 5 * 60_000;
const topGuardado = new Map<string, { em: number; lista: EntradaDoChefeSemanal[] }>();

export function limparCacheDoChefeSemanal(): void {
  topGuardado.clear();
}

async function topDaSemana(semana: string): Promise<EntradaDoChefeSemanal[]> {
  const g = topGuardado.get(semana);
  if (g && Date.now() - g.em < GUARDA_DO_TOP_MS) return g.lista;
  const lista = await repositorio.listarChefeSemanal(semana, GUILDAS_NO_RANKING_SEMANAL);
  topGuardado.set(semana, { em: Date.now(), lista });
  return lista;
}

/** Posições com empate: quem tem o mesmo total fica na mesma posição. */
function posicoes(lista: readonly EntradaDoChefeSemanal[]) {
  return lista.map((e, i) => ({ e, posicao: lista.findIndex((x) => x.total === e.total) + 1 || i + 1 }));
}

/** A tela do Chefe de guildas: 1 leitura do registro da guilda, 1 contagem para a posição e o top (5 min na memória). */
async function chefeSemanalNaTela(g: GuildaDocumento, nivelDaGuildaAtual: number, eu: CharacterDocument, agora = new Date()): Promise<ChefeSemanalNaTela> {
  const semana = semanaDe(agora);
  const liberado = nivelDaGuildaAtual >= NIVEL_DA_GUILDA_PARA_CHEFE_SEMANAL;
  const pendentes = (eu.chefeSemanal ?? []).filter((p) => p.semana < semana && !p.resgatada && p.guildaId === g.id).map((p) => p.semana);
  const base = { liberado, nivelDaGuildaParaLiberar: NIVEL_DA_GUILDA_PARA_CHEFE_SEMANAL, semana, termina: fimDaSemana(semana), chefe: chefeDaSemana(semana).nome, pendentes, faixas: [...FAIXAS_DO_CHEFE_SEMANAL] };
  if (!liberado) return { ...base, meuMelhor: 0, totalDaGuilda: 0, posicao: null, top: [] };
  const [minha, top] = await Promise.all([repositorio.lerEntradaChefeSemanal(semana, g.id), topDaSemana(semana)]);
  const posicao = minha && minha.total > 0 ? (await repositorio.contarGuildasAcimaNoChefeSemanal(semana, minha.total)) + 1 : null;
  return {
    ...base,
    meuMelhor: minha?.membros[eu.uid]?.dano ?? 0,
    totalDaGuilda: minha?.total ?? 0,
    posicao,
    top: posicoes(top).map(({ e, posicao: p }) => ({ posicao: p, nome: e.nomeDaGuilda, total: e.total, minha: e.guildaId === g.id })),
  };
}

/**
 * Uma luta contra o chefe da semana: mede o dano (o chefe tem vida sem fim). Só grava se for o maior dano do membro na
 * semana (assim lutar sem limite não gasta gravações à toa); a primeira luta da semana também anota a participação.
 */
export async function lutarChefeSemanal(uid: string, r: RegrasDeGuilda, semente: number, agora = new Date()): Promise<{ mensagem: string }> {
  const semana = semanaDe(agora);
  // Limite silencioso (6.5-7): o dano fica registrado, mas não soma no total da guilda
  const oculto = await comLimiteSilencioso(uid);
  return repositorio.executarTransacao('guilda:chefeSemanal', async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    const { guilda } = await minhaGuildaNoContexto(ctx, eu);
    if (nivelDaGuilda(guilda.xp, r).nivel < NIVEL_DA_GUILDA_PARA_CHEFE_SEMANAL) throw new ErroDeGuilda('O Chefe de guildas abre quando a guilda chega ao nível Prestigiada.');
    const entrada = (await ctx.lerEntradaChefeSemanal(semana, guilda.id)) ?? { semana, guildaId: guilda.id, nomeDaGuilda: guilda.nome, total: 0, membros: {} };
    const chefe = montarChefeSemanal(semana);
    const resultado = resolverCombate(combatenteDoPersonagem(eu), chefe, semente);
    // Conta também o que foi tirado do Sobreescudo do chefe
    const final = resultado.monstroFinal;
    const dano = final ? Math.max(0, VIDA_DO_CHEFE_SEMANAL + (chefe.sobreescudoInicial ?? 0) - final.hp - final.sobreescudo) : 0;
    const anterior = entrada.membros[uid]?.dano ?? 0;
    if (dano > anterior) {
      const membros = { ...entrada.membros, [uid]: { nome: eu.nome, dano, ...(oculto ? { oculto: true } : {}) } };
      ctx.gravarEntradaChefeSemanal({ ...entrada, nomeDaGuilda: guilda.nome, membros, total: totalDosMembros(membros) });
    }
    if (!(eu.chefeSemanal ?? []).some((p) => p.semana === semana && p.guildaId === guilda.id)) {
      salvarPersonagem(ctx, eu, { chefeSemanal: [...(eu.chefeSemanal ?? []), { semana, guildaId: guilda.id }].slice(-4) });
    }
    topGuardado.delete(semana);
    return {
      mensagem: dano > anterior ? `Você causou ${dano} de dano em ${chefe.nome}: seu novo melhor da semana!` : `Você causou ${dano} de dano em ${chefe.nome}. Seu melhor da semana continua ${anterior}.`,
    };
  });
}

/**
 * Resgate da semana que acabou: pela posição final da guilda, ouro e baús de emblemas para quem lutou e ainda está
 * nela; o XP de guilda da faixa entra uma vez só (no primeiro resgate).
 */
export async function resgatarChefeSemanal(uid: string, semanaPedida: unknown, agora = new Date()): Promise<{ mensagem: string }> {
  const semana = typeof semanaPedida === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(semanaPedida) ? semanaPedida : '';
  if (!semana) throw new ErroDeGuilda('Semana inválida.');
  if (semana >= semanaDe(agora)) throw new ErroDeGuilda('Essa semana ainda não acabou: o resgate abre na segunda-feira.', 409);
  const char = await repositorio.lerPersonagem(uid);
  const participacao = char?.chefeSemanal?.find((p) => p.semana === semana);
  if (!char || !participacao) throw new ErroDeGuilda('Você não lutou contra o Chefe de guildas nessa semana.', 404);
  if (participacao.resgatada) throw new ErroDeGuilda('Você já resgatou essa semana.', 409);
  const entradaAntes = await repositorio.lerEntradaChefeSemanal(semana, participacao.guildaId);
  if (!entradaAntes || !entradaAntes.membros[uid]) throw new ErroDeGuilda('O registro da sua guilda nessa semana não foi encontrado.', 404);
  // A semana acabou: ninguém muda mais os totais, então a contagem fora da transação é a posição final
  const posicao = (await repositorio.contarGuildasAcimaNoChefeSemanal(semana, entradaAntes.total)) + 1;
  const faixaDaGuilda = faixaDaPosicao(posicao);
  // Limite silencioso (6.5-7): o jogador recebe a última faixa; o XP da guilda segue a posição dela
  const faixa = (await comLimiteSilencioso(uid)) ? FAIXAS_DO_CHEFE_SEMANAL[FAIXAS_DO_CHEFE_SEMANAL.length - 1] : faixaDaGuilda;
  const semente = gerarSementeCombate();
  return repositorio.executarTransacao('guilda:resgatarChefeSemanal', async (ctx) => {
    let eu = await carregarPersonagem(ctx, uid);
    const p = eu.chefeSemanal?.find((x) => x.semana === semana);
    if (!p || p.resgatada) throw new ErroDeGuilda('Você já resgatou essa semana.', 409);
    const { guilda } = await minhaGuildaNoContexto(ctx, eu);
    if (guilda.id !== p.guildaId) throw new ErroDeGuilda('A recompensa é de quem ainda está na guilda com que lutou.', 409);
    const entrada = (await ctx.lerEntradaChefeSemanal(semana, guilda.id))!;
    const motivo = `Chefe de guildas (${faixaDaGuilda.nome})`;
    if (faixa.ouro > 0) eu = alterarSaldoEm(ctx, eu, 'ouro', faixa.ouro, motivo).character;
    const novos: EmblemaItem[] = [];
    let i = 0;
    for (const bau of faixa.baus) {
      for (let k = 0; k < bau.quantidade; k++, i++) {
        const valor = Math.abs((semente + i * 7919) % 100);
        novos.push({ id: randomUUID(), tipo: escolherTipoDaRaridade(bau.raridade, valor).id, estrelas: 1 });
      }
    }
    // Alma (7.8): as cartas da faixa
    const sorteioDasCartas = sorteadorDaSemente(semente + 31);
    const cartas = entregarCartas(eu, faixa.cartas.map((r) => sortearTipoDaRaridade(r, sorteioDasCartas)), semente + 37);
    salvarPersonagem(ctx, eu, {
      ...cartas.patch,
      ouro: eu.ouro,
      ...(novos.length ? { emblemasItens: [...(eu.emblemasItens ?? []), ...novos] } : {}),
      chefeSemanal: (eu.chefeSemanal ?? []).map((x) => (x.semana === semana ? { ...x, resgatada: true } : x)),
    });
    let xpDaGuilda = '';
    if (!entrada.xpEntregue) {
      ctx.gravarGuilda({ ...guilda, xp: guilda.xp + faixaDaGuilda.xpGuilda });
      ctx.gravarEntradaChefeSemanal({ ...entrada, xpEntregue: true });
      xpDaGuilda = ` A guilda ganhou ${faixaDaGuilda.xpGuilda} de XP.`;
    }
    const baus = faixa.baus.map((b) => `${b.quantidade} baú(s) ${EMBLEMA_RARIDADE_MAP[b.raridade].nome.toLowerCase()}(s)`).join(', ');
    return { mensagem: `Sua guilda ficou em ${posicao}º (${faixaDaGuilda.nome}). Você recebeu ${faixa.ouro} de ouro${baus ? ` e ${baus} de emblemas` : ''}. Mais ${cartas.criadas.length} ${cartas.criadas.length === 1 ? 'carta da Alma' : 'cartas da Alma'}.${xpDaGuilda}` };
  });
}

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
