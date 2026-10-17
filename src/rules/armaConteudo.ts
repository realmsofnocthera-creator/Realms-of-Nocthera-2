import { CATEGORIAS_ARMA, RARIDADES_ARMA, type ArmaBase, type CategoriaArma, type ItemReceita, type RaridadeArma, type ReceitaArma } from '@/rules/armas';
import { MATERIAIS_MAP } from '@/rules/materiais';
import { MATERIAIS_MUNDO_MAP } from '@/rules/materiaisArmas';
import type { ResultadoValidacao } from '@/rules/mapa';
import { RARIDADES_MATERIAL, type RaridadeMaterial } from '@/rules/raridades';

/**
 * Arma no banco (3.5.2.1 e 3.5.3.2), formato 1: o que o Painel do Mestre pode ajustar numa arma do catálogo.
 * O id é o da arma base (os 164 do código). Os dados publicados SUBSTITUEM nomes, raridade, receita e o estado
 * "ativo"; elemento, status, estrela, posição e árvore (o que a arma consome) continuam os do código.
 * `ativo: false` impede fabricar a arma (quem já tem continua com ela).
 */
export const FORMATO_DA_ARMA = 1;
export const OURO_MAXIMO_DA_RECEITA = 100_000_000;
export const QUANTIDADE_MAXIMA_NA_RECEITA = 9_999;
export const ITENS_MAXIMOS_NA_RECEITA = 12;

export interface ArmaDados {
  formato: typeof FORMATO_DA_ARMA;
  nomes: Record<CategoriaArma, string>;
  raridade: RaridadeArma;
  receita: ReceitaArma;
  ativo: boolean;
}

const CHAVES = ['formato', 'nomes', 'raridade', 'receita', 'ativo'] as const;
const CHAVES_DA_RECEITA = ['materiaisMonstro', 'materiaisMundo', 'diversos', 'ouro'] as const;

function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function inteiro(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

function itensDaReceita(bruto: unknown, rotulo: string, existe: (id: string) => boolean, erros: string[]): ItemReceita[] {
  if (!Array.isArray(bruto)) {
    erros.push(`${rotulo}: precisa ser uma lista.`);
    return [];
  }
  if (bruto.length > ITENS_MAXIMOS_NA_RECEITA) erros.push(`${rotulo}: no máximo ${ITENS_MAXIMOS_NA_RECEITA} itens.`);
  const vistos = new Set<string>();
  const itens: ItemReceita[] = [];
  for (const item of bruto) {
    if (!ehObjeto(item) || typeof item.id !== 'string' || !existe(item.id)) {
      erros.push(`${rotulo}: material desconhecido (${ehObjeto(item) ? String(item.id) : String(item)}).`);
      continue;
    }
    if (!inteiro(item.qtd, 1, QUANTIDADE_MAXIMA_NA_RECEITA)) {
      erros.push(`${rotulo}: quantidade de ${item.id} deve ser um inteiro de 1 a ${QUANTIDADE_MAXIMA_NA_RECEITA}.`);
      continue;
    }
    if (vistos.has(item.id)) {
      erros.push(`${rotulo}: ${item.id} aparece duas vezes.`);
      continue;
    }
    vistos.add(item.id);
    itens.push({ id: item.id, qtd: item.qtd });
  }
  return itens;
}

/** Confere a receita (materiais conhecidos, quantidades e ouro) e devolve uma cópia limpa; os problemas vão para `erros`. */
export function validarReceita(brutoReceita: unknown, erros: string[]): ReceitaArma {
  let receita: ReceitaArma = { materiaisMonstro: [], materiaisMundo: [], diversos: null, ouro: 0 };
  if (!ehObjeto(brutoReceita)) erros.push('Receita: precisa ser um objeto.');
  else {
    const r = brutoReceita;
    const extra = Object.keys(r).filter((k) => !(CHAVES_DA_RECEITA as readonly string[]).includes(k));
    if (extra.length) erros.push(`Campos desconhecidos na receita: ${extra.join(', ')}.`);
    if (!inteiro(r.ouro, 0, OURO_MAXIMO_DA_RECEITA)) erros.push(`Ouro da receita: inteiro de 0 a ${OURO_MAXIMO_DA_RECEITA.toLocaleString('pt-BR')}.`);
    let diversos: ReceitaArma['diversos'] = null;
    if (r.diversos !== null && r.diversos !== undefined) {
      if (!ehObjeto(r.diversos) || !RARIDADES_MATERIAL.some((x) => x.id === (r.diversos as Record<string, unknown>).raridade)) {
        erros.push('Diversos: raridade inválida.');
      } else if (!inteiro((r.diversos as Record<string, unknown>).qtd, 1, QUANTIDADE_MAXIMA_NA_RECEITA)) {
        erros.push(`Diversos: quantidade de 1 a ${QUANTIDADE_MAXIMA_NA_RECEITA}.`);
      } else {
        const d = r.diversos as Record<string, unknown>;
        diversos = { raridade: d.raridade as RaridadeMaterial, qtd: d.qtd as number };
      }
    }
    receita = {
      materiaisMonstro: itensDaReceita(r.materiaisMonstro, 'Materiais do monstro', (id) => id in MATERIAIS_MAP, erros),
      materiaisMundo: itensDaReceita(r.materiaisMundo, 'Materiais do mundo', (id) => id in MATERIAIS_MUNDO_MAP, erros),
      diversos,
      ouro: typeof r.ouro === 'number' ? r.ouro : 0,
    };
  }
  return receita;
}

/** Cópia profunda da receita. */
export function copiarReceita(r: ReceitaArma): ReceitaArma {
  return {
    materiaisMonstro: r.materiaisMonstro.map((i) => ({ ...i })),
    materiaisMundo: r.materiaisMundo.map((i) => ({ ...i })),
    diversos: r.diversos ? { ...r.diversos } : null,
    ouro: r.ouro,
  };
}

/** Confere a arma e devolve uma cópia limpa. Campo desconhecido é erro. */
export function validarArma(bruto: unknown): ResultadoValidacao<ArmaDados> {
  const erros: string[] = [];
  if (!ehObjeto(bruto)) return { ok: false, erros: ['A arma precisa ser um objeto.'] };
  const extras = Object.keys(bruto).filter((k) => !(CHAVES as readonly string[]).includes(k));
  if (extras.length) erros.push(`Campos desconhecidos na arma: ${extras.join(', ')}.`);
  if (bruto.formato !== FORMATO_DA_ARMA) erros.push(`Formato da arma não suportado (esperado ${FORMATO_DA_ARMA}).`);
  if (typeof bruto.ativo !== 'boolean') erros.push('Ativo: sim ou não.');
  if (typeof bruto.raridade !== 'string' || !RARIDADES_ARMA.some((r) => r.id === bruto.raridade)) erros.push('Raridade inválida.');

  const nomes = {} as Record<CategoriaArma, string>;
  if (!ehObjeto(bruto.nomes)) erros.push('Nomes: precisam ser um objeto com as 6 categorias.');
  else {
    const extra = Object.keys(bruto.nomes).filter((k) => !CATEGORIAS_ARMA.some((c) => c.id === k));
    if (extra.length) erros.push(`Categorias desconhecidas nos nomes: ${extra.join(', ')}.`);
    for (const c of CATEGORIAS_ARMA) {
      const n = typeof bruto.nomes[c.id] === 'string' ? (bruto.nomes[c.id] as string).trim() : '';
      if (n.length < 2 || n.length > 60) erros.push(`Nome (${c.nome}): de 2 a 60 caracteres.`);
      else nomes[c.id] = n;
    }
  }

  const receita = validarReceita(bruto.receita, erros);

  if (erros.length) return { ok: false, erros };
  return { ok: true, dados: { formato: FORMATO_DA_ARMA, nomes, raridade: bruto.raridade as RaridadeArma, receita, ativo: bruto.ativo as boolean } };
}

/** Os dados de uma arma do código no formato do banco: ponto de partida para editar. */
export function armaDadosDeBase(a: ArmaBase): ArmaDados {
  return {
    formato: FORMATO_DA_ARMA,
    nomes: { ...a.nomes },
    raridade: a.raridade,
    receita: {
      materiaisMonstro: a.receita.materiaisMonstro.map((i) => ({ ...i })),
      materiaisMundo: a.receita.materiaisMundo.map((i) => ({ ...i })),
      diversos: a.receita.diversos ? { ...a.receita.diversos } : null,
      ouro: a.receita.ouro,
    },
    ativo: true,
  };
}

/** A arma base com os dados publicados por cima (o resto continua do código). */
export function armaComDados(base: ArmaBase, dados: ArmaDados): ArmaBase {
  return { ...base, nomes: { ...dados.nomes }, raridade: dados.raridade, receita: {
      materiaisMonstro: dados.receita.materiaisMonstro.map((i) => ({ ...i })),
      materiaisMundo: dados.receita.materiaisMundo.map((i) => ({ ...i })),
      diversos: dados.receita.diversos ? { ...dados.receita.diversos } : null,
      ouro: dados.receita.ouro,
    },
  };
}
