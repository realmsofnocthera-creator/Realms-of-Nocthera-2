import { estaAtivo, NOME_DO_SELO, type ColecionaveisDoJogador, type SeloDeBusca } from './colecionaveis';
import { nivelDaTrilha, TRILHAS_DE_MAESTRIA, type MaestriasDoJogador } from './maestrias';
import { TIPOS_DE_CARTA } from './almas';
import { CATEGORIAS_DO_TESTE, DIFICULDADES_DO_TESTE } from './testeEquipe';
import { TITULO_MAP } from './titulos';

/**
 * Conquistas (decididas pelo Yuri em 23/10/2026): metas com progresso e resgate. Cada conquista tem 5 degraus; o
 * progresso sobe sozinho jogando e o jogador resgata a recompensa de cada degrau batido. O que já está no personagem
 * (nível, andar da Torre, colecionáveis…) vale desde já; os totais novos (vitórias, forjas, expedições, buscas e dias
 * de Chefe Mundial) só contam daqui para frente. Metas, recompensas e títulos: proposta aprovada pelo Yuri em
 * 23/10/2026 (os nomes dos títulos são provisórios).
 */

export const DEGRAUS = 5;

/** Os totais que o jogo passa a contar (ficam em `estatisticas` no personagem). */
export const CONTADORES = ['vitorias', 'vitoriasContraChefes', 'forjas', 'expedicoes', 'buscas', 'diasDeChefeMundial'] as const;
export type Contador = (typeof CONTADORES)[number];
export type EstatisticasDoJogador = Partial<Record<Contador, number>>;

export type CategoriaDeConquista = 'combate' | 'provacoes' | 'progresso';
export const NOME_DA_CATEGORIA: Readonly<Record<CategoriaDeConquista, string>> = { combate: 'Combate', provacoes: 'Provações', progresso: 'Progresso' };

/** O que o progresso de uma conquista lê do personagem. */
export interface FichaDeConquistas {
  nivel: number;
  torreAndar?: number;
  guerreiroVencidas?: number[];
  batalhaSangrentaVencidas?: string[];
  testeEquipeConcluidas?: string[];
  colecionaveis?: ColecionaveisDoJogador;
  maestrias?: MaestriasDoJogador;
  cartasDescobertas?: string[];
  estatisticas?: EstatisticasDoJogador;
}

export interface Conquista {
  id: string;
  nome: string;
  categoria: CategoriaDeConquista;
  /** A meta em texto, com {n} no lugar do número. */
  meta: string;
  /** A meta no singular, quando o degrau pede só 1. */
  metaDeUm?: string;
  metas: readonly [number, number, number, number, number];
  progresso: (f: FichaDeConquistas) => number;
  /** Título ganho no último degrau. */
  titulo?: string;
  /** Recompensas com Avanços de expedição (Expedição e Buscas). */
  comAvancos?: boolean;
}

const contador = (c: Contador) => (f: FichaDeConquistas) => f.estatisticas?.[c] ?? 0;

export const TOTAL_DE_TESTES = CATEGORIAS_DO_TESTE.length * DIFICULDADES_DO_TESTE;
export const TOTAL_DE_CARTAS = TIPOS_DE_CARTA.length;

export const CONQUISTAS: readonly Conquista[] = [
  { id: 'vitorias', nome: 'Vitórias', categoria: 'combate', meta: 'Vença {n} lutas', metas: [10, 100, 500, 2000, 10000], progresso: contador('vitorias'), titulo: 'veterano-de-guerra' },
  { id: 'chefes', nome: 'Vitórias contra chefes', categoria: 'combate', meta: 'Vença {n} chefes', metas: [5, 25, 100, 300, 1000], progresso: contador('vitoriasContraChefes'), titulo: 'matador-de-chefes' },
  { id: 'nivel', nome: 'Nível', categoria: 'combate', meta: 'Chegue ao nível {n}', metas: [5, 10, 15, 20, 30], progresso: (f) => f.nivel },
  { id: 'torre', nome: 'Torre Celestial', categoria: 'provacoes', meta: 'Vença o andar {n}', metas: [10, 50, 100, 200, 300], progresso: (f) => f.torreAndar ?? 0, titulo: 'conquistador-da-torre' },
  { id: 'guerreiro', nome: 'Provação do Guerreiro', categoria: 'provacoes', meta: 'Vença {n} dificuldades', metaDeUm: 'Vença 1 dificuldade', metas: [1, 3, 5, 8, 10], progresso: (f) => f.guerreiroVencidas?.length ?? 0, titulo: 'mestre-guerreiro' },
  { id: 'batalhaSangrenta', nome: 'Batalha Sangrenta', categoria: 'provacoes', meta: 'Vença {n} dificuldades', metaDeUm: 'Vença 1 dificuldade', metas: [1, 2, 3, 4, 5], progresso: (f) => f.batalhaSangrentaVencidas?.length ?? 0, titulo: 'sanguinario' },
  { id: 'testeEquipe', nome: 'Teste de Equipe', categoria: 'provacoes', meta: 'Conclua {n} testes', metaDeUm: 'Conclua 1 teste', metas: [1, 3, 6, 12, TOTAL_DE_TESTES], progresso: (f) => f.testeEquipeConcluidas?.length ?? 0, titulo: 'provado-em-equipe' },
  { id: 'chefeMundial', nome: 'Chefe Mundial', categoria: 'provacoes', meta: 'Lute em {n} dias', metaDeUm: 'Lute em 1 dia', metas: [1, 5, 15, 30, 60], progresso: contador('diasDeChefeMundial'), titulo: 'cacador-de-soberanos' },
  { id: 'forja', nome: 'Forja', categoria: 'progresso', meta: 'Fabrique {n} itens', metaDeUm: 'Fabrique 1 item', metas: [1, 5, 25, 100, 300], progresso: contador('forjas'), titulo: 'mestre-ferreiro' },
  { id: 'expedicao', nome: 'Expedição', categoria: 'progresso', meta: 'Colete {n} expedições', metaDeUm: 'Colete 1 expedição', metas: [1, 10, 50, 150, 500], progresso: contador('expedicoes'), titulo: 'explorador-incansavel', comAvancos: true },
  { id: 'colecionaveis', nome: 'Colecionáveis', categoria: 'progresso', meta: 'Ative {n} colecionáveis', metaDeUm: 'Ative 1 colecionável', metas: [1, 10, 30, 60, 120], progresso: (f) => Object.values(f.colecionaveis ?? {}).filter(estaAtivo).length, titulo: 'colecionador-supremo' },
  { id: 'buscas', nome: 'Buscas', categoria: 'progresso', meta: 'Faça {n} buscas', metas: [10, 50, 200, 500, 1000], progresso: contador('buscas'), comAvancos: true },
  {
    id: 'maestria',
    nome: 'Maestria',
    categoria: 'progresso',
    meta: 'Leve uma maestria ao nível {n}',
    metas: [10, 25, 50, 75, 100],
    progresso: (f) => Math.max(0, ...TRILHAS_DE_MAESTRIA.map((t) => nivelDaTrilha(f.maestrias, t.id))),
    titulo: 'maestre',
  },
  { id: 'alma', nome: 'Alma', categoria: 'progresso', meta: 'Descubra {n} cartas da Alma', metas: [5, 15, 30, 45, TOTAL_DE_CARTAS], progresso: (f) => f.cartasDescobertas?.length ?? 0, titulo: 'guardiao-de-almas' },
];

export const CONQUISTA_MAP: Readonly<Record<string, Conquista>> = Object.fromEntries(CONQUISTAS.map((c) => [c.id, c]));

export const textoDaMeta = (c: Conquista, degrau: number) =>
  c.metas[degrau] === 1 && c.metaDeUm ? c.metaDeUm : c.meta.replace('{n}', c.metas[degrau].toLocaleString('pt-BR'));

// ---------------------------------------------------------------------------------------------------------------
// Recompensas
// ---------------------------------------------------------------------------------------------------------------

export interface RecompensaDeConquista {
  diamantes: number;
  selos: Partial<Record<SeloDeBusca, number>>;
  avancosDeExpedicao: number;
  titulo?: string;
}

const DIAMANTES_POR_DEGRAU = [3, 5, 10, 20, 40] as const;
const SELOS_POR_DEGRAU: readonly Partial<Record<SeloDeBusca, number>>[] = [{}, { desgastado: 10 }, { encantado: 5 }, { eternidade: 3 }, { origem: 1 }];
const AVANCOS_POR_DEGRAU = [1, 2, 3, 5, 10] as const;

/**
 * A recompensa de um degrau (0 a 4): Diamantes e selos que crescem com o degrau. Na Expedição e nas Buscas, os
 * selos dos degraus 2 e 3 viram Avanços de expedição (que vêm em todos os degraus delas). O último degrau dá o título.
 */
export function recompensaDoDegrau(c: Conquista, degrau: number): RecompensaDeConquista {
  const selos = c.comAvancos && degrau < 3 ? {} : { ...SELOS_POR_DEGRAU[degrau] };
  return {
    diamantes: DIAMANTES_POR_DEGRAU[degrau],
    selos,
    avancosDeExpedicao: c.comAvancos ? AVANCOS_POR_DEGRAU[degrau] : 0,
    ...(degrau === DEGRAUS - 1 && c.titulo ? { titulo: c.titulo } : {}),
  };
}

/** Soma recompensas (para resgatar vários degraus de uma vez). */
export function somarRecompensas(lista: readonly RecompensaDeConquista[]): RecompensaDeConquista & { titulos: string[] } {
  const total = { diamantes: 0, selos: {} as Partial<Record<SeloDeBusca, number>>, avancosDeExpedicao: 0, titulos: [] as string[] };
  for (const r of lista) {
    total.diamantes += r.diamantes;
    total.avancosDeExpedicao += r.avancosDeExpedicao;
    for (const [s, q] of Object.entries(r.selos) as [SeloDeBusca, number][]) total.selos[s] = (total.selos[s] ?? 0) + q;
    if (r.titulo) total.titulos.push(r.titulo);
  }
  return total;
}

// ---------------------------------------------------------------------------------------------------------------
// O que fica no personagem
// ---------------------------------------------------------------------------------------------------------------

/** Quantos degraus de cada conquista o jogador já resgatou. */
export type ConquistasDoJogador = Record<string, number>;

const inteiroPositivo = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export function conquistasDoDocumento(bruto: unknown): ConquistasDoJogador | undefined {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return undefined;
  const saida: ConquistasDoJogador = {};
  for (const [id, v] of Object.entries(bruto as Record<string, unknown>)) {
    const n = Math.min(DEGRAUS, inteiroPositivo(v));
    if (CONQUISTA_MAP[id] && n) saida[id] = n;
  }
  return Object.keys(saida).length ? saida : undefined;
}

export function estatisticasDoDocumento(bruto: unknown): EstatisticasDoJogador | undefined {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return undefined;
  const o = bruto as Record<string, unknown>;
  const saida: EstatisticasDoJogador = {};
  for (const c of CONTADORES) {
    const n = inteiroPositivo(o[c]);
    if (n) saida[c] = n;
  }
  return Object.keys(saida).length ? saida : undefined;
}

/** Soma aos totais do jogador (devolve um objeto novo). */
export function somarEstatisticas(atuais: EstatisticasDoJogador | undefined, ganhos: Partial<Record<Contador, number>>): EstatisticasDoJogador {
  const novas: EstatisticasDoJogador = { ...(atuais ?? {}) };
  for (const [c, n] of Object.entries(ganhos) as [Contador, number][]) if (n > 0) novas[c] = (novas[c] ?? 0) + Math.floor(n);
  return novas;
}

/** Degraus batidos de uma conquista (0 a 5), pela meta. */
export const degrausBatidos = (c: Conquista, progresso: number) => c.metas.filter((m) => progresso >= m).length;

/** Quantos degraus estão prontos para resgatar em todas as conquistas (o ponto do Menu). */
export function degrausProntos(f: FichaDeConquistas, resgatados: ConquistasDoJogador | undefined): number {
  return CONQUISTAS.reduce((t, c) => t + Math.max(0, degrausBatidos(c, c.progresso(f)) - (resgatados?.[c.id] ?? 0)), 0);
}

/** A recompensa de um degrau em partes curtas, para a tela. */
export function textoDaRecompensaDeConquista(r: RecompensaDeConquista): string[] {
  const partes: string[] = [];
  if (r.diamantes) partes.push(`${r.diamantes} Diamantes`);
  for (const [s, q] of Object.entries(r.selos) as [SeloDeBusca, number][]) partes.push(`${q}× ${NOME_DO_SELO[s]}`);
  if (r.avancosDeExpedicao) partes.push(`${r.avancosDeExpedicao} ${r.avancosDeExpedicao === 1 ? 'Avanço' : 'Avanços'} de expedição`);
  if (r.titulo) partes.push(`Título: ${TITULO_MAP[r.titulo]?.nome ?? r.titulo}`);
  return partes;
}

/** As 4 conquistas mais avançadas (mais degraus resgatados), para a vitrine do perfil. */
export function conquistasEmDestaque(resgatados: ConquistasDoJogador | undefined): { nome: string; degraus: number }[] {
  return CONQUISTAS.map((c) => ({ nome: c.nome, degraus: Math.min(DEGRAUS, resgatados?.[c.id] ?? 0) }))
    .filter((c) => c.degraus > 0)
    .sort((a, b) => b.degraus - a.degraus)
    .slice(0, 4);
}
