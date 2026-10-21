import type { ResultadoValidacao } from '@/rules/mapa';
import { GAME_CONFIG } from '@/rules/config';
import { ID_DE_REFERENCIA, itemExiste, QUANTIDADE_MAXIMA_DE_ITEM } from '@/rules/condicao';

/**
 * Missão (Campanha, 5.5-5): título, descrição, uma lista de objetivos, os requisitos para começar e a recompensa.
 * É conteúdo versionado (rascunho, publicação, histórico e volta atrás), como mapas e cenas. Os textos são do Yuri.
 * A missão começa por um NPC ou por um ativador de cena (campo `missaoId` do objeto) e conclui sozinha quando todos
 * os objetivos estão cumpridos: o jogador recebe a recompensa na hora.
 */
export const FORMATO_DA_MISSAO = 1;
export const TITULO_DA_MISSAO_MAXIMO = 80;
export const DESCRICAO_DA_MISSAO_MAXIMA = 1000;
export const TEXTO_DO_OBJETIVO_MAXIMO = 160;
export const MAXIMO_DE_OBJETIVOS = 10;
export const MAXIMO_DE_ITENS_NA_RECOMPENSA = 5;
export const MAXIMO_DE_REQUISITOS = 5;
export const RECOMPENSA_MAXIMA = 1_000_000;
export const QUANTIDADE_MAXIMA_DE_MONSTROS = 999;
export const ID_DE_OBJETIVO = /^[a-z0-9][a-z0-9-]{0,23}$/;
export const ID_DE_OBJETO_DO_MAPA = /^[a-z0-9][a-z0-9-]{0,31}$/;

export const TIPOS_DE_OBJETIVO = ['falar', 'cena', 'bau', 'derrotar', 'chegar', 'item'] as const;
export type TipoDeObjetivo = (typeof TIPOS_DE_OBJETIVO)[number];

export const NOME_DO_OBJETIVO: Readonly<Record<TipoDeObjetivo, string>> = {
  falar: 'Falar com um NPC',
  cena: 'Ver uma cena',
  bau: 'Abrir um baú',
  derrotar: 'Derrotar monstros',
  chegar: 'Chegar a um mapa',
  item: 'Ter um item na mochila',
};

export interface ObjetivoDaMissao {
  id: string;
  tipo: TipoDeObjetivo;
  /** Texto que o jogador lê; vazio = um texto automático pelo tipo. */
  texto?: string;
  /** falar e bau: o mapa e o objeto (NPC ou baú). chegar: só o mapa. */
  mapa?: string;
  objeto?: string;
  /** cena: o identificador da cena. */
  cenaId?: string;
  /** derrotar: o monstro e quantas vezes (nas lutas da Campanha). */
  monstroId?: string;
  /** derrotar: quantas vezes. item: quantos itens. */
  quantidade?: number;
  /** item: o material. */
  itemId?: string;
}

export interface MissaoDados {
  formato: typeof FORMATO_DA_MISSAO;
  titulo: string;
  descricao: string;
  objetivos: ObjetivoDaMissao[];
  /** Para poder começar: as missões que precisam estar concluídas e o nível mínimo (0 = sem exigência). */
  requisitos: { missoes: string[]; nivelMinimo: number };
  recompensa: { xp: number; ouro: number; itens: { id: string; qtd: number }[] };
}

const CAMPOS_DO_TIPO: Readonly<Record<TipoDeObjetivo, readonly string[]>> = {
  falar: ['mapa', 'objeto'],
  cena: ['cenaId'],
  bau: ['mapa', 'objeto'],
  derrotar: ['monstroId', 'quantidade'],
  chegar: ['mapa'],
  item: ['itemId', 'quantidade'],
};

const eObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const inteiro = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

export function ehTipoDeObjetivo(v: unknown): v is TipoDeObjetivo {
  return typeof v === 'string' && (TIPOS_DE_OBJETIVO as readonly string[]).includes(v);
}

/** O texto que o jogador vê: o escrito pelo Yuri ou um automático pelo tipo. */
export function textoDoObjetivo(o: ObjetivoDaMissao): string {
  if (o.texto) return o.texto;
  switch (o.tipo) {
    case 'falar':
      return 'Falar com o NPC indicado';
    case 'cena':
      return 'Assistir à cena indicada';
    case 'bau':
      return 'Abrir o baú indicado';
    case 'derrotar':
      return `Derrotar ${o.quantidade ?? 1} monstro(s)`;
    case 'chegar':
      return 'Chegar ao lugar indicado';
    case 'item':
      return `Ter ${o.quantidade ?? 1} × ${o.itemId ?? 'item'} na mochila`;
  }
}

/** Quantas vezes o objetivo precisa acontecer (1 para os que acontecem uma vez só). */
export const metaDoObjetivo = (o: ObjetivoDaMissao): number => (o.tipo === 'derrotar' || o.tipo === 'item' ? (o.quantidade ?? 1) : 1);

export function validarMissao(bruto: unknown): ResultadoValidacao<MissaoDados> {
  if (!eObjeto(bruto)) return { ok: false, erros: ['A missão precisa ser um objeto.'] };
  const erros: string[] = [];
  const extras = Object.keys(bruto).filter((k) => !['formato', 'titulo', 'descricao', 'objetivos', 'requisitos', 'recompensa'].includes(k));
  if (extras.length) erros.push(`Campos desconhecidos na missão: ${extras.join(', ')}.`);
  if (bruto.formato !== FORMATO_DA_MISSAO) erros.push(`Formato da missão não suportado (esperado ${FORMATO_DA_MISSAO}).`);
  const titulo = typeof bruto.titulo === 'string' ? bruto.titulo.trim() : '';
  if (titulo.length < 2 || titulo.length > TITULO_DA_MISSAO_MAXIMO) erros.push(`Título: de 2 a ${TITULO_DA_MISSAO_MAXIMO} caracteres.`);
  const descricao = typeof bruto.descricao === 'string' ? bruto.descricao.trim() : null;
  if (descricao === null || descricao.length > DESCRICAO_DA_MISSAO_MAXIMA) erros.push(`Descrição: até ${DESCRICAO_DA_MISSAO_MAXIMA} caracteres.`);

  const objetivos: ObjetivoDaMissao[] = [];
  if (!Array.isArray(bruto.objetivos) || bruto.objetivos.length < 1 || bruto.objetivos.length > MAXIMO_DE_OBJETIVOS) {
    erros.push(`A missão tem de 1 a ${MAXIMO_DE_OBJETIVOS} objetivos.`);
  } else {
    const ids = new Set<string>();
    bruto.objetivos.forEach((o: unknown, i: number) => {
      const rotulo = `Objetivo ${i + 1}`;
      if (!eObjeto(o)) return void erros.push(`${rotulo}: formato inválido.`);
      if (!ehTipoDeObjetivo(o.tipo)) return void erros.push(`${rotulo}: tipo inválido.`);
      const tipo = o.tipo;
      const permitidos = ['id', 'tipo', 'texto', ...CAMPOS_DO_TIPO[tipo]];
      const campoExtra = Object.keys(o).filter((k) => !permitidos.includes(k));
      if (campoExtra.length) erros.push(`${rotulo}: campos que este tipo não tem (${campoExtra.join(', ')}).`);
      const id = typeof o.id === 'string' ? o.id : '';
      if (!ID_DE_OBJETIVO.test(id)) erros.push(`${rotulo}: identificador inválido (minúsculas, números e hífen, até 24).`);
      else if (ids.has(id)) erros.push(`${rotulo}: identificador repetido.`);
      ids.add(id);
      const limpo: ObjetivoDaMissao = { id, tipo };
      if (o.texto !== undefined) {
        const t = typeof o.texto === 'string' ? o.texto.trim() : null;
        if (t === null || t.length > TEXTO_DO_OBJETIVO_MAXIMO) erros.push(`${rotulo}: o texto vai até ${TEXTO_DO_OBJETIVO_MAXIMO} caracteres.`);
        else if (t) limpo.texto = t;
      }
      if (tipo === 'falar' || tipo === 'bau' || tipo === 'chegar') {
        if (typeof o.mapa !== 'string' || !ID_DE_REFERENCIA.test(o.mapa)) erros.push(`${rotulo}: escolha o mapa.`);
        else limpo.mapa = o.mapa;
      }
      if (tipo === 'falar' || tipo === 'bau') {
        if (typeof o.objeto !== 'string' || !ID_DE_OBJETO_DO_MAPA.test(o.objeto)) erros.push(`${rotulo}: escolha o ${tipo === 'falar' ? 'NPC' : 'baú'}.`);
        else limpo.objeto = o.objeto;
      }
      if (tipo === 'cena') {
        if (typeof o.cenaId !== 'string' || !ID_DE_REFERENCIA.test(o.cenaId)) erros.push(`${rotulo}: escolha a cena.`);
        else limpo.cenaId = o.cenaId;
      }
      if (tipo === 'derrotar') {
        if (typeof o.monstroId !== 'string' || !ID_DE_REFERENCIA.test(o.monstroId)) erros.push(`${rotulo}: escolha o monstro.`);
        else limpo.monstroId = o.monstroId;
        if (!inteiro(o.quantidade, 1, QUANTIDADE_MAXIMA_DE_MONSTROS)) erros.push(`${rotulo}: quantos monstros, de 1 a ${QUANTIDADE_MAXIMA_DE_MONSTROS}.`);
        else limpo.quantidade = o.quantidade;
      }
      if (tipo === 'item') {
        if (typeof o.itemId !== 'string' || !itemExiste(o.itemId)) erros.push(`${rotulo}: item desconhecido.`);
        else limpo.itemId = o.itemId;
        if (!inteiro(o.quantidade, 1, QUANTIDADE_MAXIMA_DE_ITEM)) erros.push(`${rotulo}: a quantidade vai de 1 a ${QUANTIDADE_MAXIMA_DE_ITEM}.`);
        else limpo.quantidade = o.quantidade;
      }
      objetivos.push(limpo);
    });
  }

  let requisitos: MissaoDados['requisitos'] = { missoes: [], nivelMinimo: 0 };
  if (!eObjeto(bruto.requisitos)) {
    erros.push('Faltam os requisitos da missão.');
  } else {
    const extraReq = Object.keys(bruto.requisitos).filter((k) => !['missoes', 'nivelMinimo'].includes(k));
    if (extraReq.length) erros.push(`Requisitos: campos desconhecidos (${extraReq.join(', ')}).`);
    const missoes = bruto.requisitos.missoes;
    if (!Array.isArray(missoes) || missoes.length > MAXIMO_DE_REQUISITOS || missoes.some((m: unknown) => typeof m !== 'string' || !ID_DE_REFERENCIA.test(m)) || new Set(missoes).size !== missoes.length) {
      erros.push(`Requisitos: até ${MAXIMO_DE_REQUISITOS} missões, sem repetir.`);
    }
    if (!inteiro(bruto.requisitos.nivelMinimo, 0, GAME_CONFIG.NIVEL_MAXIMO_GRAU_1)) erros.push(`Requisitos: o nível mínimo vai de 0 (sem exigência) a ${GAME_CONFIG.NIVEL_MAXIMO_GRAU_1}.`);
    if (Array.isArray(missoes) && inteiro(bruto.requisitos.nivelMinimo, 0, GAME_CONFIG.NIVEL_MAXIMO_GRAU_1)) {
      requisitos = { missoes: [...(missoes as string[])], nivelMinimo: bruto.requisitos.nivelMinimo };
    }
  }

  let recompensa: MissaoDados['recompensa'] = { xp: 0, ouro: 0, itens: [] };
  if (!eObjeto(bruto.recompensa)) {
    erros.push('Falta a recompensa da missão (pode ser tudo zero).');
  } else {
    const r = bruto.recompensa;
    const extraRec = Object.keys(r).filter((k) => !['xp', 'ouro', 'itens'].includes(k));
    if (extraRec.length) erros.push(`Recompensa: campos desconhecidos (${extraRec.join(', ')}).`);
    if (!inteiro(r.xp, 0, RECOMPENSA_MAXIMA)) erros.push(`Recompensa: o XP vai de 0 a ${RECOMPENSA_MAXIMA}.`);
    if (!inteiro(r.ouro, 0, RECOMPENSA_MAXIMA)) erros.push(`Recompensa: o ouro vai de 0 a ${RECOMPENSA_MAXIMA}.`);
    const itens: { id: string; qtd: number }[] = [];
    if (!Array.isArray(r.itens) || r.itens.length > MAXIMO_DE_ITENS_NA_RECOMPENSA) {
      erros.push(`Recompensa: até ${MAXIMO_DE_ITENS_NA_RECOMPENSA} itens.`);
    } else {
      const vistos = new Set<string>();
      r.itens.forEach((it: unknown, i: number) => {
        if (!eObjeto(it) || typeof it.id !== 'string' || !itemExiste(it.id)) return void erros.push(`Recompensa, item ${i + 1}: item desconhecido.`);
        if (!inteiro(it.qtd, 1, QUANTIDADE_MAXIMA_DE_ITEM)) return void erros.push(`Recompensa, item ${i + 1}: a quantidade vai de 1 a ${QUANTIDADE_MAXIMA_DE_ITEM}.`);
        if (vistos.has(it.id)) return void erros.push(`Recompensa, item ${i + 1}: item repetido.`);
        vistos.add(it.id);
        itens.push({ id: it.id, qtd: it.qtd });
      });
    }
    if (inteiro(r.xp, 0, RECOMPENSA_MAXIMA) && inteiro(r.ouro, 0, RECOMPENSA_MAXIMA)) recompensa = { xp: r.xp, ouro: r.ouro, itens };
  }

  if (erros.length) return { ok: false, erros };
  return { ok: true, dados: { formato: FORMATO_DA_MISSAO, titulo, descricao: descricao ?? '', objetivos, requisitos, recompensa } };
}

/** Rascunho novo: um objetivo de derrotar um monstro, para o Yuri trocar pelo que quiser. */
export function missaoEmBranco(titulo = ''): MissaoDados {
  return {
    formato: FORMATO_DA_MISSAO,
    titulo,
    descricao: '',
    objetivos: [{ id: 'objetivo-1', tipo: 'derrotar', monstroId: 'rato-da-floresta', quantidade: 1 }],
    requisitos: { missoes: [], nivelMinimo: 0 },
    recompensa: { xp: 0, ouro: 0, itens: [] },
  };
}
