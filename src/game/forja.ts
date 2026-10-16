import { ATTRIBUTES, AttributeName } from '@/rules/attributes';
import {
  ArmaBase,
  CATEGORIAS_ARMA_MAP,
  CUSTOMIZACAO,
  CategoriaArma,
  OpcaoCustomizacao,
  ReceitaArma,
  atributosSorteaveis,
  percentualCustoReforja,
  podeCustomizar,
  sortearAtributoDaArma,
  sortearPontosDaArma,
} from '@/rules/armas';
import { ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import { armaDesativada } from '@/rules/catalogoAoVivo';
import { MATERIAIS_MAP } from '@/rules/materiais';
import { ORBES_ARMADURA_MAP } from '@/rules/armaduras';
import { MATERIAIS_MUNDO, MATERIAIS_MUNDO_MAP } from '@/rules/materiaisArmas';
import { RaridadeMaterial } from '@/rules/raridades';

/**
 * Forja (servidor): fabricar, evoluir, reforjar e customizar armas. Funções puras: recebem o estado do
 * personagem (inventário, ouro, armas) e devolvem o estado novo ou o motivo do bloqueio. O servidor grava
 * tudo numa transação. Regras aprovadas pelo Yuri em 12/10/2026.
 */

/** Arma que o personagem tem. O tipo do atributo sorteado fica fixo ao evoluir; os pontos são sorteados de novo. */
export interface ArmaPersonagem {
  id: string;
  baseId: string;
  categoria: CategoriaArma;
  atributo: AttributeName;
  pontos: number;
  /** Reforjas feitas nesta arma (aumenta o custo da próxima). */
  reforjas: number;
  /** Customização (só Mítico): pontos em cada opção. */
  customizacao?: Partial<Record<OpcaoCustomizacao, number>>;
  criadaEm: string;
}

export interface EstadoForja {
  inventario: Readonly<Record<string, number>>;
  ouro: number;
  armas: readonly ArmaPersonagem[];
}

/** Limite de armas guardadas por personagem (o documento do Firestore tem tamanho máximo). */
export const MAX_ARMAS_POR_PERSONAGEM = 200;

/** Item do Bilhete de melhoria (cai em 1% das vitórias contra monstros 9★; paga a Customização). */
export const BILHETE_DE_MELHORIA = { id: 'bilhete-de-melhoria', nome: 'Bilhete de melhoria' } as const;

/** Nome de qualquer item do inventário: material de monstro ou de mundo, Bilhete de melhoria ou orbe de armadura. */
export function nomeDoItem(id: string): string {
  if (id === BILHETE_DE_MELHORIA.id) return BILHETE_DE_MELHORIA.nome;
  return MATERIAIS_MAP[id]?.nome ?? MATERIAIS_MUNDO_MAP[id]?.nome ?? ORBES_ARMADURA_MAP[id]?.nome ?? id;
}

export type MotivoBloqueioForja =
  | 'armaInvalida'
  | 'armaDesativada'
  | 'categoriaInvalida'
  | 'armaAnteriorAusente'
  | 'materiaisInsuficientes'
  | 'ouroInsuficiente'
  | 'limiteDeArmas'
  | 'armaNaoEncontrada'
  | 'naoCustomizavel'
  | 'customizacaoNoMaximo'
  | 'opcaoInvalida'
  | 'semStatus'
  | 'bilheteInsuficiente';

export const MENSAGEM_BLOQUEIO_FORJA: Readonly<Record<MotivoBloqueioForja, string>> = {
  armaInvalida: 'Arma inválida.',
  armaDesativada: 'Esta arma não está disponível para fabricação no momento.',
  categoriaInvalida: 'Categoria de arma inválida.',
  armaAnteriorAusente: 'Para evoluir, escolha a arma anterior da árvore (mesma categoria).',
  materiaisInsuficientes: 'Materiais insuficientes para esta receita.',
  ouroInsuficiente: 'Ouro insuficiente.',
  limiteDeArmas: `Você já tem ${MAX_ARMAS_POR_PERSONAGEM} armas. Libere espaço para fabricar outra.`,
  armaNaoEncontrada: 'Arma não encontrada.',
  naoCustomizavel: 'Só armas Míticas aceitam Customização.',
  customizacaoNoMaximo: `A Customização já está no máximo (+${CUSTOMIZACAO.pontosMaximos}).`,
  opcaoInvalida: 'Opção de Customização inválida.',
  semStatus: 'Esta arma não tem status para melhorar.',
  bilheteInsuficiente: 'Bilhete de melhoria insuficiente.',
};

export type ResultadoForja<T> = ({ ok: true } & T) | { ok: false; motivo: MotivoBloqueioForja };

/** Custo de uma receita (ou de uma fração dela, no Reforjar): itens do inventário, diversos e ouro. */
export interface CustoForja {
  itens: Record<string, number>;
  diversos: { raridade: RaridadeMaterial; qtd: number } | null;
  ouro: number;
}

export function custoDaReceita(receita: ReceitaArma, percentual = 100): CustoForja {
  const fracao = (q: number) => Math.ceil((q * percentual) / 100);
  const itens: Record<string, number> = {};
  for (const i of [...receita.materiaisMonstro, ...receita.materiaisMundo]) {
    itens[i.id] = (itens[i.id] ?? 0) + fracao(i.qtd);
  }
  return {
    itens,
    diversos: receita.diversos ? { raridade: receita.diversos.raridade, qtd: fracao(receita.diversos.qtd) } : null,
    ouro: fracao(receita.ouro),
  };
}

/** Ids dos dois diversos de uma raridade (a receita aceita qualquer um deles). */
export function diversosDaRaridade(raridade: RaridadeMaterial): string[] {
  return MATERIAIS_MUNDO.filter((m) => m.tipo === 'diverso' && m.raridade === raridade).map((m) => m.id);
}

/** Tira o custo do inventário; os diversos saem do primeiro da raridade e o resto do segundo. */
export function pagarCusto(
  inventario: Readonly<Record<string, number>>,
  custo: CustoForja
): Record<string, number> | null {
  const novo = { ...inventario };
  for (const [id, qtd] of Object.entries(custo.itens)) {
    if ((novo[id] ?? 0) < qtd) return null;
    novo[id] -= qtd;
  }
  if (custo.diversos) {
    let falta = custo.diversos.qtd;
    for (const id of diversosDaRaridade(custo.diversos.raridade)) {
      const usa = Math.min(falta, novo[id] ?? 0);
      if (usa > 0) novo[id] -= usa;
      falta -= usa;
    }
    if (falta > 0) return null;
  }
  for (const id of Object.keys(novo)) if (novo[id] === 0) delete novo[id];
  return novo;
}

export interface PedidoFabricacao {
  baseId: unknown;
  categoria: unknown;
  /** Arma anterior da árvore, consumida ao evoluir (obrigatória quando a receita consome uma arma). */
  armaAnteriorId?: unknown;
}

export interface Ambiente {
  aleatorio: () => number;
  novoId: () => string;
  agora: string;
}

/** Fabrica a primeira arma de uma árvore ou evolui a anterior (que é consumida). */
export function planejarFabricacao(
  estado: EstadoForja,
  pedido: PedidoFabricacao,
  amb: Ambiente
): ResultadoForja<{ inventario: Record<string, number>; ouroGasto: number; armas: ArmaPersonagem[]; arma: ArmaPersonagem; base: ArmaBase }> {
  const base = typeof pedido.baseId === 'string' ? ARMAS_BASE_MAP[pedido.baseId] : undefined;
  if (!base) return { ok: false, motivo: 'armaInvalida' };
  if (armaDesativada(base.id)) return { ok: false, motivo: 'armaDesativada' };
  if (typeof pedido.categoria !== 'string' || !(pedido.categoria in CATEGORIAS_ARMA_MAP)) {
    return { ok: false, motivo: 'categoriaInvalida' };
  }
  const categoria = pedido.categoria as CategoriaArma;

  let anterior: ArmaPersonagem | undefined;
  if (base.consome) {
    anterior = estado.armas.find((a) => a.id === pedido.armaAnteriorId);
    if (!anterior || anterior.baseId !== base.consome || anterior.categoria !== categoria) {
      return { ok: false, motivo: 'armaAnteriorAusente' };
    }
  } else if (estado.armas.length >= MAX_ARMAS_POR_PERSONAGEM) {
    return { ok: false, motivo: 'limiteDeArmas' };
  }

  const custo = custoDaReceita(base.receita);
  const inventario = pagarCusto(estado.inventario, custo);
  if (!inventario) return { ok: false, motivo: 'materiaisInsuficientes' };
  if (estado.ouro < custo.ouro) return { ok: false, motivo: 'ouroInsuficiente' };

  const atributo =
    anterior && atributosSorteaveis(categoria).includes(anterior.atributo)
      ? anterior.atributo
      : sortearAtributoDaArma(categoria, amb.aleatorio);
  const arma: ArmaPersonagem = {
    id: amb.novoId(),
    baseId: base.id,
    categoria,
    atributo,
    pontos: sortearPontosDaArma(base.raridade, amb.aleatorio),
    reforjas: 0,
    criadaEm: amb.agora,
  };
  const armas = [...estado.armas.filter((a) => a.id !== anterior?.id), arma];
  return { ok: true, inventario, ouroGasto: custo.ouro, armas, arma, base };
}

/** Reforjar: sorteia de novo os pontos do atributo (mantém o tipo), pagando parte da receita. */
export function planejarReforja(
  estado: EstadoForja,
  armaId: unknown,
  amb: Pick<Ambiente, 'aleatorio'>
): ResultadoForja<{ inventario: Record<string, number>; ouroGasto: number; armas: ArmaPersonagem[]; arma: ArmaPersonagem; percentual: number }> {
  const atual = estado.armas.find((a) => a.id === armaId);
  const base = atual ? ARMAS_BASE_MAP[atual.baseId] : undefined;
  if (!atual || !base) return { ok: false, motivo: 'armaNaoEncontrada' };

  const percentual = percentualCustoReforja(atual.reforjas);
  const custo = custoDaReceita(base.receita, percentual);
  const inventario = pagarCusto(estado.inventario, custo);
  if (!inventario) return { ok: false, motivo: 'materiaisInsuficientes' };
  if (estado.ouro < custo.ouro) return { ok: false, motivo: 'ouroInsuficiente' };

  const arma: ArmaPersonagem = { ...atual, pontos: sortearPontosDaArma(base.raridade, amb.aleatorio), reforjas: atual.reforjas + 1 };
  const armas = estado.armas.map((a) => (a.id === arma.id ? arma : a));
  return { ok: true, inventario, ouroGasto: custo.ouro, armas, arma, percentual };
}

export function pontosDeCustomizacao(arma: Pick<ArmaPersonagem, 'customizacao'>): number {
  return Object.values(arma.customizacao ?? {}).reduce((s, v) => s + (v ?? 0), 0);
}

const OPCOES_CUSTOMIZACAO: readonly OpcaoCustomizacao[] = ['dano', 'atributo', 'status'];

/** Customização (só Mítico): +1 ponto na opção escolhida, por 20.000 de ouro e 1 Bilhete de melhoria. */
export function planejarCustomizacao(
  estado: EstadoForja,
  armaId: unknown,
  opcao: unknown
): ResultadoForja<{ inventario: Record<string, number>; ouroGasto: number; armas: ArmaPersonagem[]; arma: ArmaPersonagem }> {
  const atual = estado.armas.find((a) => a.id === armaId);
  const base = atual ? ARMAS_BASE_MAP[atual.baseId] : undefined;
  if (!atual || !base) return { ok: false, motivo: 'armaNaoEncontrada' };
  if (!podeCustomizar(base.raridade)) return { ok: false, motivo: 'naoCustomizavel' };
  if (typeof opcao !== 'string' || !OPCOES_CUSTOMIZACAO.includes(opcao as OpcaoCustomizacao)) {
    return { ok: false, motivo: 'opcaoInvalida' };
  }
  const escolha = opcao as OpcaoCustomizacao;
  if (escolha === 'status' && base.status.length === 0) return { ok: false, motivo: 'semStatus' };
  if (pontosDeCustomizacao(atual) >= CUSTOMIZACAO.pontosMaximos) return { ok: false, motivo: 'customizacaoNoMaximo' };

  const bilhetes = estado.inventario[BILHETE_DE_MELHORIA.id] ?? 0;
  if (bilhetes < CUSTOMIZACAO.bilhetesPorPonto) return { ok: false, motivo: 'bilheteInsuficiente' };
  if (estado.ouro < CUSTOMIZACAO.ouroPorPonto) return { ok: false, motivo: 'ouroInsuficiente' };

  const inventario: Record<string, number> = { ...estado.inventario, [BILHETE_DE_MELHORIA.id]: bilhetes - CUSTOMIZACAO.bilhetesPorPonto };
  if (inventario[BILHETE_DE_MELHORIA.id] === 0) delete inventario[BILHETE_DE_MELHORIA.id];
  const arma: ArmaPersonagem = {
    ...atual,
    customizacao: { ...atual.customizacao, [escolha]: (atual.customizacao?.[escolha] ?? 0) + 1 },
  };
  const armas = estado.armas.map((a) => (a.id === arma.id ? arma : a));
  return { ok: true, inventario, ouroGasto: CUSTOMIZACAO.ouroPorPonto, armas, arma };
}

/** Lê as armas gravadas, descartando entradas inválidas (dados antigos ou corrompidos). */
export function lerArmasPersonagem(valor: unknown): ArmaPersonagem[] {
  if (!Array.isArray(valor)) return [];
  const armas: ArmaPersonagem[] = [];
  for (const v of valor) {
    if (!v || typeof v !== 'object') continue;
    const a = v as Record<string, unknown>;
    if (typeof a.id !== 'string' || typeof a.baseId !== 'string' || !ARMAS_BASE_MAP[a.baseId]) continue;
    if (typeof a.categoria !== 'string' || !(a.categoria in CATEGORIAS_ARMA_MAP)) continue;
    if (typeof a.atributo !== 'string' || !(ATTRIBUTES as readonly string[]).includes(a.atributo)) continue;
    const customizacao: Partial<Record<OpcaoCustomizacao, number>> = {};
    if (a.customizacao && typeof a.customizacao === 'object') {
      for (const o of OPCOES_CUSTOMIZACAO) {
        const n = Number((a.customizacao as Record<string, unknown>)[o] ?? 0);
        if (Number.isInteger(n) && n > 0) customizacao[o] = n;
      }
    }
    armas.push({
      id: a.id,
      baseId: a.baseId,
      categoria: a.categoria as CategoriaArma,
      atributo: a.atributo as AttributeName,
      pontos: Number(a.pontos) || 0,
      reforjas: Number(a.reforjas) || 0,
      ...(Object.keys(customizacao).length > 0 ? { customizacao } : {}),
      criadaEm: typeof a.criadaEm === 'string' ? a.criadaEm : '',
    });
  }
  return armas;
}
