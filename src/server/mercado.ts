import { randomUUID } from 'node:crypto';
import { CARTAS_MAXIMAS, TIPO_DE_CARTA_MAP, type CartaItem } from '@/rules/almas';
import { MAX_ARMAS_POR_PERSONAGEM, type ArmaPersonagem } from '@/game/forja';
import { MAX_ARMADURAS_POR_PERSONAGEM, type ArmaduraPersonagem } from '@/game/armaduraForja';
import type { PresenteDoCorreio } from '@/rules/correio';
import { ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import { PECAS_ARMADURA_MAP } from '@/rules/armadurasCatalogo';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import type { AttributeName } from '@/rules/attributes';
import { SELOS_DE_BUSCA, type SeloDeBusca, type SelosDoJogador } from '@/rules/colecionaveis';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { TIPO_EMBLEMA_MAP } from '@/rules/emblemasCatalogo';
import { horaDe, idDaRevisao, type EntradaDeRevisao } from '@/rules/integridade';
import { MATERIAIS_MAP } from '@/rules/materiais';
import { MATERIAIS_MUNDO_MAP } from '@/rules/materiaisArmas';
import {
  ANUNCIOS_ATIVOS_MAXIMOS,
  ANUNCIOS_POR_PAGINA,
  anuncioExpirado,
  CATEGORIAS_DO_MERCADO,
  chaveDeBuscaDoMercado,
  COMPRAS_DO_MESMO_VENDEDOR,
  DURACAO_DO_ANUNCIO_MS,
  ehMoedaDoMercado,
  ehRecursoDeSubclasse,
  ehRecursoFixo,
  NIVEL_DO_MERCADO,
  NOME_DO_RECURSO,
  precoAtipico,
  precoPorUnidade,
  precoValido,
  RARIDADE_DO_RECURSO,
  RARIDADES_DO_MERCADO,
  VENDAS_GUARDADAS_POR_ITEM,
  type AnuncioDoMercado,
  type CategoriaDoMercado,
  type ItemDoAnuncio,
  type MoedaDoMercado,
  type RaridadeDoMercado,
} from '@/rules/mercado';
import { SUBCLASSES } from '@/rules/subclasses';
import { exigirEmailVerificado } from '@/server/auth';
import { alterarSaldoEm, carregarPersonagem, salvarPersonagem, type CharacterDocument } from '@/server/characterService';
import { comMensagem, novaMensagem } from '@/server/correio';
import { registrarLog, descreverErro } from '@/server/log';
import { repositorio, type ContextoTransacao } from '@/server/persistencia';
import { exigirSistemaLigado } from '@/server/sistemasLeitura';

/**
 * Troca entre jogadores (7.2). O item sai da mochila do vendedor ao anunciar e fica guardado no anúncio; na compra, o
 * dinheiro passa do comprador para o vendedor e o item vai para o comprador (se as cartas dele estiverem cheias, a carta
 * chega pelo Correio). Tudo numa transação, com extrato. Depois de 7 dias o anúncio expira e o item volta ao vendedor
 * na próxima vez que ele abrir o Mercado.
 */

export class ErroDoMercado extends Error {
  readonly status = 400;
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDoMercado';
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Itens: o que é, quanto o jogador tem, tirar e pôr
// ---------------------------------------------------------------------------------------------------------------

export interface RefDoItem {
  tipo: 'material' | 'recurso' | 'carta' | 'emblema' | 'arma' | 'armadura';
  id: string;
}

export interface ItemVendavel {
  ref: RefDoItem;
  categoria: CategoriaDoMercado;
  raridade: RaridadeDoMercado;
  nome: string;
  detalhe: string;
  /** Quantas unidades o jogador tem (1 nos itens únicos). */
  quantidade: number;
}

const nomeDoAtributo = (a: unknown) => ATTRIBUTE_DISPLAY_NAMES[a as AttributeName] ?? String(a);
const raridade = (r: unknown): RaridadeDoMercado => ((RARIDADES_DO_MERCADO as readonly string[]).includes(String(r)) ? (r as RaridadeDoMercado) : 'comum');

function nomeDoRecurso(id: string): string {
  if (ehRecursoFixo(id)) return NOME_DO_RECURSO[id];
  const sub = id.split(':')[1];
  return `Fragmento de ${SUBCLASSES.find((s) => s.id === sub)?.nome ?? sub}`;
}

/** Nome, categoria, raridade e detalhe de um item do anúncio. */
export function descreverItem(item: ItemDoAnuncio): { categoria: CategoriaDoMercado; raridade: RaridadeDoMercado; nome: string; detalhe: string; quantidade: number } {
  switch (item.tipo) {
    case 'material': {
      const m = MATERIAIS_MAP[item.id] ?? MATERIAIS_MUNDO_MAP[item.id];
      return { categoria: 'material', raridade: raridade(m?.raridade), nome: m?.nome ?? item.id, detalhe: '', quantidade: item.quantidade };
    }
    case 'recurso':
      return { categoria: 'recurso', raridade: ehRecursoFixo(item.id) ? RARIDADE_DO_RECURSO[item.id] : 'epico', nome: nomeDoRecurso(item.id), detalhe: '', quantidade: item.quantidade };
    case 'carta': {
      const t = TIPO_DE_CARTA_MAP[item.carta.tipo];
      const efeitos = item.carta.efeitos?.length ?? 0;
      const despertar = item.carta.despertar ? `Despertar ${['', 'I', 'II', 'III'][item.carta.despertar] ?? item.carta.despertar}` : '';
      return { categoria: 'carta', raridade: raridade(t?.raridade), nome: t?.nome ?? item.carta.tipo, detalhe: [despertar, `${efeitos} ${efeitos === 1 ? 'efeito sorteado' : 'efeitos sorteados'}`].filter(Boolean).join(' · '), quantidade: 1 };
    }
    case 'emblema': {
      const t = TIPO_EMBLEMA_MAP[item.emblema.tipo];
      return { categoria: 'emblema', raridade: raridade(t?.raridade), nome: `Emblema ${t?.nome ?? item.emblema.tipo}`, detalhe: `${item.emblema.estrelas}★`, quantidade: 1 };
    }
    case 'arma': {
      const b = ARMAS_BASE_MAP[item.arma.baseId];
      const nome = b?.nomes?.[item.arma.categoria as keyof typeof b.nomes] ?? item.arma.baseId;
      return { categoria: 'arma', raridade: raridade(b?.raridade), nome, detalhe: `+${item.arma.pontos} ${nomeDoAtributo(item.arma.atributo)}`, quantidade: 1 };
    }
    case 'armadura': {
      const p = PECAS_ARMADURA_MAP[item.armadura.pecaId];
      return { categoria: 'armadura', raridade: raridade(p?.raridade), nome: p?.nome ?? item.armadura.pecaId, detalhe: `+${item.armadura.pontos} ${nomeDoAtributo(item.armadura.atributo)}`, quantidade: 1 };
    }
  }
}

const MOEDAS_DO_EXTRATO = ['fragmentosAlma', 'essenciaHabilidade', 'fragmentosAscensao'] as const;
type RecursoComExtrato = (typeof MOEDAS_DO_EXTRATO)[number];
const temExtrato = (id: string): id is RecursoComExtrato => (MOEDAS_DO_EXTRATO as readonly string[]).includes(id);

function saldoDoRecurso(c: CharacterDocument, id: string): number {
  if (id.startsWith('selo:')) return c.selosDeBusca?.[id.slice(5) as SeloDeBusca] ?? 0;
  if (ehRecursoDeSubclasse(id)) return c.fragmentosSubclasse?.[id.split(':')[1]] ?? 0;
  return ((c as unknown as Record<string, unknown>)[id] as number | undefined) ?? 0;
}

/** Soma (ou tira) um recurso, com extrato quando o recurso tem extrato. */
function mudarRecurso(ctx: ContextoTransacao, c: CharacterDocument, id: string, delta: number, motivo: string): { doc: CharacterDocument; patch: Partial<CharacterDocument> } {
  if (id.startsWith('selo:')) {
    const selos: SelosDoJogador = { ...(c.selosDeBusca ?? {}) };
    const s = id.slice(5) as SeloDeBusca;
    selos[s] = (selos[s] ?? 0) + delta;
    if (!selos[s]) delete selos[s];
    return { doc: { ...c, selosDeBusca: selos }, patch: { selosDeBusca: Object.keys(selos).length ? selos : undefined } };
  }
  if (temExtrato(id)) {
    const doc = alterarSaldoEm(ctx, c, id, delta, motivo).character;
    return { doc, patch: { [id]: doc[id] } };
  }
  if (ehRecursoDeSubclasse(id)) {
    const sub = id.split(':')[1];
    const mapa = { ...(c.fragmentosSubclasse ?? {}) };
    mapa[sub] = (mapa[sub] ?? 0) + delta;
    ctx.registrarTransacao({ id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, uid: c.uid, tipo: delta > 0 ? 'ganho' : 'perda', quantidade: Math.abs(delta), moeda: 'fragmentosSubclasse', chave: sub, motivo, timestamp: new Date().toISOString() });
    return { doc: { ...c, fragmentosSubclasse: mapa }, patch: { fragmentosSubclasse: mapa } };
  }
  const novo = saldoDoRecurso(c, id) + delta;
  return { doc: { ...c, [id]: novo }, patch: { [id]: novo || undefined } };
}

const equipados = (c: CharacterDocument) => ({
  arma: c.equipamento?.armaId ?? null,
  armaduras: new Set(Object.values(c.equipamento?.armadura ?? {}).filter(Boolean) as string[]),
  emblemas: new Set(c.emblemasEquipados ?? []),
  cartas: new Set(c.cartasEquipadas ?? []),
});

/** Tudo o que o jogador pode pôr à venda (sem colecionáveis, moedas e itens equipados). */
export function vendaveisDe(c: CharacterDocument): ItemVendavel[] {
  const saida: ItemVendavel[] = [];
  const eq = equipados(c);
  const comItem = (ref: RefDoItem, item: ItemDoAnuncio) => {
    const d = descreverItem(item);
    saida.push({ ref, categoria: d.categoria, raridade: d.raridade, nome: d.nome, detalhe: d.detalhe, quantidade: d.quantidade });
  };
  for (const [id, q] of Object.entries(c.inventario ?? {})) if (q > 0 && (MATERIAIS_MAP[id] || MATERIAIS_MUNDO_MAP[id])) comItem({ tipo: 'material', id }, { tipo: 'material', id, quantidade: q });
  const recursos = [...SELOS_DE_BUSCA.map((s) => `selo:${s}`), 'avancosDeExpedicao', 'fragmentosDeMemoria', 'pedrasDaRecordacao', ...MOEDAS_DO_EXTRATO, 'cacosDeAlma', 'poeiraDeAlma', ...Object.keys(c.fragmentosSubclasse ?? {}).map((s) => `fragmentosSubclasse:${s}`)];
  for (const id of recursos) {
    const q = saldoDoRecurso(c, id);
    if (q > 0) comItem({ tipo: 'recurso', id }, { tipo: 'recurso', id, quantidade: q });
  }
  for (const carta of c.cartasItens ?? []) if (!eq.cartas.has(carta.id)) comItem({ tipo: 'carta', id: carta.id }, { tipo: 'carta', carta });
  for (const e of c.emblemasItens ?? []) if (!eq.emblemas.has(e.id)) comItem({ tipo: 'emblema', id: e.id }, { tipo: 'emblema', emblema: e });
  for (const a of c.armas ?? []) if (eq.arma !== a.id) comItem({ tipo: 'arma', id: a.id }, { tipo: 'arma', arma: a as unknown as Record<string, unknown> & { id: string; baseId: string } });
  for (const a of c.armaduras ?? []) if (!eq.armaduras.has(a.id)) comItem({ tipo: 'armadura', id: a.id }, { tipo: 'armadura', armadura: a as unknown as Record<string, unknown> & { id: string; pecaId: string } });
  return saida;
}

/** Tira o item do jogador para o anúncio. */
function retirar(ctx: ContextoTransacao, c: CharacterDocument, ref: RefDoItem, quantidade: number, motivo: string): { doc: CharacterDocument; patch: Partial<CharacterDocument>; item: ItemDoAnuncio } {
  const eq = equipados(c);
  const naoEquipado = 'Tire o item do equipamento antes de vender.';
  switch (ref.tipo) {
    case 'material': {
      if (!MATERIAIS_MAP[ref.id] && !MATERIAIS_MUNDO_MAP[ref.id]) throw new ErroDoMercado('Esse material não pode ser vendido.');
      const tem = c.inventario?.[ref.id] ?? 0;
      if (quantidade > tem) throw new ErroDoMercado(`Você só tem ${tem} desse material.`);
      const inventario = { ...(c.inventario ?? {}) };
      inventario[ref.id] = tem - quantidade;
      if (!inventario[ref.id]) delete inventario[ref.id];
      return { doc: { ...c, inventario }, patch: { inventario }, item: { tipo: 'material', id: ref.id, quantidade } };
    }
    case 'recurso': {
      if (!ehRecursoFixo(ref.id) && !ehRecursoDeSubclasse(ref.id)) throw new ErroDoMercado('Esse recurso não pode ser vendido.');
      const tem = saldoDoRecurso(c, ref.id);
      if (quantidade > tem) throw new ErroDoMercado(`Você só tem ${tem} desse recurso.`);
      const r = mudarRecurso(ctx, c, ref.id, -quantidade, motivo);
      return { ...r, item: { tipo: 'recurso', id: ref.id, quantidade } };
    }
    case 'carta': {
      const carta = (c.cartasItens ?? []).find((x) => x.id === ref.id);
      if (!carta) throw new ErroDoMercado('Carta não encontrada.');
      if (eq.cartas.has(carta.id)) throw new ErroDoMercado(naoEquipado);
      const cartasItens = (c.cartasItens ?? []).filter((x) => x.id !== ref.id);
      return { doc: { ...c, cartasItens }, patch: { cartasItens }, item: { tipo: 'carta', carta } };
    }
    case 'emblema': {
      const e = (c.emblemasItens ?? []).find((x) => x.id === ref.id);
      if (!e) throw new ErroDoMercado('Emblema não encontrado.');
      if (eq.emblemas.has(e.id)) throw new ErroDoMercado(naoEquipado);
      const emblemasItens = (c.emblemasItens ?? []).filter((x) => x.id !== ref.id);
      return { doc: { ...c, emblemasItens }, patch: { emblemasItens }, item: { tipo: 'emblema', emblema: e } };
    }
    case 'arma': {
      const a = (c.armas ?? []).find((x) => x.id === ref.id);
      if (!a) throw new ErroDoMercado('Arma não encontrada.');
      if (eq.arma === a.id) throw new ErroDoMercado(naoEquipado);
      const armas = (c.armas ?? []).filter((x) => x.id !== ref.id);
      const perfilEquipamentos = (c.perfilEquipamentos ?? []).filter((id) => id !== ref.id);
      return { doc: { ...c, armas, perfilEquipamentos }, patch: { armas, perfilEquipamentos }, item: { tipo: 'arma', arma: a as unknown as Record<string, unknown> & { id: string; baseId: string } } };
    }
    case 'armadura': {
      const a = (c.armaduras ?? []).find((x) => x.id === ref.id);
      if (!a) throw new ErroDoMercado('Armadura não encontrada.');
      if (eq.armaduras.has(a.id)) throw new ErroDoMercado(naoEquipado);
      const armaduras = (c.armaduras ?? []).filter((x) => x.id !== ref.id);
      const perfilEquipamentos = (c.perfilEquipamentos ?? []).filter((id) => id !== ref.id);
      return { doc: { ...c, armaduras, perfilEquipamentos }, patch: { armaduras, perfilEquipamentos }, item: { tipo: 'armadura', armadura: a as unknown as Record<string, unknown> & { id: string; pecaId: string } } };
    }
  }
}

/**
 * Põe o item no jogador. O que não cabe (cartas, armas ou armaduras no limite) volta em `pelaCaixa`, o presente que vai
 * pelo Correio.
 */
export function entregarItem(ctx: ContextoTransacao, c: CharacterDocument, item: ItemDoAnuncio, motivo: string): { doc: CharacterDocument; patch: Partial<CharacterDocument>; pelaCaixa?: PresenteDoCorreio } {
  switch (item.tipo) {
    case 'material': {
      const inventario = { ...(c.inventario ?? {}), [item.id]: (c.inventario?.[item.id] ?? 0) + item.quantidade };
      return { doc: { ...c, inventario }, patch: { inventario } };
    }
    case 'recurso':
      return mudarRecurso(ctx, c, item.id, item.quantidade, motivo);
    case 'carta': {
      const carta = item.carta as CartaItem;
      if ((c.cartasItens ?? []).length >= CARTAS_MAXIMAS) return { doc: c, patch: {}, pelaCaixa: { cartas: [carta] } };
      const cartasItens = [...(c.cartasItens ?? []), carta];
      const cartasDescobertas = [...new Set([...(c.cartasDescobertas ?? []), carta.tipo])];
      return { doc: { ...c, cartasItens, cartasDescobertas }, patch: { cartasItens, cartasDescobertas } };
    }
    case 'emblema': {
      const emblemasItens = [...(c.emblemasItens ?? []), item.emblema];
      return { doc: { ...c, emblemasItens }, patch: { emblemasItens } };
    }
    case 'arma': {
      const arma = item.arma as unknown as ArmaPersonagem;
      if ((c.armas ?? []).length >= MAX_ARMAS_POR_PERSONAGEM) return { doc: c, patch: {}, pelaCaixa: { armas: [arma] } };
      const armas = [...(c.armas ?? []), arma];
      return { doc: { ...c, armas }, patch: { armas } };
    }
    case 'armadura': {
      const armadura = item.armadura as unknown as ArmaduraPersonagem;
      if ((c.armaduras ?? []).length >= MAX_ARMADURAS_POR_PERSONAGEM) return { doc: c, patch: {}, pelaCaixa: { armaduras: [armadura] } };
      const armaduras = [...(c.armaduras ?? []), armadura];
      return { doc: { ...c, armaduras }, patch: { armaduras } };
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Lista dos anúncios (guardada na memória por 30 segundos: poucas leituras no Firestore)
// ---------------------------------------------------------------------------------------------------------------

const GUARDA_DA_LISTA_MS = 30_000;
let listaGuardada: { em: number; anuncios: AnuncioDoMercado[] } | null = null;

export function limparCacheDoMercado(): void {
  listaGuardada = null;
}

async function todosOsAnuncios(agora: number): Promise<AnuncioDoMercado[]> {
  if (listaGuardada && agora - listaGuardada.em < GUARDA_DA_LISTA_MS) return listaGuardada.anuncios;
  const anuncios = await repositorio.listarAnunciosDoMercado();
  listaGuardada = { em: agora, anuncios };
  return anuncios;
}

export interface AnuncioNaTela {
  id: string;
  vendedor: string;
  categoria: CategoriaDoMercado;
  raridade: RaridadeDoMercado;
  nomeDaRaridade: string;
  nome: string;
  detalhe: string;
  quantidade: number;
  moeda: MoedaDoMercado;
  preco: number;
  expiraEm: string;
  meu: boolean;
}

const naTela = (a: AnuncioDoMercado, uid: string): AnuncioNaTela => ({
  id: a.id,
  vendedor: a.vendedorNome,
  categoria: a.categoria,
  raridade: a.raridade,
  nomeDaRaridade: EMBLEMA_RARIDADE_MAP[a.raridade]?.nome ?? a.raridade,
  nome: a.nome,
  detalhe: a.detalhe,
  quantidade: a.quantidade,
  moeda: a.moeda,
  preco: a.preco,
  expiraEm: a.expiraEm,
  meu: a.vendedorUid === uid,
});

export interface FiltroDoMercado {
  categoria?: unknown;
  raridade?: unknown;
  busca?: unknown;
  ordem?: unknown;
  pagina?: unknown;
}

export interface EstadoDoMercado {
  nivelNecessario: number;
  podeNegociar: boolean;
  /** Por que não pode (nível ou e-mail), quando não pode. */
  motivo: string | null;
  anuncios: AnuncioNaTela[];
  total: number;
  pagina: number;
  paginas: number;
  meus: AnuncioNaTela[];
  limiteDeAnuncios: number;
  vendaveis: (ItemVendavel & { nomeDaRaridade: string })[];
  ouro: number;
  diamantes: number;
}

function motivoParaNaoNegociar(c: CharacterDocument, emailVerificado: boolean): string | null {
  if (c.nivel < NIVEL_DO_MERCADO) return `O Mercado abre no nível ${NIVEL_DO_MERCADO}.`;
  if (!emailVerificado) return 'Confirme o seu e-mail para usar o Mercado. Procure a mensagem de confirmação na sua caixa de entrada.';
  return null;
}

export async function estadoDoMercado(uid: string, emailVerificado: boolean, filtro: FiltroDoMercado = {}, agora = new Date()): Promise<EstadoDoMercado> {
  let [char, todos] = await Promise.all([repositorio.lerPersonagem(uid), todosOsAnuncios(agora.getTime())]);
  if (!char) throw new Error('Personagem não encontrado.');
  // Os anúncios vencidos do jogador voltam para ele (a lista em memória diz se há algum; só aí lê o banco)
  if (todos.some((a) => a.vendedorUid === uid && anuncioExpirado(a, agora))) {
    await devolverExpirados(uid, agora);
    [char, todos] = await Promise.all([repositorio.lerPersonagem(uid), todosOsAnuncios(agora.getTime())]);
    if (!char) throw new Error('Personagem não encontrado.');
  }
  const busca = typeof filtro.busca === 'string' ? chaveDeBuscaDoMercado(filtro.busca).slice(0, 40) : '';
  const categoria = (CATEGORIAS_DO_MERCADO as readonly unknown[]).includes(filtro.categoria) ? filtro.categoria : null;
  const raridadeFiltro = (RARIDADES_DO_MERCADO as readonly unknown[]).includes(filtro.raridade) ? filtro.raridade : null;
  const visiveis = todos
    .filter((a) => !anuncioExpirado(a, agora))
    .filter((a) => (!categoria || a.categoria === categoria) && (!raridadeFiltro || a.raridade === raridadeFiltro))
    .filter((a) => !busca || chaveDeBuscaDoMercado(a.nome).includes(busca));
  const ordem = filtro.ordem === 'maiorPreco' ? -1 : filtro.ordem === 'recentes' ? 0 : 1;
  visiveis.sort((a, b) => (ordem === 0 ? b.criadoEm.localeCompare(a.criadoEm) : ordem * (precoPorUnidade(a) - precoPorUnidade(b))) || a.id.localeCompare(b.id));
  const paginas = Math.max(1, Math.ceil(visiveis.length / ANUNCIOS_POR_PAGINA));
  const pagina = Math.min(paginas, Math.max(1, typeof filtro.pagina === 'number' ? Math.floor(filtro.pagina) : Number(filtro.pagina) || 1));
  const meusIds = new Set(char.anunciosNoMercado ?? []);
  return {
    nivelNecessario: NIVEL_DO_MERCADO,
    podeNegociar: !motivoParaNaoNegociar(char, emailVerificado),
    motivo: motivoParaNaoNegociar(char, emailVerificado),
    anuncios: visiveis.slice((pagina - 1) * ANUNCIOS_POR_PAGINA, pagina * ANUNCIOS_POR_PAGINA).map((a) => naTela(a, uid)),
    total: visiveis.length,
    pagina,
    paginas,
    meus: todos.filter((a) => a.vendedorUid === uid && meusIds.has(a.id)).map((a) => naTela(a, uid)),
    limiteDeAnuncios: ANUNCIOS_ATIVOS_MAXIMOS,
    vendaveis: vendaveisDe(char).map((v) => ({ ...v, nomeDaRaridade: EMBLEMA_RARIDADE_MAP[v.raridade]?.nome ?? v.raridade })),
    ouro: char.ouro,
    diamantes: char.diamantes ?? 0,
  };
}

/** Os anúncios do jogador que passaram de 7 dias voltam para ele (o item volta à mochila; carta sem espaço, ao Correio). */
async function devolverExpirados(uid: string, agora: Date): Promise<void> {
  await repositorio.executarTransacao('mercado:devolver', async (ctx) => {
    let eu = await carregarPersonagem(ctx, uid);
    let patch: Partial<CharacterDocument> = {};
    const ficam: string[] = [];
    for (const id of eu.anunciosNoMercado ?? []) {
      const a = await ctx.lerAnuncioDoMercado(id);
      if (!a || a.vendedorUid !== uid) continue;
      if (!anuncioExpirado(a, agora)) {
        ficam.push(id);
        continue;
      }
      const r = entregarItem(ctx, eu, a.item, `Mercado: anúncio expirado (${a.nome})`);
      eu = r.doc;
      patch = { ...patch, ...r.patch };
      if (r.pelaCaixa) patch.correio = eu.correio = comMensagem(eu.correio, novaMensagem({ titulo: 'Anúncio expirado', texto: `Seu anúncio de ${a.nome} passou de 7 dias e o item voltou pelo Correio (não cabia na mochila).`, de: 'Mercado', presente: r.pelaCaixa }, agora), agora);
      ctx.apagarAnuncioDoMercado(id);
    }
    salvarPersonagem(ctx, eu, { ...patch, anunciosNoMercado: ficam.length ? ficam : undefined });
  });
  limparCacheDoMercado();
}

// ---------------------------------------------------------------------------------------------------------------
// Ações: anunciar, comprar e cancelar
// ---------------------------------------------------------------------------------------------------------------

export const ACOES_DO_MERCADO = ['anunciar', 'comprar', 'cancelar'] as const;

export interface PedidoDoMercado {
  item?: unknown;
  quantidade?: unknown;
  moeda?: unknown;
  preco?: unknown;
  id?: unknown;
}

const nomeDaMoeda = (m: MoedaDoMercado, n: number) => (m === 'ouro' ? `${n.toLocaleString('pt-BR')} de ouro` : `${n.toLocaleString('pt-BR')} ${n === 1 ? 'Diamante' : 'Diamantes'}`);

function refDoPedido(bruto: unknown): RefDoItem {
  const o = (bruto ?? {}) as Record<string, unknown>;
  const tipos = ['material', 'recurso', 'carta', 'emblema', 'arma', 'armadura'];
  if (typeof o.tipo !== 'string' || !tipos.includes(o.tipo) || typeof o.id !== 'string' || !o.id || o.id.length > 120) throw new ErroDoMercado('Escolha o item.');
  return { tipo: o.tipo as RefDoItem['tipo'], id: o.id };
}

export async function agirNoMercado(uid: string, emailVerificado: boolean, acao: unknown, pedido: PedidoDoMercado, agora = new Date()): Promise<{ mensagem: string }> {
  if (typeof acao !== 'string' || !(ACOES_DO_MERCADO as readonly string[]).includes(acao)) throw new ErroDoMercado('Ação desconhecida.');
  await exigirSistemaLigado(uid, 'mercado');
  let resposta: { mensagem: string; revisoes: EntradaDeRevisao[] };
  if (acao === 'anunciar') resposta = await anunciar(uid, emailVerificado, pedido, agora);
  else if (acao === 'comprar') resposta = await comprar(uid, emailVerificado, pedido, agora);
  else resposta = await cancelar(uid, pedido, agora);
  limparCacheDoMercado();
  for (const r of resposta.revisoes) await repositorio.gravarRevisao(r).catch((e) => registrarLog('ERROR', 'mercado.revisao_falhou', descreverErro(e)));
  return { mensagem: resposta.mensagem };
}

function exigirQuemNegocia(c: CharacterDocument, emailVerificado: boolean) {
  if (c.nivel < NIVEL_DO_MERCADO) throw new ErroDoMercado(`O Mercado abre no nível ${NIVEL_DO_MERCADO}.`);
  exigirEmailVerificado({ emailVerificado });
}

async function anunciar(uid: string, emailVerificado: boolean, pedido: PedidoDoMercado, agora: Date) {
  const ref = refDoPedido(pedido.item);
  if (!ehMoedaDoMercado(pedido.moeda)) throw new ErroDoMercado('Escolha a moeda: ouro ou Diamantes.');
  if (!precoValido(pedido.preco)) throw new ErroDoMercado('Escolha um preço inteiro a partir de 1.');
  const unico = ref.tipo !== 'material' && ref.tipo !== 'recurso';
  const quantidade = unico ? 1 : typeof pedido.quantidade === 'number' && Number.isInteger(pedido.quantidade) && pedido.quantidade >= 1 ? pedido.quantidade : 0;
  if (!quantidade) throw new ErroDoMercado('Escolha a quantidade do lote.');
  const moeda = pedido.moeda;
  const preco = pedido.preco;
  return repositorio.executarTransacao('mercado:anunciar', async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    exigirQuemNegocia(eu, emailVerificado);
    const meus = eu.anunciosNoMercado ?? [];
    if (meus.length >= ANUNCIOS_ATIVOS_MAXIMOS) throw new ErroDoMercado(`Você já tem ${ANUNCIOS_ATIVOS_MAXIMOS} anúncios no Mercado. Cancele um ou espere vender.`);
    const r = retirar(ctx, eu, ref, quantidade, 'Mercado: anúncio');
    const d = descreverItem(r.item);
    const anuncio: AnuncioDoMercado = {
      id: `a${agora.getTime().toString(36)}${randomUUID().replace(/-/g, '').slice(0, 10)}`,
      vendedorUid: uid,
      vendedorNome: eu.nome,
      item: r.item,
      categoria: d.categoria,
      raridade: d.raridade,
      nome: d.nome,
      detalhe: d.detalhe,
      quantidade: d.quantidade,
      moeda,
      preco,
      criadoEm: agora.toISOString(),
      expiraEm: new Date(agora.getTime() + DURACAO_DO_ANUNCIO_MS).toISOString(),
    };
    ctx.gravarAnuncioDoMercado(anuncio);
    salvarPersonagem(ctx, r.doc, { ...r.patch, anunciosNoMercado: [...meus, anuncio.id] });
    return { mensagem: `${d.quantidade > 1 ? `${d.quantidade}× ` : ''}${d.nome} à venda por ${nomeDaMoeda(moeda, preco)}, por 7 dias.`, revisoes: [] };
  });
}

async function comprar(uid: string, emailVerificado: boolean, pedido: PedidoDoMercado, agora: Date) {
  const id = typeof pedido.id === 'string' && pedido.id.length <= 64 ? pedido.id : '';
  if (!id) throw new ErroDoMercado('Escolha o anúncio.');
  return repositorio.executarTransacao('mercado:comprar', async (ctx) => {
    const a = await ctx.lerAnuncioDoMercado(id);
    if (!a || anuncioExpirado(a, agora)) throw new ErroDoMercado('Esse anúncio não está mais à venda.');
    if (a.vendedorUid === uid) throw new ErroDoMercado('Esse anúncio é seu. Para tirar do Mercado, cancele.');
    let eu = await carregarPersonagem(ctx, uid);
    exigirQuemNegocia(eu, emailVerificado);
    let vendedor = await carregarPersonagem(ctx, a.vendedorUid);
    const rotulo = `${a.quantidade > 1 ? `${a.quantidade}× ` : ''}${a.nome}`;
    // o dinheiro: sai de quem compra e entra para quem vende, com extrato dos dois
    eu = alterarSaldoEm(ctx, eu, a.moeda, -a.preco, `Mercado: compra de ${rotulo}`).character;
    vendedor = alterarSaldoEm(ctx, vendedor, a.moeda, a.preco, `Mercado: venda de ${rotulo}`).character;
    const r = entregarItem(ctx, eu, a.item, `Mercado: compra de ${rotulo}`);
    eu = r.doc;
    let correioDoComprador = eu.correio;
    if (r.pelaCaixa)
      correioDoComprador = comMensagem(correioDoComprador, novaMensagem({ titulo: 'Compra no Mercado', texto: `${a.nome} não cabia na sua mochila e chegou pelo Correio.`, de: 'Mercado', presente: r.pelaCaixa }, agora), agora);
    // sinais para a fila de revisão: compras repetidas do mesmo vendedor e preço muito fora do normal
    const compras = [...(eu.comprasNoMercado ?? []).filter((c) => agora.getTime() - Date.parse(c.em) < 86_400_000), { de: a.vendedorUid, em: agora.toISOString() }].slice(-30);
    const doMesmo = compras.filter((c) => c.de === a.vendedorUid).length;
    const chaveDoPreco = `${a.item.tipo}:${chaveDoTipoDoItem(a.item)}:${a.moeda}`;
    const precos = await ctx.lerPrecosDoMercado(chaveDoPreco);
    const unidade = precoPorUnidade(a);
    const atipico = precoAtipico(unidade, precos);
    ctx.gravarPrecosDoMercado(chaveDoPreco, [...precos, unidade].slice(-VENDAS_GUARDADAS_POR_ITEM));
    salvarPersonagem(ctx, eu, { ...r.patch, ouro: eu.ouro, diamantes: eu.diamantes, correio: correioDoComprador, comprasNoMercado: compras });
    salvarPersonagem(ctx, vendedor, {
      ouro: vendedor.ouro,
      diamantes: vendedor.diamantes,
      anunciosNoMercado: (vendedor.anunciosNoMercado ?? []).filter((x) => x !== a.id),
      correio: comMensagem(vendedor.correio, novaMensagem({ titulo: 'Venda no Mercado', texto: `${eu.nome} comprou ${rotulo} por ${nomeDaMoeda(a.moeda, a.preco)}. O valor já está no seu saldo.`, de: 'Mercado' }, agora), agora),
    });
    ctx.apagarAnuncioDoMercado(a.id);
    const revisoes: EntradaDeRevisao[] = [];
    const hora = horaDe(agora);
    if (doMesmo === COMPRAS_DO_MESMO_VENDEDOR)
      revisoes.push({ id: idDaRevisao(uid, hora, 'trocaEntreAsMesmasContas'), uid, nome: eu.nome, tipo: 'trocaEntreAsMesmasContas', descricao: `${doMesmo} compras de ${vendedor.nome} em 24 horas no Mercado.`, criadaEm: agora.toISOString(), revisada: false, contasDaRede: [a.vendedorUid] });
    if (atipico)
      revisoes.push({ id: idDaRevisao(a.vendedorUid, hora, 'precoAtipico'), uid: a.vendedorUid, nome: vendedor.nome, tipo: 'precoAtipico', descricao: `Vendeu ${rotulo} para ${eu.nome} por ${nomeDaMoeda(a.moeda, a.preco)}, muito fora do preço normal desse item.`, criadaEm: agora.toISOString(), revisada: false, contasDaRede: [uid] });
    return { mensagem: `Você comprou ${rotulo} por ${nomeDaMoeda(a.moeda, a.preco)}.${r.pelaCaixa ? ' Não cabia na sua mochila: o item foi para o Correio.' : ''}`, revisoes };
  });
}

/** O que identifica "o mesmo item" para comparar preços: o material, o recurso, o tipo da carta ou do emblema, a base da arma, a peça da armadura. */
function chaveDoTipoDoItem(item: ItemDoAnuncio): string {
  switch (item.tipo) {
    case 'material':
    case 'recurso':
      return item.id;
    case 'carta':
      return item.carta.tipo;
    case 'emblema':
      return item.emblema.tipo;
    case 'arma':
      return `${item.arma.baseId}:${String(item.arma.categoria)}`;
    case 'armadura':
      return item.armadura.pecaId;
  }
}

async function cancelar(uid: string, pedido: PedidoDoMercado, agora: Date) {
  const id = typeof pedido.id === 'string' && pedido.id.length <= 64 ? pedido.id : '';
  if (!id) throw new ErroDoMercado('Escolha o anúncio.');
  return repositorio.executarTransacao('mercado:cancelar', async (ctx) => {
    const a = await ctx.lerAnuncioDoMercado(id);
    if (!a || a.vendedorUid !== uid) throw new ErroDoMercado('Esse anúncio não está mais no Mercado.');
    let eu = await carregarPersonagem(ctx, uid);
    const r = entregarItem(ctx, eu, a.item, `Mercado: anúncio cancelado (${a.nome})`);
    eu = r.doc;
    const correio = r.pelaCaixa ? comMensagem(eu.correio, novaMensagem({ titulo: 'Anúncio cancelado', texto: `${a.nome} não cabia na sua mochila e voltou pelo Correio.`, de: 'Mercado', presente: r.pelaCaixa }, agora), agora) : eu.correio;
    const ficam = (eu.anunciosNoMercado ?? []).filter((x) => x !== id);
    salvarPersonagem(ctx, eu, { ...r.patch, correio, anunciosNoMercado: ficam.length ? ficam : undefined });
    ctx.apagarAnuncioDoMercado(id);
    return { mensagem: `Anúncio cancelado: ${a.nome} voltou para ${r.pelaCaixa ? 'o Correio' : 'a sua mochila'}.`, revisoes: [] };
  });
}
