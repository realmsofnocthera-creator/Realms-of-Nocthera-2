/**
 * Troca entre jogadores (7.2, decidido pelo Yuri em 24 e 25/10/2026). O vendedor põe um item, um lote de material ou
 * uma quantidade de um recurso à venda, por ouro OU por Diamantes (ele escolhe o preço e a moeda). Quem compra leva o
 * anúncio inteiro e o dinheiro vai na hora para o vendedor. Sem taxa. Nível 10 para vender e comprar.
 *
 * Não podem ser vendidos: colecionáveis, ouro, Diamantes, Essência de Soberano e itens equipados.
 */

export const NIVEL_DO_MERCADO = 10;
export const ANUNCIOS_ATIVOS_MAXIMOS = 20;
export const DIAS_DO_ANUNCIO = 7;
export const DURACAO_DO_ANUNCIO_MS = DIAS_DO_ANUNCIO * 24 * 60 * 60 * 1000;
/** Só um limite técnico (o Yuri não quis preço máximo contra abuso). */
export const PRECO_MAXIMO = 1_000_000_000;
export const ANUNCIOS_POR_PAGINA = 30;

export const MOEDAS_DO_MERCADO = ['ouro', 'diamantes'] as const;
export type MoedaDoMercado = (typeof MOEDAS_DO_MERCADO)[number];

export const CATEGORIAS_DO_MERCADO = ['material', 'carta', 'emblema', 'arma', 'armadura', 'recurso'] as const;
export type CategoriaDoMercado = (typeof CATEGORIAS_DO_MERCADO)[number];

export const NOME_DA_CATEGORIA: Readonly<Record<CategoriaDoMercado, string>> = {
  material: 'Materiais',
  carta: 'Cartas da Alma',
  emblema: 'Emblemas',
  arma: 'Armas',
  armadura: 'Armaduras',
  recurso: 'Recursos',
};

export const RARIDADES_DO_MERCADO = ['comum', 'raro', 'muitoRaro', 'epico', 'lendario', 'mitico'] as const;
export type RaridadeDoMercado = (typeof RARIDADES_DO_MERCADO)[number];

/**
 * Recursos que podem ser vendidos em quantidade: selos de busca, os saldos da Expedição e dos colecionáveis e os
 * fragmentos e essências de progressão. `fragmentosSubclasse:<id>` é o de uma subclasse.
 */
export const RECURSOS_DO_MERCADO = [
  'selo:desgastado',
  'selo:encantado',
  'selo:eternidade',
  'selo:origem',
  'avancosDeExpedicao',
  'fragmentosDeMemoria',
  'pedrasDaRecordacao',
  'fragmentosAlma',
  'essenciaHabilidade',
  'fragmentosAscensao',
  'cacosDeAlma',
  'poeiraDeAlma',
] as const;
export type RecursoFixo = (typeof RECURSOS_DO_MERCADO)[number];

export const NOME_DO_RECURSO: Readonly<Record<RecursoFixo, string>> = {
  'selo:desgastado': 'Selo Desgastado',
  'selo:encantado': 'Selo Encantado',
  'selo:eternidade': 'Selo da Eternidade',
  'selo:origem': 'Selo da Origem',
  avancosDeExpedicao: 'Avanço de expedição',
  fragmentosDeMemoria: 'Fragmento de Memória',
  pedrasDaRecordacao: 'Pedra da Recordação',
  fragmentosAlma: 'Fragmento de alma',
  essenciaHabilidade: 'Essência de habilidade',
  fragmentosAscensao: 'Fragmento de ascensão',
  cacosDeAlma: 'Caco de alma',
  poeiraDeAlma: 'Poeira de alma',
};

/** Raridade de cada recurso, para o filtro (os selos seguem a raridade do selo). */
export const RARIDADE_DO_RECURSO: Readonly<Record<RecursoFixo, RaridadeDoMercado>> = {
  'selo:desgastado': 'comum',
  'selo:encantado': 'muitoRaro',
  'selo:eternidade': 'lendario',
  'selo:origem': 'mitico',
  avancosDeExpedicao: 'raro',
  fragmentosDeMemoria: 'raro',
  pedrasDaRecordacao: 'epico',
  fragmentosAlma: 'raro',
  essenciaHabilidade: 'raro',
  fragmentosAscensao: 'epico',
  cacosDeAlma: 'comum',
  poeiraDeAlma: 'raro',
};

export const ehRecursoFixo = (v: unknown): v is RecursoFixo => typeof v === 'string' && (RECURSOS_DO_MERCADO as readonly string[]).includes(v);
export const ehRecursoDeSubclasse = (v: unknown): v is `fragmentosSubclasse:${string}` => typeof v === 'string' && /^fragmentosSubclasse:[a-z0-9-]{1,40}$/.test(v);

/** O que vai no anúncio: o próprio item (fica guardado com o anúncio até a venda) ou a quantidade de um material/recurso. */
export type ItemDoAnuncio =
  | { tipo: 'material'; id: string; quantidade: number }
  | { tipo: 'recurso'; id: string; quantidade: number }
  | { tipo: 'carta'; carta: { id: string; tipo: string; efeitos: unknown[]; despertar: number } }
  | { tipo: 'emblema'; emblema: { id: string; tipo: string; estrelas: number } }
  | { tipo: 'arma'; arma: Record<string, unknown> & { id: string; baseId: string } }
  | { tipo: 'armadura'; armadura: Record<string, unknown> & { id: string; pecaId: string } };

/** mercado/{id}: um anúncio ativo (vendido, cancelado ou devolvido, o documento é apagado). */
export interface AnuncioDoMercado {
  id: string;
  vendedorUid: string;
  vendedorNome: string;
  item: ItemDoAnuncio;
  categoria: CategoriaDoMercado;
  raridade: RaridadeDoMercado;
  /** O nome do item, para a tela e a busca. */
  nome: string;
  /** Uma linha de detalhe (atributo da arma, estrelas do emblema...). */
  detalhe: string;
  quantidade: number;
  moeda: MoedaDoMercado;
  preco: number;
  criadoEm: string;
  expiraEm: string;
}

export const anuncioExpirado = (a: Pick<AnuncioDoMercado, 'expiraEm'>, agora: Date) => Date.parse(a.expiraEm) <= agora.getTime();

export function precoValido(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= PRECO_MAXIMO;
}

export function ehMoedaDoMercado(v: unknown): v is MoedaDoMercado {
  return typeof v === 'string' && (MOEDAS_DO_MERCADO as readonly string[]).includes(v);
}

export const chaveDeBuscaDoMercado = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** O preço de uma unidade, para comparar vendas do mesmo item (sinal de preço fora do normal na fila de revisão). */
export const precoPorUnidade = (a: Pick<AnuncioDoMercado, 'preco' | 'quantidade'>) => a.preco / Math.max(1, a.quantidade);

/** Quantas vendas guardar por item para saber o preço normal, e a partir de quantas comparar. */
export const VENDAS_GUARDADAS_POR_ITEM = 20;
export const VENDAS_PARA_COMPARAR = 5;
/** Preço 10× acima ou abaixo da mediana das últimas vendas do mesmo item: sinal na fila de revisão. */
export const MULTIPLO_DE_PRECO_ATIPICO = 10;
/** Compras do mesmo vendedor em 24 horas a partir das quais a fila de revisão é avisada. */
export const COMPRAS_DO_MESMO_VENDEDOR = 5;

export function mediana(valores: readonly number[]): number {
  if (!valores.length) return 0;
  const v = [...valores].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** A venda foi por um preço muito fora do normal desse item? */
export function precoAtipico(unidade: number, anteriores: readonly number[]): boolean {
  if (anteriores.length < VENDAS_PARA_COMPARAR) return false;
  const m = mediana(anteriores);
  return m > 0 && (unidade >= m * MULTIPLO_DE_PRECO_ATIPICO || unidade <= m / MULTIPLO_DE_PRECO_ATIPICO);
}

/** Leitura tolerante do banco. */
export function anuncioDoDocumento(id: string, bruto: unknown): AnuncioDoMercado | null {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
  const o = bruto as Record<string, unknown>;
  const item = o.item as ItemDoAnuncio | undefined;
  if (typeof o.vendedorUid !== 'string' || !item || typeof item !== 'object' || typeof item.tipo !== 'string') return null;
  if (!(CATEGORIAS_DO_MERCADO as readonly string[]).includes(String(o.categoria)) || !ehMoedaDoMercado(o.moeda) || !precoValido(o.preco)) return null;
  const texto = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    id,
    vendedorUid: o.vendedorUid,
    vendedorNome: texto(o.vendedorNome),
    item,
    categoria: o.categoria as CategoriaDoMercado,
    raridade: (RARIDADES_DO_MERCADO as readonly string[]).includes(String(o.raridade)) ? (o.raridade as RaridadeDoMercado) : 'comum',
    nome: texto(o.nome),
    detalhe: texto(o.detalhe),
    quantidade: typeof o.quantidade === 'number' && o.quantidade > 0 ? Math.floor(o.quantidade) : 1,
    moeda: o.moeda,
    preco: o.preco,
    criadoEm: texto(o.criadoEm),
    expiraEm: texto(o.expiraEm),
  };
}
