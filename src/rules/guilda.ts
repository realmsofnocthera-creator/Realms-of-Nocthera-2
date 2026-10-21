/**
 * Guildas (7.3). Uma guilda é um documento só (guildas/{id}) com os membros, os convites e os pedidos dentro:
 * abrir a tela da guilda custa 1 leitura no Firestore. O personagem guarda só o id e o nome da guilda (para o
 * perfil) e as listas curtas de convites e pedidos que recebeu ou fez.
 */

export const CARGOS_DA_GUILDA = ['lider', 'oficial', 'membro'] as const;
export type CargoDaGuilda = (typeof CARGOS_DA_GUILDA)[number];

export const NOME_DO_CARGO: Readonly<Record<CargoDaGuilda, string>> = { lider: 'Líder', oficial: 'Oficial', membro: 'Membro' };

export const NOME_MINIMO_DA_GUILDA = 3;
export const NOME_MAXIMO_DA_GUILDA = 20;
export const DESCRICAO_MAXIMA_DA_GUILDA = 200;
/** Convites pendentes que uma guilda pode ter ao mesmo tempo. */
export const CONVITES_DA_GUILDA = 20;
/** Pedidos de entrada pendentes que uma guilda guarda. */
export const PEDIDOS_DA_GUILDA = 20;
/** Convites que um jogador pode ter esperando resposta. */
export const CONVITES_DO_JOGADOR = 5;
/** Pedidos de entrada que um jogador pode ter feito ao mesmo tempo. */
export const PEDIDOS_DO_JOGADOR = 3;

/** O que o Dono ajusta no painel do Mestre (Sistemas), sem PR. */
export interface RegrasDeGuilda {
  nivelMinimo: number;
  custoOuro: number;
  maxMembros: number;
}

/** Valores iniciais (proposta aceita pelo Yuri em 21/10/2026; ajustáveis no painel). */
export const REGRAS_PADRAO_DE_GUILDA: Readonly<RegrasDeGuilda> = { nivelMinimo: 10, custoOuro: 5000, maxMembros: 30 };

/** Limites do que o painel aceita. O teto de membros também limita o tamanho do documento da guilda. */
export const LIMITES_DAS_REGRAS_DE_GUILDA: Readonly<Record<keyof RegrasDeGuilda, readonly [number, number]>> = {
  nivelMinimo: [1, 100],
  custoOuro: [0, 10_000_000],
  maxMembros: [2, 50],
};

export function regrasDeGuildaValidas(v: unknown): RegrasDeGuilda | null {
  if (typeof v !== 'object' || v === null) return null;
  const d = v as Record<string, unknown>;
  const r = {} as RegrasDeGuilda;
  for (const campo of Object.keys(LIMITES_DAS_REGRAS_DE_GUILDA) as (keyof RegrasDeGuilda)[]) {
    const [min, max] = LIMITES_DAS_REGRAS_DE_GUILDA[campo];
    const n = d[campo];
    if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max) return null;
    r[campo] = n;
  }
  return r;
}

export interface MembroDaGuilda {
  uid: string;
  nome: string;
  cargo: CargoDaGuilda;
  entrouEm: string;
}

export interface ConviteDaGuilda {
  uid: string;
  nome: string;
  /** Quem convidou (nome do personagem). */
  por: string;
  em: string;
}

export interface PedidoDaGuilda {
  uid: string;
  nome: string;
  nivel: number;
  classeId: string;
  em: string;
}

export interface GuildaDocumento {
  id: string;
  nome: string;
  /** Nome em minúsculas, para a busca por começo do nome. */
  nomeBusca: string;
  descricao: string;
  criadaEm: string;
  membros: MembroDaGuilda[];
  convites: ConviteDaGuilda[];
  pedidos: PedidoDaGuilda[];
  /** Guardado à parte para listar as guildas maiores com uma consulta simples. */
  quantidadeMembros: number;
}

/** O que qualquer jogador vê de uma guilda (lista, busca, página da guilda). */
export interface ResumoDaGuilda {
  id: string;
  nome: string;
  descricao: string;
  quantidadeMembros: number;
  lider: string;
}

export const chaveDoNomeDaGuilda = (nome: string) => nome.trim().toLowerCase().replace(/\s+/g, ' ');

/** Letras (com acento), números, espaço, hífen e apóstrofo; sem espaço duplo nem nas pontas. */
const NOME_PERMITIDO = /^[\p{L}\p{N}][\p{L}\p{N} '-]*[\p{L}\p{N}]$/u;

export function validarNomeDaGuilda(bruto: unknown): { ok: true; nome: string } | { ok: false; erro: string } {
  if (typeof bruto !== 'string') return { ok: false, erro: 'Escolha um nome para a guilda.' };
  const nome = bruto.trim().replace(/\s+/g, ' ');
  if (nome.length < NOME_MINIMO_DA_GUILDA || nome.length > NOME_MAXIMO_DA_GUILDA) {
    return { ok: false, erro: `O nome da guilda deve ter entre ${NOME_MINIMO_DA_GUILDA} e ${NOME_MAXIMO_DA_GUILDA} caracteres.` };
  }
  if (!NOME_PERMITIDO.test(nome)) return { ok: false, erro: 'Use só letras, números, espaço, hífen e apóstrofo no nome da guilda.' };
  return { ok: true, nome };
}

export function validarDescricaoDaGuilda(bruto: unknown): { ok: true; descricao: string } | { ok: false; erro: string } {
  if (bruto === undefined || bruto === null) return { ok: true, descricao: '' };
  if (typeof bruto !== 'string') return { ok: false, erro: 'A descrição deve ser um texto.' };
  const descricao = bruto.trim();
  if (descricao.length > DESCRICAO_MAXIMA_DA_GUILDA) return { ok: false, erro: `A descrição deve ter no máximo ${DESCRICAO_MAXIMA_DA_GUILDA} caracteres.` };
  return { ok: true, descricao };
}

/** Líder e Oficial administram a entrada (convites e pedidos). */
export const administraEntrada = (cargo: CargoDaGuilda) => cargo === 'lider' || cargo === 'oficial';

/** O Líder expulsa qualquer um; o Oficial expulsa só Membros. Ninguém expulsa a si mesmo. */
export const podeExpulsar = (ator: CargoDaGuilda, alvo: CargoDaGuilda) => (ator === 'lider' && alvo !== 'lider') || (ator === 'oficial' && alvo === 'membro');

export function resumoDaGuilda(g: GuildaDocumento): ResumoDaGuilda {
  return { id: g.id, nome: g.nome, descricao: g.descricao, quantidadeMembros: g.membros.length, lider: g.membros.find((m) => m.cargo === 'lider')?.nome ?? '' };
}

/** Membros na ordem da tela: Líder, Oficiais e Membros; dentro do cargo, quem entrou antes. */
export function membrosEmOrdem(membros: readonly MembroDaGuilda[]): MembroDaGuilda[] {
  const peso: Record<CargoDaGuilda, number> = { lider: 0, oficial: 1, membro: 2 };
  return [...membros].sort((a, b) => peso[a.cargo] - peso[b.cargo] || a.entrouEm.localeCompare(b.entrouEm));
}

/** Quem herda a liderança quando o Líder sai da conta: o Oficial mais antigo, senão o Membro mais antigo. */
export function sucessorDoLider(membros: readonly MembroDaGuilda[]): MembroDaGuilda | null {
  return membrosEmOrdem(membros).find((m) => m.cargo !== 'lider') ?? null;
}

const ehCargo = (v: unknown): v is CargoDaGuilda => typeof v === 'string' && (CARGOS_DA_GUILDA as readonly string[]).includes(v);
const texto = (v: unknown) => (typeof v === 'string' ? v : '');
const lista = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null) : []);

/** Lê o documento da guilda com tolerância: entrada fora do formato é descartada; sem id, nome ou Líder, a guilda não vale. */
export function guildaDoDocumento(id: string, bruto: unknown): GuildaDocumento | null {
  if (typeof bruto !== 'object' || bruto === null) return null;
  const d = bruto as Record<string, unknown>;
  if (typeof d.nome !== 'string' || !d.nome) return null;
  const membros = lista(d.membros).flatMap((m) => (typeof m.uid === 'string' && m.uid && typeof m.nome === 'string' && ehCargo(m.cargo) ? [{ uid: m.uid, nome: m.nome, cargo: m.cargo, entrouEm: texto(m.entrouEm) }] : []));
  if (!membros.some((m) => m.cargo === 'lider')) return null;
  const convites = lista(d.convites).flatMap((c) => (typeof c.uid === 'string' && c.uid && typeof c.nome === 'string' ? [{ uid: c.uid, nome: c.nome, por: texto(c.por), em: texto(c.em) }] : []));
  const pedidos = lista(d.pedidos).flatMap((p) =>
    typeof p.uid === 'string' && p.uid && typeof p.nome === 'string' ? [{ uid: p.uid, nome: p.nome, nivel: typeof p.nivel === 'number' ? p.nivel : 0, classeId: texto(p.classeId), em: texto(p.em) }] : []
  );
  return { id, nome: d.nome, nomeBusca: chaveDoNomeDaGuilda(d.nome), descricao: texto(d.descricao), criadaEm: texto(d.criadaEm), membros, convites, pedidos, quantidadeMembros: membros.length };
}
