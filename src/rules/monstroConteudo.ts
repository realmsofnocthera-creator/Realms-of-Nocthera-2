import { ATTRIBUTES, type Attributes } from '@/rules/attributes';
import { CATEGORIAS_CORPORAIS, ehCategoriaCorporal, type CategoriaCorporal, type TipoGolpe } from '@/rules/corposMonstros';
import { ELEMENTOS, type Elemento, type ModificadoresElementais } from '@/rules/elements';
import type { MonsterDefinition } from '@/rules/monsters';
import type { ResultadoValidacao } from '@/rules/mapa';
import type { EfeitoStatus } from '@/rules/statusEffects';

/**
 * Monstro no banco (3.5.2.1 e 3.5.3.1), formato 1: os números e as características do monstro.
 * Se já existe um monstro com o mesmo id no código, os dados publicados SUBSTITUEM esses campos e o resto
 * (habilidades, passivas e mecânicas) continua vindo do código. Se não existe, é um monstro novo.
 * `ativo: false` tira o monstro de uso (exclusão lógica): a luta é recusada com um aviso.
 */
export const FORMATO_DO_MONSTRO = 1;
export const TIPOS_DE_GOLPE: readonly TipoGolpe[] = ['contusao', 'corte', 'perfuracao', 'magico'];
export const EFEITOS_DE_STATUS: readonly EfeitoStatus[] = [
  'sangramento', 'veneno', 'podridaoEscarlate', 'congelamento', 'sono', 'loucura', 'maldicao', 'paralisia', 'queimadura',
];

export const NIVEL_MAXIMO_DO_MONSTRO = 200;
export const LIMITE_DE_VALOR = 10_000_000;
export const LIMITE_DO_MODIFICADOR_ELEMENTAL = { min: -100, max: 500 } as const;

export interface MonstroDados {
  formato: typeof FORMATO_DO_MONSTRO;
  nome: string;
  nivel: number;
  hp: number;
  mitigacao: number;
  chefe: boolean;
  categoriaCorporal: CategoriaCorporal;
  fraquezasProprias: TipoGolpe[];
  resistenciasProprias: TipoGolpe[];
  atributos: Attributes;
  xpConcedido: number;
  ouroConcedido: { min: number; max: number };
  modificadoresElementais: ModificadoresElementais;
  elementoAtaque: Elemento | null;
  efeitosAplicados: EfeitoStatus[];
  imunidadesStatus: EfeitoStatus[];
  enfurecido: boolean;
  ativo: boolean;
}

const CHAVES = [
  'formato', 'nome', 'nivel', 'hp', 'mitigacao', 'chefe', 'categoriaCorporal', 'fraquezasProprias', 'resistenciasProprias',
  'atributos', 'xpConcedido', 'ouroConcedido', 'modificadoresElementais', 'elementoAtaque', 'efeitosAplicados',
  'imunidadesStatus', 'enfurecido', 'ativo',
] as const;

function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function inteiro(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}
function listaDe<T extends string>(v: unknown, permitidos: readonly T[], rotulo: string, erros: string[]): T[] {
  if (!Array.isArray(v)) {
    erros.push(`${rotulo}: precisa ser uma lista.`);
    return [];
  }
  const limpa: T[] = [];
  for (const item of v) {
    if (typeof item !== 'string' || !(permitidos as readonly string[]).includes(item)) erros.push(`${rotulo}: valor inválido (${String(item)}).`);
    else if (!limpa.includes(item as T)) limpa.push(item as T);
  }
  return limpa;
}

/** Confere o monstro inteiro e devolve uma cópia limpa. Campo desconhecido é erro. */
export function validarMonstro(bruto: unknown): ResultadoValidacao<MonstroDados> {
  const erros: string[] = [];
  if (!ehObjeto(bruto)) return { ok: false, erros: ['O monstro precisa ser um objeto.'] };
  const extras = Object.keys(bruto).filter((k) => !(CHAVES as readonly string[]).includes(k));
  if (extras.length) erros.push(`Campos desconhecidos no monstro: ${extras.join(', ')}.`);
  if (bruto.formato !== FORMATO_DO_MONSTRO) erros.push(`Formato do monstro não suportado (esperado ${FORMATO_DO_MONSTRO}).`);

  const nome = typeof bruto.nome === 'string' ? bruto.nome.trim() : '';
  if (nome.length < 2 || nome.length > 60) erros.push('Nome: de 2 a 60 caracteres.');
  if (!inteiro(bruto.nivel, 1, NIVEL_MAXIMO_DO_MONSTRO)) erros.push(`Nível: inteiro de 1 a ${NIVEL_MAXIMO_DO_MONSTRO}.`);
  if (!inteiro(bruto.hp, 1, LIMITE_DE_VALOR)) erros.push(`Vida (HP): inteiro de 1 a ${LIMITE_DE_VALOR.toLocaleString('pt-BR')}.`);
  if (!inteiro(bruto.mitigacao, 0, LIMITE_DE_VALOR)) erros.push('Defesa (mitigação): inteiro de 0 em diante.');
  if (typeof bruto.chefe !== 'boolean') erros.push('Chefe: sim ou não.');
  if (typeof bruto.enfurecido !== 'boolean') erros.push('Enfurecido: sim ou não.');
  if (typeof bruto.ativo !== 'boolean') erros.push('Ativo: sim ou não.');
  if (!ehCategoriaCorporal(bruto.categoriaCorporal)) erros.push(`Categoria corporal inválida (use: ${CATEGORIAS_CORPORAIS.join(', ')}).`);
  if (!inteiro(bruto.xpConcedido, 0, LIMITE_DE_VALOR)) erros.push('XP concedido: inteiro de 0 em diante.');

  const atributos = {} as Attributes;
  if (!ehObjeto(bruto.atributos)) erros.push('Atributos: precisam ser um objeto.');
  else {
    const a = bruto.atributos;
    const extra = Object.keys(a).filter((k) => !(ATTRIBUTES as readonly string[]).includes(k));
    if (extra.length) erros.push(`Atributos desconhecidos: ${extra.join(', ')}.`);
    for (const k of ATTRIBUTES) {
      if (!inteiro(a[k], 0, LIMITE_DE_VALOR)) erros.push(`Atributo ${k}: inteiro de 0 em diante.`);
      else atributos[k] = a[k] as number;
    }
  }

  let ouro = { min: 0, max: 0 };
  if (!ehObjeto(bruto.ouroConcedido) || !inteiro(bruto.ouroConcedido.min, 0, LIMITE_DE_VALOR) || !inteiro(bruto.ouroConcedido.max, 0, LIMITE_DE_VALOR)) {
    erros.push('Ouro concedido: mínimo e máximo inteiros de 0 em diante.');
  } else if (bruto.ouroConcedido.min > bruto.ouroConcedido.max) erros.push('Ouro concedido: o mínimo não pode passar do máximo.');
  else ouro = { min: bruto.ouroConcedido.min, max: bruto.ouroConcedido.max };

  const modificadores: ModificadoresElementais = {};
  if (!ehObjeto(bruto.modificadoresElementais)) erros.push('Modificadores elementais: precisam ser um objeto.');
  else {
    for (const [el, v] of Object.entries(bruto.modificadoresElementais)) {
      if (!(ELEMENTOS as readonly string[]).includes(el)) erros.push(`Elemento desconhecido: ${el}.`);
      else if (!inteiro(v, LIMITE_DO_MODIFICADOR_ELEMENTAL.min, LIMITE_DO_MODIFICADOR_ELEMENTAL.max)) {
        erros.push(`Modificador de ${el}: inteiro de ${LIMITE_DO_MODIFICADOR_ELEMENTAL.min} a ${LIMITE_DO_MODIFICADOR_ELEMENTAL.max}.`);
      } else if (v !== 0) modificadores[el as Elemento] = v as number;
    }
  }

  let elementoAtaque: Elemento | null = null;
  if (bruto.elementoAtaque !== null && bruto.elementoAtaque !== undefined) {
    if (typeof bruto.elementoAtaque !== 'string' || !(ELEMENTOS as readonly string[]).includes(bruto.elementoAtaque)) erros.push('Elemento do ataque inválido.');
    else elementoAtaque = bruto.elementoAtaque as Elemento;
  }

  const fraquezasProprias = listaDe(bruto.fraquezasProprias, TIPOS_DE_GOLPE, 'Fraquezas próprias', erros);
  const resistenciasProprias = listaDe(bruto.resistenciasProprias, TIPOS_DE_GOLPE, 'Resistências próprias', erros);
  const efeitosAplicados = listaDe(bruto.efeitosAplicados, EFEITOS_DE_STATUS, 'Efeitos aplicados', erros);
  const imunidadesStatus = listaDe(bruto.imunidadesStatus, EFEITOS_DE_STATUS, 'Imunidades a status', erros);

  if (erros.length) return { ok: false, erros };
  return {
    ok: true,
    dados: {
      formato: FORMATO_DO_MONSTRO,
      nome,
      nivel: bruto.nivel as number,
      hp: bruto.hp as number,
      mitigacao: bruto.mitigacao as number,
      chefe: bruto.chefe as boolean,
      categoriaCorporal: bruto.categoriaCorporal as CategoriaCorporal,
      fraquezasProprias,
      resistenciasProprias,
      atributos,
      xpConcedido: bruto.xpConcedido as number,
      ouroConcedido: ouro,
      modificadoresElementais: modificadores,
      elementoAtaque,
      efeitosAplicados,
      imunidadesStatus,
      enfurecido: bruto.enfurecido as boolean,
      ativo: bruto.ativo as boolean,
    },
  };
}

/** Os dados de um monstro do código no formato do banco: ponto de partida para editar um monstro existente. */
export function monstroDadosDeDefinicao(m: MonsterDefinition): MonstroDados {
  return {
    formato: FORMATO_DO_MONSTRO,
    nome: m.nome,
    nivel: m.nivel,
    hp: m.hp,
    mitigacao: m.mitigacao ?? 0,
    chefe: m.chefe ?? false,
    categoriaCorporal: m.categoriaCorporal,
    fraquezasProprias: [...(m.fraquezasProprias ?? [])],
    resistenciasProprias: [...(m.resistenciasProprias ?? [])],
    atributos: { ...m.atributos },
    xpConcedido: m.xpConcedido,
    ouroConcedido: { ...m.ouroConcedido },
    modificadoresElementais: { ...(m.modificadoresElementais ?? {}) },
    elementoAtaque: m.elementoAtaque ?? null,
    efeitosAplicados: [...(m.efeitosAplicados ?? [])],
    imunidadesStatus: [...(m.imunidadesStatus ?? [])],
    enfurecido: m.enfurecido ?? false,
    ativo: true,
  };
}

/**
 * O monstro que entra na luta: a definição do código com os dados publicados por cima (habilidades, passivas e
 * mecânica ficam do código) ou, sem base, um monstro novo só com os dados do banco.
 */
export function monstroComDados(id: string, dados: MonstroDados, base?: MonsterDefinition): MonsterDefinition {
  const { formato: _f, ativo: _a, elementoAtaque, ...campos } = dados;
  return {
    ...(base ?? {}),
    id,
    ...campos,
    mitigacao: dados.mitigacao || (base?.mitigacao === undefined ? undefined : 0),
    chefe: dados.chefe || (base?.chefe === undefined ? undefined : false),
    enfurecido: dados.enfurecido || (base?.enfurecido === undefined ? undefined : false),
    ...(elementoAtaque ? { elementoAtaque } : { elementoAtaque: undefined }),
    fraquezasProprias: dados.fraquezasProprias.length ? dados.fraquezasProprias : undefined,
    resistenciasProprias: dados.resistenciasProprias.length ? dados.resistenciasProprias : undefined,
    efeitosAplicados: dados.efeitosAplicados.length ? dados.efeitosAplicados : undefined,
    imunidadesStatus: dados.imunidadesStatus.length ? dados.imunidadesStatus : undefined,
    modificadoresElementais: Object.keys(dados.modificadoresElementais).length ? dados.modificadoresElementais : base?.modificadoresElementais ? {} : undefined,
  } as MonsterDefinition;
}
