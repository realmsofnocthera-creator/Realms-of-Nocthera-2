import { randomUUID } from 'node:crypto';
import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import { criarCarta, TIPOS_DE_CARTA } from '@/rules/almas';
import { ARMAS_BASE } from '@/rules/armasCatalogo';
import { CATEGORIAS_ARMA, sortearAtributoDaArma, sortearPontosDaArma } from '@/rules/armas';
import { PECAS_ARMADURA } from '@/rules/armadurasCatalogo';
import { sortearAtributoDaArmadura, sortearPontosDaArmadura } from '@/rules/armaduras';
import { armaDesativada, pecaDesativada } from '@/rules/catalogoAoVivo';
import type { PresenteDoCorreio } from '@/rules/correio';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { TIPOS_EMBLEMA } from '@/rules/emblemasCatalogo';
import {
  inicioDoItem,
  ITENS_POR_LEILAO,
  LANCE_MINIMO,
  LOTE_DE_MATERIAL,
  MINUTOS_POR_ITEM,
  NIVEL_DO_LEILAO,
  PESO_DA_CATEGORIA,
  PESO_DA_RARIDADE,
  porPeso,
  proximoDiaDeLeilao,
  proximoLance,
  situacaoDoItem,
  temLeilao,
  fimDepoisDoLance,
  type ItemDoLeilao,
  type LeilaoDoDia,
  type SituacaoDoItem,
} from '@/rules/leilao';
import { MATERIAIS } from '@/rules/materiais';
import { MATERIAIS_MUNDO } from '@/rules/materiaisArmas';
import type { CategoriaDoMercado, ItemDoAnuncio, MoedaDoMercado, RaridadeDoMercado } from '@/rules/mercado';
import { sorteadorDaSemente } from '@/server/almas';
import { alterarSaldoEm, carregarPersonagem, salvarPersonagem, type CharacterDocument } from '@/server/characterService';
import { comMensagem, novaMensagem } from '@/server/correio';
import { descreverItem } from '@/server/mercado';
import { repositorio } from '@/server/persistencia';
import { exigirSistemaLigado } from '@/server/sistemasLeitura';

/**
 * Leilão (7.2). O leilão do dia é sorteado uma vez (no primeiro acesso do dia) e guardado em leilao/{dia}. Cada lance
 * roda numa transação: tira o valor de quem dá o lance e devolve o do lance anterior. Quando um item acaba, o próximo
 * acesso ao leilão manda o item ao vencedor pelo Correio (o valor dele já saiu do saldo e some da economia).
 */

export class ErroDoLeilao extends Error {
  readonly status = 400;
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDoLeilao';
  }
}

type RaridadeDoLeilao = keyof typeof PESO_DA_RARIDADE;
const RARIDADES_DO_LEILAO = Object.keys(PESO_DA_RARIDADE) as RaridadeDoLeilao[];

/** Um número da semente a partir do dia (o mesmo dia sorteia sempre os mesmos tipos). */
function sementeDoDia(dia: string): number {
  let h = 2166136261;
  for (const c of `leilao:${dia}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** Os candidatos de uma categoria e raridade (sem os desligados no painel). */
function candidatos(categoria: CategoriaDoMercado, raridade: RaridadeDoLeilao): string[] {
  switch (categoria) {
    case 'carta':
      return TIPOS_DE_CARTA.filter((t) => t.raridade === raridade).map((t) => t.id);
    case 'emblema':
      return TIPOS_EMBLEMA.filter((t) => t.raridade === raridade).map((t) => t.id);
    case 'arma':
      return ARMAS_BASE.filter((b) => b.raridade === raridade && !armaDesativada(b.id)).map((b) => b.id);
    case 'armadura':
      return PECAS_ARMADURA.filter((p) => p.raridade === raridade && !pecaDesativada(p.id)).map((p) => p.id);
    case 'material':
      return [...MATERIAIS, ...MATERIAIS_MUNDO].filter((m) => m.raridade === raridade).map((m) => m.id);
    default:
      return [];
  }
}

function criarItem(categoria: CategoriaDoMercado, id: string, sorteio: () => number, agora: Date): ItemDoAnuncio {
  switch (categoria) {
    case 'carta':
      return { tipo: 'carta', carta: criarCarta(randomUUID(), id, sorteio) };
    case 'emblema':
      return { tipo: 'emblema', emblema: { id: randomUUID(), tipo: id, estrelas: 1 } };
    case 'arma': {
      const base = ARMAS_BASE.find((b) => b.id === id)!;
      const cat = CATEGORIAS_ARMA[Math.floor(sorteio() * CATEGORIAS_ARMA.length)].id;
      return { tipo: 'arma', arma: { id: randomUUID(), baseId: id, categoria: cat, atributo: sortearAtributoDaArma(cat, sorteio), pontos: sortearPontosDaArma(base.raridade, sorteio), reforjas: 0, criadaEm: agora.toISOString() } };
    }
    case 'armadura': {
      const peca = PECAS_ARMADURA.find((p) => p.id === id)!;
      return { tipo: 'armadura', armadura: { id: randomUUID(), pecaId: id, atributo: sortearAtributoDaArmadura(sorteio), pontos: sortearPontosDaArmadura(peca.raridade, sorteio), reforjas: 0, xp: 0, criadaEm: agora.toISOString() } };
    }
    default:
      return { tipo: 'material', id, quantidade: LOTE_DE_MATERIAL };
  }
}

/** Sorteia os 10 itens do leilão do dia. */
export function sortearLeilao(dia: string, agora = new Date()): LeilaoDoDia {
  const sorteio = sorteadorDaSemente(sementeDoDia(dia));
  const itens: ItemDoLeilao[] = [];
  for (let indice = 0; indice < ITENS_POR_LEILAO; indice++) {
    const categoria = porPeso(PESO_DA_CATEGORIA, sorteio());
    let raridade = porPeso(PESO_DA_RARIDADE, sorteio());
    let lista = candidatos(categoria, raridade);
    // se não houver item dessa raridade na categoria, tenta as outras raridades
    for (const r of RARIDADES_DO_LEILAO) {
      if (lista.length) break;
      raridade = r;
      lista = candidatos(categoria, r);
    }
    const item = criarItem(categoria, lista[Math.floor(sorteio() * lista.length)], sorteio, agora);
    const d = descreverItem(item);
    const inicio = inicioDoItem(dia, indice);
    itens.push({
      indice,
      item,
      categoria: d.categoria,
      raridade: raridade as RaridadeDoMercado,
      nome: d.nome,
      detalhe: d.detalhe,
      quantidade: d.quantidade,
      moeda: LANCE_MINIMO[raridade].moeda,
      minimo: LANCE_MINIMO[raridade].valor,
      inicio: inicio.toISOString(),
      fim: new Date(inicio.getTime() + MINUTOS_POR_ITEM * 60_000).toISOString(),
    });
  }
  return { dia, itens };
}

// O leilão do dia fica na memória por 2 segundos: muita gente olhando ao mesmo tempo custa poucas leituras
const GUARDA_MS = 2_000;
const guardados = new Map<string, { em: number; leilao: LeilaoDoDia }>();
export function limparCacheDoLeilao(): void {
  guardados.clear();
}

async function leilaoDe(dia: string, agora: Date): Promise<LeilaoDoDia> {
  const g = guardados.get(dia);
  if (g && agora.getTime() - g.em < GUARDA_MS) return g.leilao;
  let leilao = await repositorio.lerLeilao(dia);
  if (!leilao) {
    leilao = await repositorio.executarTransacao('leilao:sortear', async (ctx) => {
      const ja = await ctx.lerLeilao(dia);
      if (ja) return ja;
      const novo = sortearLeilao(dia, agora);
      ctx.gravarLeilao(novo);
      return novo;
    });
  }
  guardados.set(dia, { em: agora.getTime(), leilao });
  return leilao;
}

const presenteDoItem = (item: ItemDoAnuncio): PresenteDoCorreio => {
  switch (item.tipo) {
    case 'material':
      return { materiais: { [item.id]: item.quantidade } };
    case 'carta':
      return { cartas: [item.carta as never] };
    case 'emblema':
      return { emblemas: [item.emblema] };
    case 'arma':
      return { armas: [item.arma as never] };
    case 'armadura':
      return { armaduras: [item.armadura as never] };
    default:
      return {};
  }
};

const nomeDaMoeda = (m: MoedaDoMercado, n: number) => (m === 'ouro' ? `${n.toLocaleString('pt-BR')} de ouro` : `${n.toLocaleString('pt-BR')} ${n === 1 ? 'Diamante' : 'Diamantes'}`);

/** Manda pelo Correio os itens que acabaram e ainda não foram entregues. */
async function fecharEncerrados(dia: string, agora: Date): Promise<void> {
  const leilao = await leilaoDe(dia, agora);
  if (!leilao.itens.some((i) => !i.fechado && situacaoDoItem(i, agora) === 'encerrado')) return;
  await repositorio.executarTransacao('leilao:fechar', async (ctx) => {
    const atual = await ctx.lerLeilao(dia);
    if (!atual) return;
    const vencedores = new Map<string, CharacterDocument>();
    for (const i of atual.itens) {
      if (i.fechado || situacaoDoItem(i, agora) !== 'encerrado') continue;
      i.fechado = true;
      if (!i.lance) continue;
      const v = vencedores.get(i.lance.uid) ?? (await carregarPersonagem(ctx, i.lance.uid));
      const rotulo = `${i.quantidade > 1 ? `${i.quantidade}× ` : ''}${i.nome}`;
      vencedores.set(i.lance.uid, { ...v, correio: comMensagem(v.correio, novaMensagem({ titulo: 'Leilão', texto: `Você arrematou ${rotulo} por ${nomeDaMoeda(i.moeda, i.lance.valor)}.`, de: 'Leilão', presente: presenteDoItem(i.item) }, agora), agora) });
    }
    for (const v of vencedores.values()) salvarPersonagem(ctx, v, { correio: v.correio });
    ctx.gravarLeilao(atual);
  });
  guardados.delete(dia);
}

export interface ItemDoLeilaoNaTela {
  indice: number;
  nome: string;
  categoria: CategoriaDoMercado;
  raridade: RaridadeDoMercado;
  nomeDaRaridade: string;
  detalhe: string;
  quantidade: number;
  moeda: MoedaDoMercado;
  inicio: string;
  fim: string;
  situacao: SituacaoDoItem;
  /** O maior lance (nome e valor), ou null. */
  lance: { nome: string; valor: number } | null;
  /** Quem pediu tem o maior lance. */
  meu: boolean;
  proximo: number;
}

export interface EstadoDoLeilao {
  nivelNecessario: number;
  podeDarLance: boolean;
  /** Hoje tem leilão? */
  hoje: boolean;
  /** O dia do leilão mostrado (hoje ou o próximo) e quando ele começa. */
  dia: string;
  comecaEm: string;
  itens: ItemDoLeilaoNaTela[];
  /** A hora do servidor, para a contagem regressiva da tela. */
  agora: string;
}

export async function estadoDoLeilao(uid: string, agora = new Date()): Promise<EstadoDoLeilao> {
  const hoje = diaDeBrasilia(agora);
  const char = await repositorio.lerPersonagem(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  const base = { nivelNecessario: NIVEL_DO_LEILAO, podeDarLance: char.nivel >= NIVEL_DO_LEILAO, agora: agora.toISOString() };
  if (!temLeilao(hoje)) {
    const dia = proximoDiaDeLeilao(hoje);
    return { ...base, hoje: false, dia, comecaEm: inicioDoItem(dia, 0).toISOString(), itens: [] };
  }
  await fecharEncerrados(hoje, agora);
  const leilao = await leilaoDe(hoje, agora);
  return {
    ...base,
    hoje: true,
    dia: hoje,
    comecaEm: inicioDoItem(hoje, 0).toISOString(),
    itens: leilao.itens.map((i) => ({
      indice: i.indice,
      nome: i.nome,
      categoria: i.categoria,
      raridade: i.raridade,
      nomeDaRaridade: EMBLEMA_RARIDADE_MAP[i.raridade]?.nome ?? i.raridade,
      detalhe: i.detalhe,
      quantidade: i.quantidade,
      moeda: i.moeda,
      inicio: i.inicio,
      fim: i.fim,
      situacao: situacaoDoItem(i, agora),
      lance: i.lance ? { nome: i.lance.nome, valor: i.lance.valor } : null,
      meu: i.lance?.uid === uid,
      proximo: proximoLance(i),
    })),
  };
}

/** Dá o próximo lance (o valor que a tela mostrou; se outro lance chegou antes, recusa e mostra o novo). */
export async function darLance(uid: string, indiceBruto: unknown, valorBruto: unknown, agora = new Date()): Promise<{ mensagem: string }> {
  await exigirSistemaLigado(uid, 'leilao');
  const dia = diaDeBrasilia(agora);
  if (!temLeilao(dia)) throw new ErroDoLeilao('Hoje não tem leilão.');
  const indice = typeof indiceBruto === 'number' && Number.isInteger(indiceBruto) ? indiceBruto : -1;
  const valor = typeof valorBruto === 'number' && Number.isInteger(valorBruto) ? valorBruto : -1;
  await leilaoDe(dia, agora);
  const r = await repositorio.executarTransacao('leilao:lance', async (ctx) => {
    const leilao = await ctx.lerLeilao(dia);
    const item = leilao?.itens[indice];
    if (!leilao || !item) throw new ErroDoLeilao('Item do leilão não encontrado.');
    const situacao = situacaoDoItem(item, agora);
    if (situacao === 'aguardando') throw new ErroDoLeilao('Esse item ainda não abriu para lances.');
    if (situacao === 'encerrado') throw new ErroDoLeilao('O leilão desse item já acabou.');
    if (item.lance?.uid === uid) throw new ErroDoLeilao('Você já tem o maior lance desse item.');
    const proximo = proximoLance(item);
    if (valor !== proximo) throw new ErroDoLeilao(`Outro lance chegou antes: o próximo agora é ${nomeDaMoeda(item.moeda, proximo)}.`);
    let eu = await carregarPersonagem(ctx, uid);
    if (eu.nivel < NIVEL_DO_LEILAO) throw new ErroDoLeilao(`O leilão abre no nível ${NIVEL_DO_LEILAO}.`);
    // o lance fica reservado: sai do saldo agora; o anterior volta para quem tinha dado
    eu = alterarSaldoEm(ctx, eu, item.moeda, -valor, `Leilão: lance em ${item.nome}`).character;
    if (item.lance) {
      const anterior = alterarSaldoEm(ctx, await carregarPersonagem(ctx, item.lance.uid), item.moeda, item.lance.valor, `Leilão: lance coberto em ${item.nome}`).character;
      salvarPersonagem(ctx, anterior, { [item.moeda]: anterior[item.moeda] });
    }
    salvarPersonagem(ctx, eu, { [item.moeda]: eu[item.moeda] });
    item.lance = { uid, nome: eu.nome, valor, em: agora.toISOString() };
    item.fim = fimDepoisDoLance(item.fim, agora);
    ctx.gravarLeilao(leilao);
    return { nome: item.nome, moeda: item.moeda };
  });
  guardados.delete(dia);
  return { mensagem: `Lance de ${nomeDaMoeda(r.moeda, valor)} em ${r.nome}. Se alguém cobrir, o valor volta para você.` };
}
