import { randomInt, randomUUID } from 'node:crypto';
import { semanaDe, fimDaSemana } from '@/rules/chefeSemanal';
import { criarCarta } from '@/rules/almas';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import {
  CARTAS_EPICAS,
  catalogoDaSemana,
  compradasNoMes,
  EMBLEMAS_EPICOS,
  mesDeBrasilia,
  NIVEL_DA_LOJA,
  type MoedaDaLoja,
  type ProdutoDaLoja,
} from '@/rules/loja';
import type { ItemDoAnuncio } from '@/rules/mercado';
import { sorteadorDaSemente } from '@/server/almas';
import { alterarSaldoEm, carregarPersonagem, salvarPersonagem } from '@/server/characterService';
import { comMensagem, novaMensagem } from '@/server/correio';
import { entregarItem } from '@/server/mercado';
import { repositorio } from '@/server/persistencia';
import { exigirSistemaLigado } from '@/server/sistemasLeitura';

/**
 * Loja normal (7.2). O catálogo da semana sai da própria semana (sem documento no Firestore) e cada compra é uma
 * transação só no personagem: tira o preço, entrega o item (o que não cabe na mochila vai pelo Correio) e conta o limite
 * do mês em comprasNaLoja.
 */

export class ErroDaLoja extends Error {
  readonly status = 400;
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDaLoja';
  }
}

const QUANTIDADE_MAXIMA_POR_COMPRA = 100;

export const nomeDaMoedaDaLoja = (m: MoedaDaLoja, n: number) =>
  `${n.toLocaleString('pt-BR')} ${m === 'ouro' ? 'de ouro' : m === 'diamantes' ? (n === 1 ? 'Diamante' : 'Diamantes') : 'de Essência de Soberano'}`;

export interface ProdutoNaTela extends ProdutoDaLoja {
  nomeDaRaridade: string;
  comprados: number;
  restantes: number;
}

export interface EstadoDaLoja {
  nivelNecessario: number;
  podeComprar: boolean;
  saldos: Record<MoedaDaLoja, number>;
  /** Quando a parte da semana gira (segunda à meia-noite de Brasília). */
  giraEm: string;
  produtos: ProdutoNaTela[];
  /** O que os baús de escolha deixam escolher. */
  escolhas: { cartas: { id: string; nome: string; categoria: string }[]; emblemas: { id: string; nome: string }[] };
}

/** A meia-noite de Brasília (UTC-3) da segunda-feira em que a próxima semana começa. */
const giraEm = (agora: Date) => new Date(`${fimDaSemana(semanaDe(agora))}T03:00:00.000Z`).toISOString();

export async function estadoDaLoja(uid: string, agora = new Date()): Promise<EstadoDaLoja> {
  const c = await repositorio.lerPersonagem(uid);
  if (!c) throw new Error('Personagem não encontrado.');
  return {
    nivelNecessario: NIVEL_DA_LOJA,
    podeComprar: c.nivel >= NIVEL_DA_LOJA,
    saldos: { ouro: c.ouro ?? 0, diamantes: c.diamantes ?? 0, essenciaDeSoberano: c.essenciaDeSoberano ?? 0 },
    giraEm: giraEm(agora),
    produtos: catalogoDaSemana(semanaDe(agora)).map((p) => {
      const comprados = compradasNoMes(c.comprasNaLoja, p.chave, agora);
      return { ...p, nomeDaRaridade: EMBLEMA_RARIDADE_MAP[p.raridade]?.nome ?? p.raridade, comprados, restantes: Math.max(0, p.limiteMensal - comprados) };
    }),
    escolhas: {
      cartas: CARTAS_EPICAS.map((t) => ({ id: t.id, nome: t.nome, categoria: t.categoria })),
      emblemas: EMBLEMAS_EPICOS.map((t) => ({ id: t.id, nome: t.nome })),
    },
  };
}

/** Os itens que uma compra entrega (cartas e emblemas um por unidade; materiais e recursos de uma vez). */
function itensDaCompra(p: ProdutoDaLoja, quantidade: number, escolha: string): ItemDoAnuncio[] {
  const sorteio = sorteadorDaSemente(randomInt(1, 2 ** 31));
  switch (p.tipo) {
    case 'material':
      return [{ tipo: 'material', id: p.id, quantidade }];
    case 'recurso':
      return [{ tipo: 'recurso', id: p.id, quantidade }];
    case 'carta':
      return Array.from({ length: quantidade }, () => ({ tipo: 'carta' as const, carta: criarCarta(randomUUID(), p.id, sorteio) }));
    case 'emblema':
      return Array.from({ length: quantidade }, () => ({ tipo: 'emblema' as const, emblema: { id: randomUUID(), tipo: p.id, estrelas: 1 } }));
    case 'escolhaCarta':
      if (!CARTAS_EPICAS.some((t) => t.id === escolha)) throw new ErroDaLoja('Escolha a carta épica.');
      return Array.from({ length: quantidade }, () => ({ tipo: 'carta' as const, carta: criarCarta(randomUUID(), escolha, sorteio) }));
    case 'escolhaEmblema':
      if (!EMBLEMAS_EPICOS.some((t) => t.id === escolha)) throw new ErroDaLoja('Escolha o emblema épico.');
      return Array.from({ length: quantidade }, () => ({ tipo: 'emblema' as const, emblema: { id: randomUUID(), tipo: escolha, estrelas: 1 } }));
  }
}

/** Compra `quantidade` unidades do produto (do catálogo desta semana), dentro do limite do mês. */
export async function comprarNaLoja(uid: string, chaveBruta: unknown, quantidadeBruta: unknown, escolhaBruta: unknown, agora = new Date()): Promise<{ mensagem: string }> {
  await exigirSistemaLigado(uid, 'loja');
  const chave = typeof chaveBruta === 'string' ? chaveBruta : '';
  const produto = catalogoDaSemana(semanaDe(agora)).find((p) => p.chave === chave);
  if (!produto) throw new ErroDaLoja('Esse item não está mais na loja. A parte da semana pode ter girado: atualize a tela.');
  const quantidade = typeof quantidadeBruta === 'number' && Number.isInteger(quantidadeBruta) ? quantidadeBruta : 0;
  if (quantidade < 1 || quantidade > QUANTIDADE_MAXIMA_POR_COMPRA) throw new ErroDaLoja('Quantidade inválida.');
  const escolha = typeof escolhaBruta === 'string' ? escolhaBruta : '';
  const itens = itensDaCompra(produto, quantidade, escolha);
  const nomeDoItem = produto.tipo === 'escolhaCarta' ? CARTAS_EPICAS.find((t) => t.id === escolha)!.nome : produto.tipo === 'escolhaEmblema' ? EMBLEMAS_EPICOS.find((t) => t.id === escolha)!.nome : produto.nome;
  const rotulo = `${quantidade > 1 ? `${quantidade}× ` : ''}${nomeDoItem}`;
  const total = produto.preco * quantidade;
  return repositorio.executarTransacao('loja:comprar', async (ctx) => {
    let eu = await carregarPersonagem(ctx, uid);
    if (eu.nivel < NIVEL_DA_LOJA) throw new ErroDaLoja(`A loja abre no nível ${NIVEL_DA_LOJA}.`);
    const comprados = compradasNoMes(eu.comprasNaLoja, chave, agora);
    if (comprados + quantidade > produto.limiteMensal) {
      const resta = Math.max(0, produto.limiteMensal - comprados);
      throw new ErroDaLoja(resta ? `Você só pode comprar mais ${resta} deste item neste mês.` : 'Você já comprou o limite deste item neste mês. O limite zera no dia 1.');
    }
    eu = alterarSaldoEm(ctx, eu, produto.moeda, -total, `Loja: ${rotulo}`).character;
    let patch: Record<string, unknown> = {};
    // na loja, só carta pode não caber na mochila (emblemas não têm limite; armas e armaduras não são vendidas)
    const cartasPelaCaixa = [];
    for (const item of itens) {
      const r = entregarItem(ctx, eu, item, `Loja: ${rotulo}`);
      eu = r.doc;
      patch = { ...patch, ...r.patch };
      cartasPelaCaixa.push(...(r.pelaCaixa?.cartas ?? []));
    }
    const mes = mesDeBrasilia(agora);
    const anteriores = eu.comprasNaLoja?.mes === mes ? eu.comprasNaLoja.itens : {};
    const comprasNaLoja = { mes, itens: { ...anteriores, [chave]: comprados + quantidade } };
    const correio = cartasPelaCaixa.length
      ? comMensagem(eu.correio, novaMensagem({ titulo: 'Compra na Loja', texto: `${nomeDoItem} não cabia na sua mochila e chegou pelo Correio.`, de: 'Loja', presente: { cartas: cartasPelaCaixa } }, agora), agora)
      : eu.correio;
    salvarPersonagem(ctx, eu, { ...patch, [produto.moeda]: eu[produto.moeda], comprasNaLoja, correio });
    return { mensagem: `Você comprou ${rotulo} por ${nomeDaMoedaDaLoja(produto.moeda, total)}.${cartasPelaCaixa.length ? ' O que não cabia na mochila foi para o Correio.' : ''}` };
  });
}
