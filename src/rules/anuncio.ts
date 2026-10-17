import type { ResultadoValidacao } from '@/rules/mapa';

/**
 * Anúncio do Menu (3.5.3.4), formato 1: um aviso com texto, tipo e janela de exibição opcional (início e fim).
 * Cada anúncio é um item de conteúdo (rascunho → publicado, histórico e volta atrás). O jogo mostra os publicados
 * que estão "vigentes" agora: ativos, já começados e ainda não terminados. Um evento agendado é um anúncio do tipo
 * "evento" com início e fim; ele só avisa, não muda regras do jogo (isso vem com as Etapas 6 e 8).
 */
export const FORMATO_DO_ANUNCIO = 1;
export const TIPOS_DE_ANUNCIO = ['novidade', 'aviso', 'manutencao', 'evento'] as const;
export type TipoDeAnuncio = (typeof TIPOS_DE_ANUNCIO)[number];

export const NOME_DO_TIPO_DE_ANUNCIO: Readonly<Record<TipoDeAnuncio, string>> = {
  novidade: 'Novidade',
  aviso: 'Aviso',
  manutencao: 'Manutenção',
  evento: 'Evento',
};

export const TITULO_MAXIMO = 80;
export const TEXTO_MAXIMO = 1200;
/** Quantos anúncios o Menu mostra de uma vez. */
export const MAXIMO_DE_ANUNCIOS_NO_MENU = 20;

export interface AnuncioDados {
  formato: typeof FORMATO_DO_ANUNCIO;
  titulo: string;
  texto: string;
  tipo: TipoDeAnuncio;
  /** Instante (ISO 8601, UTC) em que passa a aparecer; null = já. */
  inicio: string | null;
  /** Instante (ISO 8601, UTC) em que deixa de aparecer; null = sem fim. */
  fim: string | null;
  ativo: boolean;
}

const CHAVES = ['formato', 'titulo', 'texto', 'tipo', 'inicio', 'fim', 'ativo'] as const;

function instante(v: unknown, rotulo: string, erros: string[]): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) {
    erros.push(`${rotulo}: data e hora inválidas.`);
    return null;
  }
  return new Date(v).toISOString();
}

export function validarAnuncio(bruto: unknown): ResultadoValidacao<AnuncioDados> {
  const erros: string[] = [];
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return { ok: false, erros: ['O anúncio precisa ser um objeto.'] };
  const b = bruto as Record<string, unknown>;
  const extras = Object.keys(b).filter((k) => !(CHAVES as readonly string[]).includes(k));
  if (extras.length) erros.push(`Campos desconhecidos no anúncio: ${extras.join(', ')}.`);
  if (b.formato !== FORMATO_DO_ANUNCIO) erros.push(`Formato do anúncio não suportado (esperado ${FORMATO_DO_ANUNCIO}).`);
  const titulo = typeof b.titulo === 'string' ? b.titulo.trim() : '';
  if (titulo.length < 2 || titulo.length > TITULO_MAXIMO) erros.push(`Título: de 2 a ${TITULO_MAXIMO} caracteres.`);
  const texto = typeof b.texto === 'string' ? b.texto.trim() : '';
  if (texto.length < 2 || texto.length > TEXTO_MAXIMO) erros.push(`Texto: de 2 a ${TEXTO_MAXIMO} caracteres.`);
  if (typeof b.tipo !== 'string' || !(TIPOS_DE_ANUNCIO as readonly string[]).includes(b.tipo)) erros.push('Tipo inválido (novidade, aviso, manutenção ou evento).');
  if (typeof b.ativo !== 'boolean') erros.push('Ativo: sim ou não.');
  const inicio = instante(b.inicio, 'Início', erros);
  const fim = instante(b.fim, 'Fim', erros);
  if (inicio && fim && Date.parse(fim) <= Date.parse(inicio)) erros.push('O fim precisa ser depois do início.');
  if (erros.length) return { ok: false, erros };
  return { ok: true, dados: { formato: FORMATO_DO_ANUNCIO, titulo, texto, tipo: b.tipo as TipoDeAnuncio, inicio, fim, ativo: b.ativo as boolean } };
}

export const TEXTO_PROVISORIO = 'Escreva o texto do anúncio.';

/** Rascunho novo: o texto provisório satisfaz o schema e o anúncio nasce desativado, para não ir ao ar sem querer. */
export function anuncioEmBranco(titulo = ''): AnuncioDados {
  return { formato: FORMATO_DO_ANUNCIO, titulo, texto: TEXTO_PROVISORIO, tipo: 'novidade', inicio: null, fim: null, ativo: false };
}

/** O anúncio aparece agora: ativo, já começou e ainda não terminou. */
export function anuncioVigente(a: Pick<AnuncioDados, 'ativo' | 'inicio' | 'fim'>, agora: Date): boolean {
  if (!a.ativo) return false;
  const t = agora.getTime();
  if (a.inicio !== null && Date.parse(a.inicio) > t) return false;
  if (a.fim !== null && Date.parse(a.fim) <= t) return false;
  return true;
}

/** Os vigentes, o que começou por último primeiro (sem início conta como o mais antigo), até o limite do Menu. */
export function anunciosVigentes<T extends { dados: AnuncioDados }>(lista: readonly T[], agora: Date): T[] {
  return lista
    .filter((i) => anuncioVigente(i.dados, agora))
    .sort((a, b) => (b.dados.inicio ? Date.parse(b.dados.inicio) : 0) - (a.dados.inicio ? Date.parse(a.dados.inicio) : 0))
    .slice(0, MAXIMO_DE_ANUNCIOS_NO_MENU);
}
