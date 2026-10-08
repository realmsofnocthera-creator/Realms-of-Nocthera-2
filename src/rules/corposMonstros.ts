import { Elemento, MODIFICADOR_FRAQUEZA, ModificadoresElementais } from './elements';

/**
 * Roadmap 1.3 — Tipos de dano e categorias corporais dos monstros.
 * Um golpe físico tem um subtipo (Contusão, Corte ou Perfuração) que vem da ARMA; o dano mágico é um tipo à parte.
 * Cada criatura pertence a uma categoria corporal, que define a que tipos ela é fraca (+25% de dano) e resistente (−25%).
 */
export type SubtipoFisico = 'contusao' | 'corte' | 'perfuracao';
export type TipoGolpe = SubtipoFisico | 'magico';

export const NOMES_TIPO_GOLPE: Readonly<Record<TipoGolpe, string>> = {
  contusao: 'Contusão',
  corte: 'Corte',
  perfuracao: 'Perfuração',
  magico: 'Dano mágico',
};

export type CategoriaCorporal =
  | 'blindadoPesado'
  | 'rochoso'
  | 'feral'
  | 'organicoDesprotegido'
  | 'escamoso'
  | 'quitinoso'
  | 'blindagemMedia'
  | 'eterio'
  | 'amorfo'
  | 'cristalino'
  | 'aberrante'
  | 'sombrio';

export interface DefinicaoCorpo {
  nome: string;
  fraquezas: readonly TipoGolpe[];
  resistencias: readonly TipoGolpe[];
  /** Fraquezas elementais da categoria (Sombrio é fraco a Luz Sagrada). */
  fraquezasElementais?: readonly Elemento[];
  /** Aberrante: cada criatura define as próprias fraquezas e resistências. */
  variavel?: boolean;
}

export const CORPOS: Readonly<Record<CategoriaCorporal, DefinicaoCorpo>> = {
  blindadoPesado: { nome: 'Blindado pesado', fraquezas: ['contusao'], resistencias: ['corte'] },
  rochoso: { nome: 'Rochoso', fraquezas: ['contusao'], resistencias: ['corte', 'perfuracao'] },
  feral: { nome: 'Feral', fraquezas: [], resistencias: [] },
  organicoDesprotegido: { nome: 'Orgânico desprotegido', fraquezas: ['corte', 'perfuracao'], resistencias: [] },
  escamoso: { nome: 'Escamoso', fraquezas: ['contusao'], resistencias: ['corte', 'perfuracao'] },
  quitinoso: { nome: 'Quitinoso', fraquezas: ['contusao', 'perfuracao'], resistencias: ['corte'] },
  blindagemMedia: { nome: 'Blindagem média', fraquezas: ['contusao'], resistencias: ['corte'] },
  eterio: { nome: 'Etéreo', fraquezas: ['magico'], resistencias: ['corte', 'perfuracao', 'contusao'] },
  amorfo: { nome: 'Amorfo', fraquezas: ['perfuracao'], resistencias: ['corte', 'contusao'] },
  cristalino: { nome: 'Cristalino', fraquezas: ['contusao'], resistencias: ['corte', 'perfuracao'] },
  aberrante: { nome: 'Aberrante', fraquezas: [], resistencias: [], variavel: true },
  sombrio: {
    nome: 'Sombrio',
    fraquezas: [],
    resistencias: ['corte', 'perfuracao'],
    fraquezasElementais: ['sagrado'],
  },
};

export const CATEGORIAS_CORPORAIS = Object.keys(CORPOS) as CategoriaCorporal[];

export function ehCategoriaCorporal(valor: unknown): valor is CategoriaCorporal {
  return typeof valor === 'string' && valor in CORPOS;
}

/** Modificadores elementais que a categoria dá (Sombrio: fraco a Luz Sagrada). */
export function modificadoresElementaisDaCategoria(
  categoria: CategoriaCorporal | undefined
): ModificadoresElementais {
  const resultado: ModificadoresElementais = {};
  for (const elemento of categoria ? CORPOS[categoria].fraquezasElementais ?? [] : []) {
    resultado[elemento] = MODIFICADOR_FRAQUEZA;
  }
  return resultado;
}
