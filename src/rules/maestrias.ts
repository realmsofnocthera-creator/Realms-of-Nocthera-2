import { CATEGORIAS_ARMA, type CategoriaArma } from './armas';

/**
 * Maestrias (decididas pelo Yuri em 23/10/2026; conceito do roadmap: 100 níveis por trilha, marcos a cada 10). Cada
 * trilha sobe com XP de maestria ganho jogando; cada nível dá um bônus pequeno e cada marco (10, 20 … 100) um bônus
 * maior. Trilhas: as 6 categorias de arma, Chefes, Forja, Expedição e as 13 classificações de monstro do bestiário
 * (estas só valem quando os monstros forem classificados). Para levar de 2 a 3 meses (Yuri), cada trilha tem um teto
 * de XP por dia. Os números são proposta, aprovada pelo Yuri em 23/10/2026.
 */

export const NIVEL_MAXIMO_DA_MAESTRIA = 100;
export const MARCO_A_CADA = 10;
/** XP de maestria por trilha por dia (Brasília): o nível 100 leva no mínimo ~77 dias. */
export const TETO_DIARIO_DE_XP = 350;

/** XP para ir do nível n ao n + 1: 20 + 5 × n. */
export const xpParaSubir = (nivel: number) => 20 + 5 * nivel;
/** XP total para chegar ao nível 100. */
export const XP_TOTAL = Array.from({ length: NIVEL_MAXIMO_DA_MAESTRIA }, (_, n) => xpParaSubir(n)).reduce((a, b) => a + b, 0);

/** O nível e o progresso a partir do XP acumulado da trilha. */
export function nivelDaMaestria(xp: number): { nivel: number; xpNoNivel: number; xpParaProximo: number | null } {
  let resto = Math.max(0, Math.floor(xp));
  let nivel = 0;
  while (nivel < NIVEL_MAXIMO_DA_MAESTRIA && resto >= xpParaSubir(nivel)) {
    resto -= xpParaSubir(nivel);
    nivel++;
  }
  return { nivel, xpNoNivel: nivel >= NIVEL_MAXIMO_DA_MAESTRIA ? 0 : resto, xpParaProximo: nivel >= NIVEL_MAXIMO_DA_MAESTRIA ? null : xpParaSubir(nivel) };
}

/** Número com vírgula (pt-BR), até uma casa. */
const pct = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export const marcosAlcancados = (nivel: number) => Math.floor(Math.min(NIVEL_MAXIMO_DA_MAESTRIA, nivel) / MARCO_A_CADA);

// ---------------------------------------------------------------------------------------------------------------
// As trilhas
// ---------------------------------------------------------------------------------------------------------------

/** As 13 classificações de monstro do bestiário (Yuri, 23/10/2026). */
export const CLASSIFICACOES_DE_MONSTRO = [
  { id: 'necrofagos', nome: 'Necrófagos', descricao: 'Criaturas que se alimentam de cadáveres, frequentemente encontradas em cemitérios e campos de batalha.' },
  { id: 'espectros', nome: 'Espectros', descricao: 'Almas penadas presas ao mundo dos vivos devido a mortes trágicas ou emoções intensas.' },
  { id: 'feras', nome: 'Feras', descricao: 'Animais comuns ou selvagens, tanto naturais quanto alterados.' },
  { id: 'amaldicoados', nome: 'Amaldiçoados', descricao: 'Seres que sofreram algum feitiço ou maldição que os transformou em bestas.' },
  { id: 'hibridos', nome: 'Híbridos', descricao: 'Criaturas que misturam características de animais e humanos ou de diferentes espécies.' },
  { id: 'insectoides', nome: 'Insectóides', descricao: 'Seres de grande porte baseados em insetos, aracnídeos ou crustáceos.' },
  { id: 'elementais', nome: 'Elementais', descricao: 'Seres criados ou compostos por elementos primários da natureza ou magia.' },
  { id: 'relictos', nome: 'Relictos', descricao: 'Criaturas mágicas antigas, espíritos da floresta ou seres raros de lendas e folclore.' },
  { id: 'ogroides', nome: 'Ogróides', descricao: 'Seres humanoides de grande porte, rústicos ou selvagens.' },
  { id: 'draconideos', nome: 'Draconídeos', descricao: 'Criaturas reptilianas com características dracônicas, incluindo espécies aladas, escamosas e serpentiformes.' },
  { id: 'vampiros', nome: 'Vampiros', descricao: 'Criaturas sugadoras de sangue, desde espécies menores até entidades vampíricas extremamente poderosas.' },
  { id: 'leviatas', nome: 'Leviatãs', descricao: 'Criaturas de grande porte adaptadas a ambientes aquáticos ou semiaquáticos, encontradas em oceanos, rios, lagos e pântanos.' },
  { id: 'primordiais', nome: 'Primordiais', descricao: 'Criaturas ancestrais de poder extraordinário, capazes de alterar o ambiente, influenciar fenômenos naturais ou concentrar forças mágicas excepcionais.' },
] as const;
export type ClassificacaoDeMonstro = (typeof CLASSIFICACOES_DE_MONSTRO)[number]['id'];

export type GrupoDeMaestria = 'armas' | 'chefes' | 'forja' | 'expedicao' | 'monstros';

export interface TrilhaDeMaestria {
  /** "arma:katana", "chefes", "forja", "expedicao", "monstro:feras"… */
  id: string;
  nome: string;
  grupo: GrupoDeMaestria;
  /** Ainda não sobe nem dá bônus (as trilhas de monstro, até o bestiário ser classificado). */
  bloqueada?: boolean;
  comoSobe: string;
  porNivel: string;
  porMarco: string;
}

const trilhaDeArma = (categoria: CategoriaArma, nome: string): TrilhaDeMaestria => ({
  id: `arma:${categoria}`,
  nome,
  grupo: 'armas',
  comoSobe: `${XP_POR_VITORIA_COM_ARMA} XP por vitória com uma arma desta categoria equipada (${XP_POR_VITORIA_COM_ARMA_CONTRA_CHEFE} contra chefe).`,
  porNivel: `+${pct(DANO_DA_ARMA_POR_NIVEL)}% de dano com esta categoria.`,
  porMarco: `+${CRITICO_DA_ARMA_POR_MARCO}% de chance de crítico com esta categoria.`,
});

export const XP_POR_VITORIA_COM_ARMA = 10;
export const XP_POR_VITORIA_COM_ARMA_CONTRA_CHEFE = 30;
export const XP_POR_VITORIA_CONTRA_CHEFE = 25;
export const XP_POR_ESTRELA_AO_FABRICAR = 15;
export const XP_POR_ESTRELA_AO_REFORJAR = 5;
export const XP_POR_ORBE = 2;
export const XP_POR_HORA_DE_EXPEDICAO = 5;

export const DANO_DA_ARMA_POR_NIVEL = 0.2;
export const CRITICO_DA_ARMA_POR_MARCO = 1;
export const DANO_CONTRA_CHEFES_POR_NIVEL = 0.2;
export const REDUCAO_DE_CHEFES_POR_MARCO = 1;
export const DESCONTO_DE_OURO_DA_FORJA_POR_NIVEL = 0.2;
export const DESCONTO_DE_MATERIAIS_DA_FORJA_POR_MARCO = 1;
export const TEMPO_DA_EXPEDICAO_POR_NIVEL = 0.2;
export const MATERIAIS_DA_EXPEDICAO_POR_MARCO = 1;
/** Marcos da Expedição que dão +1 vaga. */
export const MARCOS_COM_VAGA_DE_EXPEDICAO = [50, 100] as const;

export const TRILHAS_DE_MAESTRIA: readonly TrilhaDeMaestria[] = [
  ...CATEGORIAS_ARMA.map((c) => trilhaDeArma(c.id, c.nome)),
  {
    id: 'chefes',
    nome: 'Chefes',
    grupo: 'chefes',
    comoSobe: `${XP_POR_VITORIA_CONTRA_CHEFE} XP por vitória contra qualquer chefe.`,
    porNivel: `+${pct(DANO_CONTRA_CHEFES_POR_NIVEL)}% de dano contra chefes.`,
    porMarco: `−${REDUCAO_DE_CHEFES_POR_MARCO}% do dano recebido de chefes.`,
  },
  {
    id: 'forja',
    nome: 'Forja',
    grupo: 'forja',
    comoSobe: `Fabricar: ${XP_POR_ESTRELA_AO_FABRICAR} XP por estrela do item; reforjar: ${XP_POR_ESTRELA_AO_REFORJAR} por estrela; orbes de armadura: ${XP_POR_ORBE} por orbe.`,
    porNivel: `−${pct(DESCONTO_DE_OURO_DA_FORJA_POR_NIVEL)}% do ouro gasto na forja.`,
    porMarco: `−${DESCONTO_DE_MATERIAIS_DA_FORJA_POR_MARCO}% dos materiais da receita (devolvidos à mochila).`,
  },
  {
    id: 'expedicao',
    nome: 'Expedição',
    grupo: 'expedicao',
    comoSobe: `${XP_POR_HORA_DE_EXPEDICAO} XP por hora de expedição coletada.`,
    porNivel: `−${pct(TEMPO_DA_EXPEDICAO_POR_NIVEL)}% no tempo das expedições.`,
    porMarco: `+${MATERIAIS_DA_EXPEDICAO_POR_MARCO} material de mundo comum por expedição; nos marcos 50 e 100, +1 vaga.`,
  },
  ...CLASSIFICACOES_DE_MONSTRO.map(
    (m): TrilhaDeMaestria => ({
      id: `monstro:${m.id}`,
      nome: m.nome,
      grupo: 'monstros',
      bloqueada: true,
      comoSobe: 'Vitórias contra monstros desta classificação (quando o bestiário for classificado).',
      porNivel: '+0,2% de dano contra esta classificação.',
      porMarco: '−1% do dano recebido desta classificação.',
    })
  ),
];

export const TRILHA_MAP: Readonly<Record<string, TrilhaDeMaestria>> = Object.fromEntries(TRILHAS_DE_MAESTRIA.map((t) => [t.id, t]));
export const NOME_DO_GRUPO_DE_MAESTRIA: Readonly<Record<GrupoDeMaestria, string>> = {
  armas: 'Armas',
  chefes: 'Chefes',
  forja: 'Forja',
  expedicao: 'Expedição',
  monstros: 'Monstros',
};

// ---------------------------------------------------------------------------------------------------------------
// O que fica no personagem
// ---------------------------------------------------------------------------------------------------------------

/** XP acumulado de cada trilha e o XP ganho no dia (para o teto diário). */
export interface ProgressoDaMaestria {
  xp: number;
  /** Dia (Brasília) a que `hoje` se refere. */
  dia?: string;
  hoje?: number;
}
export type MaestriasDoJogador = Record<string, ProgressoDaMaestria>;

const inteiroPositivo = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export function maestriasDoDocumento(bruto: unknown): MaestriasDoJogador | undefined {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return undefined;
  const saida: MaestriasDoJogador = {};
  for (const [id, v] of Object.entries(bruto as Record<string, unknown>)) {
    const t = TRILHA_MAP[id];
    if (!t || t.bloqueada || !v || typeof v !== 'object') continue;
    const o = v as Record<string, unknown>;
    const xp = Math.min(XP_TOTAL, inteiroPositivo(o.xp));
    if (!xp) continue;
    saida[id] = { xp, ...(typeof o.dia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.dia) ? { dia: o.dia, hoje: Math.min(TETO_DIARIO_DE_XP, inteiroPositivo(o.hoje)) } : {}) };
  }
  return Object.keys(saida).length ? saida : undefined;
}

export const nivelDaTrilha = (maestrias: MaestriasDoJogador | undefined, id: string) => nivelDaMaestria(maestrias?.[id]?.xp ?? 0).nivel;

/** XP que ainda cabe hoje na trilha. */
export function xpRestanteHoje(p: ProgressoDaMaestria | undefined, dia: string): number {
  const hoje = p?.dia === dia ? (p.hoje ?? 0) : 0;
  return Math.max(0, TETO_DIARIO_DE_XP - hoje);
}

/**
 * Soma XP às trilhas, respeitando o teto do dia e o máximo do nível 100. Trilhas bloqueadas ou desconhecidas não
 * ganham. Devolve as maestrias novas (ou null se nada mudou).
 */
export function ganharXpDeMaestria(maestrias: MaestriasDoJogador | undefined, ganhos: Readonly<Record<string, number>>, dia: string): MaestriasDoJogador | null {
  let mudou = false;
  const novas: MaestriasDoJogador = { ...(maestrias ?? {}) };
  for (const [id, bruto] of Object.entries(ganhos)) {
    const t = TRILHA_MAP[id];
    const xp = Math.floor(bruto);
    if (!t || t.bloqueada || xp <= 0) continue;
    const atual = novas[id] ?? { xp: 0 };
    const ganho = Math.min(xp, xpRestanteHoje(atual, dia), XP_TOTAL - atual.xp);
    if (ganho <= 0) continue;
    const hoje = (atual.dia === dia ? (atual.hoje ?? 0) : 0) + ganho;
    novas[id] = { xp: atual.xp + ganho, dia, hoje };
    mudou = true;
  }
  return mudou ? novas : null;
}

// ---------------------------------------------------------------------------------------------------------------
// Os bônus
// ---------------------------------------------------------------------------------------------------------------

/** Arredonda em décimos (evita 0,6000000001). */
const decimo = (n: number) => Math.round(n * 10) / 10;

/** Bônus da maestria da arma equipada: % de dano e pontos % de crítico. */
export function bonusDaMaestriaDeArma(maestrias: MaestriasDoJogador | undefined, categoria: CategoriaArma | undefined) {
  if (!categoria) return { danoPercentual: 0, criticoPontos: 0 };
  const nivel = nivelDaTrilha(maestrias, `arma:${categoria}`);
  return { danoPercentual: decimo(nivel * DANO_DA_ARMA_POR_NIVEL), criticoPontos: marcosAlcancados(nivel) * CRITICO_DA_ARMA_POR_MARCO };
}

export function bonusDaMaestriaDeChefes(maestrias: MaestriasDoJogador | undefined) {
  const nivel = nivelDaTrilha(maestrias, 'chefes');
  return { danoPercentual: decimo(nivel * DANO_CONTRA_CHEFES_POR_NIVEL), reducaoPercentual: marcosAlcancados(nivel) * REDUCAO_DE_CHEFES_POR_MARCO };
}

export function bonusDaMaestriaDeForja(maestrias: MaestriasDoJogador | undefined) {
  const nivel = nivelDaTrilha(maestrias, 'forja');
  return { descontoOuroPercentual: decimo(nivel * DESCONTO_DE_OURO_DA_FORJA_POR_NIVEL), descontoMateriaisPercentual: marcosAlcancados(nivel) * DESCONTO_DE_MATERIAIS_DA_FORJA_POR_MARCO };
}

export function bonusDaMaestriaDeExpedicao(maestrias: MaestriasDoJogador | undefined) {
  const nivel = nivelDaTrilha(maestrias, 'expedicao');
  return {
    reducaoDeTempoPercentual: decimo(nivel * TEMPO_DA_EXPEDICAO_POR_NIVEL),
    materiaisExtras: marcosAlcancados(nivel) * MATERIAIS_DA_EXPEDICAO_POR_MARCO,
    vagasExtras: MARCOS_COM_VAGA_DE_EXPEDICAO.filter((m) => nivel >= m).length,
  };
}

/** XP de Forja ao fabricar, reforjar ou usar orbes. */
export const xpDeForjaAoFabricar = (estrela: number) => Math.max(1, Math.floor(estrela)) * XP_POR_ESTRELA_AO_FABRICAR;
export const xpDeForjaAoReforjar = (estrela: number) => Math.max(1, Math.floor(estrela)) * XP_POR_ESTRELA_AO_REFORJAR;

/** XP de maestria de uma lista de vitórias (true = contra chefe): a trilha da arma equipada e a de Chefes. */
export function xpDasVitorias(categoria: CategoriaArma | undefined, vitorias: readonly boolean[]): Record<string, number> {
  const ganhos: Record<string, number> = {};
  if (categoria && vitorias.length) ganhos[`arma:${categoria}`] = vitorias.reduce((t, chefe) => t + (chefe ? XP_POR_VITORIA_COM_ARMA_CONTRA_CHEFE : XP_POR_VITORIA_COM_ARMA), 0);
  const chefes = vitorias.filter(Boolean).length;
  if (chefes) ganhos.chefes = chefes * XP_POR_VITORIA_CONTRA_CHEFE;
  return ganhos;
}

/**
 * Desconto da maestria de Forja num custo já pago pelo plano: devolve parte do ouro (% por nível) e, se `materiais`,
 * parte dos materiais consumidos (% por marco, arredondado para baixo). O plano confere o custo cheio antes.
 */
export function descontoDaForja(
  maestrias: MaestriasDoJogador | undefined,
  inventarioAntes: Readonly<Record<string, number>>,
  plano: { inventario: Record<string, number>; ouroGasto: number },
  materiais = true
): { inventario: Record<string, number>; ouroGasto: number } {
  const { descontoOuroPercentual, descontoMateriaisPercentual } = bonusDaMaestriaDeForja(maestrias);
  const ouroGasto = plano.ouroGasto - Math.floor((plano.ouroGasto * descontoOuroPercentual) / 100);
  if (!materiais || descontoMateriaisPercentual <= 0) return { inventario: plano.inventario, ouroGasto };
  const inventario = { ...plano.inventario };
  for (const [id, antes] of Object.entries(inventarioAntes)) {
    const gasto = antes - (inventario[id] ?? 0);
    const devolvido = Math.floor((gasto * descontoMateriaisPercentual) / 100);
    if (gasto > 0 && devolvido > 0) inventario[id] = (inventario[id] ?? 0) + devolvido;
  }
  return { inventario, ouroGasto };
}

/** Quantos itens saíram do inventário (os orbes usados). */
export const itensGastos = (antes: Readonly<Record<string, number>>, depois: Readonly<Record<string, number>>) =>
  Object.entries(antes).reduce((t, [id, q]) => t + Math.max(0, q - (depois[id] ?? 0)), 0);

/** O bônus atual de uma trilha num nível, em texto curto, para a tela. */
export function textoDoBonusDaTrilha(id: string, nivel: number): string {
  const t = TRILHA_MAP[id];
  if (!t || t.bloqueada) return 'Em breve.';
  const so = { [id]: { xp: xpAteONivel(nivel) } };
  if (t.grupo === 'armas') {
    const b = bonusDaMaestriaDeArma(so, id.slice('arma:'.length) as CategoriaArma);
    return `+${pct(b.danoPercentual)}% de dano · +${b.criticoPontos}% de crítico`;
  }
  if (t.grupo === 'chefes') {
    const b = bonusDaMaestriaDeChefes(so);
    return `+${pct(b.danoPercentual)}% de dano contra chefes · −${b.reducaoPercentual}% do dano deles`;
  }
  if (t.grupo === 'forja') {
    const b = bonusDaMaestriaDeForja(so);
    return `−${pct(b.descontoOuroPercentual)}% de ouro · −${b.descontoMateriaisPercentual}% de materiais`;
  }
  const b = bonusDaMaestriaDeExpedicao(so);
  return `−${pct(b.reducaoDeTempoPercentual)}% no tempo · +${b.materiaisExtras} material comum · +${b.vagasExtras} vaga${b.vagasExtras === 1 ? '' : 's'}`;
}

/** XP acumulado para chegar exatamente a um nível. */
export function xpAteONivel(nivel: number): number {
  let total = 0;
  for (let n = 0; n < Math.min(NIVEL_MAXIMO_DA_MAESTRIA, Math.max(0, Math.floor(nivel))); n++) total += xpParaSubir(n);
  return total;
}
