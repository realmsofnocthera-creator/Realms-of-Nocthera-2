import { ATTRIBUTES, type Attributes } from '@/rules/attributes';
import {
  BUSCAS_PARA_GARANTIA,
  COLECIONAVEL_MAP,
  colecionaveisDaRaridade,
  custoDaEstrela,
  custoDoReforco,
  ESTRELAS_MAXIMAS,
  estaAtivo,
  FRAGMENTOS_PARA_ATIVAR,
  FRAGMENTOS_POR_BUSCA,
  nivelMaximoDoReforco,
  RARIDADE_DO_SELO,
  SELOS_POR_BUSCA,
  sortearResultado,
  valorDoColecionavel,
  type ColecionaveisDoJogador,
  type RaridadeDeColecionavel,
  type SeloDeBusca,
  type SelosDoJogador,
} from '@/rules/colecionaveis';

/**
 * Buscar e Colecionáveis: operações puras (sem banco). O servidor chama estas funções numa transação e grava o
 * resultado. As regras e os números estão em `rules/colecionaveis.ts`.
 */

export type MotivoBloqueioColecionavel =
  | 'selosInsuficientes'
  | 'colecionavelNaoEncontrado'
  | 'jaAtivo'
  | 'naoAtivo'
  | 'fragmentosInsuficientes'
  | 'nivelMaximo'
  | 'memoriaInsuficiente'
  | 'estrelasMaximas'
  | 'pedrasInsuficientes';

export const MENSAGEM_BLOQUEIO_COLECIONAVEL: Readonly<Record<MotivoBloqueioColecionavel, string>> = {
  selosInsuficientes: 'Selos insuficientes para essa busca.',
  colecionavelNaoEncontrado: 'Colecionável não encontrado.',
  jaAtivo: 'Esse colecionável já está ativado.',
  naoAtivo: 'Ative o colecionável primeiro.',
  fragmentosInsuficientes: 'Fragmentos insuficientes.',
  nivelMaximo: 'O reforço chegou ao limite destas estrelas. Suba uma estrela para liberar mais níveis.',
  memoriaInsuficiente: 'Fragmentos de Memória insuficientes.',
  estrelasMaximas: 'Esse colecionável já tem 5 estrelas.',
  pedrasInsuficientes: 'Pedras da Recordação insuficientes.',
};

type Resultado<T> = ({ ok: true } & T) | { ok: false; motivo: MotivoBloqueioColecionavel };
const falha = (motivo: MotivoBloqueioColecionavel): { ok: false; motivo: MotivoBloqueioColecionavel } => ({ ok: false, motivo });

export interface ResultadoDaBusca {
  id: string;
  nome: string;
  raridade: RaridadeDeColecionavel;
  /** Saiu inteiro (senão, fragmentos). */
  inteiro: boolean;
  /** Fragmentos que entraram (de um resultado de fragmentos ou de um inteiro repetido). */
  fragmentos: number;
  /** O inteiro ativou o colecionável. */
  ativou: boolean;
  /** Veio da garantia da 10ª busca. */
  garantido: boolean;
}

/**
 * Faz `vezes` buscas com o selo: cada uma gasta 10 selos. A cada 10 buscas com o mesmo selo, a 10ª dá um inteiro da
 * raridade do selo. Um inteiro ativa o colecionável; se ele já estava ativo, vira os fragmentos de ativar.
 */
export function buscar(
  selos: SelosDoJogador,
  garantia: SelosDoJogador,
  colecionaveis: ColecionaveisDoJogador,
  selo: SeloDeBusca,
  vezes: number,
  sorteio: () => number
): Resultado<{ selos: SelosDoJogador; garantia: SelosDoJogador; colecionaveis: ColecionaveisDoJogador; resultados: ResultadoDaBusca[] }> {
  const custo = SELOS_POR_BUSCA * vezes;
  if ((selos[selo] ?? 0) < custo) return falha('selosInsuficientes');
  const novos: ColecionaveisDoJogador = { ...colecionaveis };
  let contador = garantia[selo] ?? 0;
  const resultados: ResultadoDaBusca[] = [];
  for (let i = 0; i < vezes; i++) {
    contador += 1;
    const garantido = contador >= BUSCAS_PARA_GARANTIA;
    const sorteado = garantido ? { raridade: RARIDADE_DO_SELO[selo], inteiro: true } : sortearResultado(selo, sorteio);
    if (garantido) contador = 0;
    const opcoes = colecionaveisDaRaridade(sorteado.raridade);
    const c = opcoes[Math.min(opcoes.length - 1, Math.floor(sorteio() * opcoes.length))];
    const atual = novos[c.id] ?? { fragmentos: 0 };
    let fragmentos = 0;
    let ativou = false;
    if (sorteado.inteiro && !estaAtivo(atual)) {
      novos[c.id] = { ...atual, nivel: 1 };
      ativou = true;
    } else {
      fragmentos = sorteado.inteiro ? FRAGMENTOS_PARA_ATIVAR[c.raridade] : FRAGMENTOS_POR_BUSCA[c.raridade];
      novos[c.id] = { ...atual, fragmentos: atual.fragmentos + fragmentos };
    }
    resultados.push({ id: c.id, nome: c.nome, raridade: c.raridade, inteiro: sorteado.inteiro, fragmentos, ativou, garantido });
  }
  const restantes = (selos[selo] ?? 0) - custo;
  const novosSelos = { ...selos, [selo]: restantes };
  if (!restantes) delete novosSelos[selo];
  const novaGarantia = { ...garantia, [selo]: contador };
  if (!contador) delete novaGarantia[selo];
  return { ok: true, selos: novosSelos, garantia: novaGarantia, colecionaveis: novos, resultados };
}

/** Ativa o colecionável gastando os fragmentos dele. */
export function ativarColecionavel(colecionaveis: ColecionaveisDoJogador, id: unknown): Resultado<{ colecionaveis: ColecionaveisDoJogador }> {
  const c = typeof id === 'string' ? COLECIONAVEL_MAP[id] : undefined;
  if (!c) return falha('colecionavelNaoEncontrado');
  const atual = colecionaveis[c.id] ?? { fragmentos: 0 };
  if (estaAtivo(atual)) return falha('jaAtivo');
  const custo = FRAGMENTOS_PARA_ATIVAR[c.raridade];
  if (atual.fragmentos < custo) return falha('fragmentosInsuficientes');
  return { ok: true, colecionaveis: { ...colecionaveis, [c.id]: { fragmentos: atual.fragmentos - custo, nivel: 1 } } };
}

/** Reforça `niveis` níveis de uma vez (tudo ou nada), gastando Fragmentos de Memória, até o limite das estrelas. */
export function reforcarColecionavel(
  colecionaveis: ColecionaveisDoJogador,
  memoria: number,
  id: unknown,
  niveis: number
): Resultado<{ colecionaveis: ColecionaveisDoJogador; memoria: number; nivel: number }> {
  const c = typeof id === 'string' ? COLECIONAVEL_MAP[id] : undefined;
  if (!c) return falha('colecionavelNaoEncontrado');
  const atual = colecionaveis[c.id];
  if (!atual || !estaAtivo(atual)) return falha('naoAtivo');
  const nivel = atual.nivel ?? 1;
  if (nivel + niveis > nivelMaximoDoReforco(atual.estrelas ?? 0)) return falha('nivelMaximo');
  let custo = 0;
  for (let n = nivel; n < nivel + niveis; n++) custo += custoDoReforco(c.raridade, n);
  if (memoria < custo) return falha('memoriaInsuficiente');
  return { ok: true, colecionaveis: { ...colecionaveis, [c.id]: { ...atual, nivel: nivel + niveis } }, memoria: memoria - custo, nivel: nivel + niveis };
}

/** Sobe uma estrela: gasta os fragmentos do próprio colecionável e Pedras da Recordação. */
export function subirEstrela(
  colecionaveis: ColecionaveisDoJogador,
  pedras: number,
  id: unknown
): Resultado<{ colecionaveis: ColecionaveisDoJogador; pedras: number; estrelas: number }> {
  const c = typeof id === 'string' ? COLECIONAVEL_MAP[id] : undefined;
  if (!c) return falha('colecionavelNaoEncontrado');
  const atual = colecionaveis[c.id];
  if (!atual || !estaAtivo(atual)) return falha('naoAtivo');
  const estrelas = atual.estrelas ?? 0;
  if (estrelas >= ESTRELAS_MAXIMAS) return falha('estrelasMaximas');
  const custo = custoDaEstrela(c.raridade, estrelas + 1);
  if (atual.fragmentos < custo.fragmentos) return falha('fragmentosInsuficientes');
  if (pedras < custo.pedras) return falha('pedrasInsuficientes');
  return {
    ok: true,
    colecionaveis: { ...colecionaveis, [c.id]: { ...atual, fragmentos: atual.fragmentos - custo.fragmentos, estrelas: estrelas + 1 } },
    pedras: pedras - custo.pedras,
    estrelas: estrelas + 1,
  };
}

/** Os pontos de atributo que os colecionáveis ativados dão (a soma de cada atributo). */
export function atributosDosColecionaveis(colecionaveis: ColecionaveisDoJogador | undefined): Attributes {
  const total = Object.fromEntries(ATTRIBUTES.map((a) => [a, 0])) as Attributes;
  for (const [id, e] of Object.entries(colecionaveis ?? {})) {
    const c = COLECIONAVEL_MAP[id];
    if (!c || !estaAtivo(e)) continue;
    total[c.atributo] += valorDoColecionavel(c.raridade, e.nivel ?? 1, e.estrelas ?? 0);
  }
  return total;
}
