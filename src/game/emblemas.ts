import { ATTRIBUTES, Attributes } from '@/rules/attributes';
import { EmblemaRaridade } from '@/rules/emblemas';
import { HabilidadeEmblema, TIPO_EMBLEMA_MAP, tiposDaRaridade, TipoEmblema } from '@/rules/emblemasCatalogo';

/**
 * Sistema de emblemas (Yuri, 14/10/2026) — regras puras (sem banco).
 * - 4 espaços de emblema na ficha; o mesmo tipo pode ser equipado até 4 vezes.
 * - Cada emblema é um item com um tipo e estrelas (★ a ★★★; o Mítico vai até a ★ vermelha, a 4ª estrela).
 * - Cada estrela desbloqueia uma habilidade passiva (1★ a 1ª, 2★ a 2ª, 3★ a 3ª, ★ vermelha a 4ª).
 * - O nível de cada habilidade (1 a 4) é quantos emblemas do mesmo tipo estão equipados com ela desbloqueada.
 * - Fusão: 2 emblemas iguais de 1★ dão 1 de 2★; 3 de 2★ dão 1 de 3★ (a 3★ para a ★ vermelha do Mítico é PROPOSTA).
 */
export interface EmblemaItem {
  id: string;
  tipo: string;
  estrelas: number;
}

export const SLOTS_EMBLEMA = 4;

/**
 * Pontos que o emblema soma em CADA um dos 3 atributos dele, no total até aquela estrela (não é o ganho da estrela):
 * [1★, 2★, 3★, ★ vermelha]. PROPOSTA de balanceamento: quatro Épicos 3★ somam 60 pontos, na ordem de uma arma Épica
 * (41 a 65); os Míticos chegam a 27 por emblema na ★ vermelha. O Yuri ajusta aqui.
 */
export const PONTOS_DE_ATRIBUTO_POR_ESTRELA: Readonly<Record<EmblemaRaridade, readonly number[]>> = {
  comum: [1, 1, 2],
  raro: [1, 2, 3],
  muitoRaro: [2, 3, 4],
  epico: [2, 3, 5],
  lendario: [3, 4, 6],
  mitico: [3, 5, 7, 9],
};

/** Quantos emblemas iguais (mesmo tipo e mesma estrela) a fusão consome para dar 1 com uma estrela a mais. */
export const CUSTO_DA_FUSAO: Readonly<Record<number, number>> = { 1: 2, 2: 3, 3: 3 };

/**
 * Quanto o valor de uma habilidade cresce com o nível dela (1 a 4): o nível 1 vale o valor do catálogo e os seguintes
 * valem 1,5×, 2× e 2,5× (aprovado pelo Yuri em 14/10/2026). Os efeitos das habilidades no combate entram nos próximos PRs.
 */
export const MULTIPLICADOR_POR_NIVEL_DA_HABILIDADE: readonly number[] = [1, 1.5, 2, 2.5];

export function multiplicadorDoNivel(nivel: number): number {
  const i = Math.min(MULTIPLICADOR_POR_NIVEL_DA_HABILIDADE.length, Math.max(1, Math.floor(nivel))) - 1;
  return MULTIPLICADOR_POR_NIVEL_DA_HABILIDADE[i];
}

export type MotivoBloqueioEmblema =
  | 'itemNaoEncontrado'
  | 'jaEquipado'
  | 'slotsCheios'
  | 'naoEquipado'
  | 'tipoInvalido'
  | 'estrelaInvalida'
  | 'estrelaMaxima'
  | 'emblemasInsuficientes';

export const MENSAGEM_BLOQUEIO_EMBLEMA: Readonly<Record<MotivoBloqueioEmblema, string>> = {
  itemNaoEncontrado: 'Emblema não encontrado.',
  jaEquipado: 'Este emblema já está equipado.',
  slotsCheios: 'Os 4 espaços de emblema já estão ocupados. Desequipe um emblema primeiro.',
  naoEquipado: 'Este emblema não está equipado.',
  tipoInvalido: 'Tipo de emblema inválido.',
  estrelaInvalida: 'Estrela de emblema inválida.',
  estrelaMaxima: 'Este emblema já está na estrela máxima.',
  emblemasInsuficientes: 'Emblemas iguais insuficientes (os equipados não contam; desequipe-os para fundir).',
};

export function estrelasMaximasDoTipo(tipoId: string): number {
  return TIPO_EMBLEMA_MAP[tipoId]?.estrelasMax ?? 3;
}

/** As habilidades que um emblema já desbloqueou (uma por estrela). */
export function habilidadesDesbloqueadas(item: Pick<EmblemaItem, 'tipo' | 'estrelas'>): HabilidadeEmblema[] {
  const tipo = TIPO_EMBLEMA_MAP[item.tipo];
  return tipo ? tipo.habilidades.slice(0, Math.max(0, item.estrelas)) : [];
}

/** Lê os emblemas gravados, descartando o que é inválido (tipo que não existe, estrela fora do limite, repetidos). */
export function lerEmblemasPersonagem(itensBrutos: unknown, equipadosBrutos: unknown): { itens: EmblemaItem[]; equipados: string[] } {
  const itens: EmblemaItem[] = [];
  const vistos = new Set<string>();
  if (Array.isArray(itensBrutos)) {
    for (const bruto of itensBrutos) {
      if (!bruto || typeof bruto !== 'object') continue;
      const { id, tipo, estrelas } = bruto as Record<string, unknown>;
      if (typeof id !== 'string' || id === '' || vistos.has(id)) continue;
      if (typeof tipo !== 'string' || !TIPO_EMBLEMA_MAP[tipo]) continue;
      if (typeof estrelas !== 'number' || !Number.isInteger(estrelas) || estrelas < 1 || estrelas > estrelasMaximasDoTipo(tipo)) continue;
      vistos.add(id);
      itens.push({ id, tipo, estrelas });
    }
  }
  const equipados: string[] = [];
  if (Array.isArray(equipadosBrutos)) {
    for (const id of equipadosBrutos) {
      if (typeof id === 'string' && vistos.has(id) && !equipados.includes(id) && equipados.length < SLOTS_EMBLEMA) equipados.push(id);
    }
  }
  return { itens, equipados };
}

type Resultado<T> = ({ ok: true } & T) | { ok: false; motivo: MotivoBloqueioEmblema };

export function equiparEmblema(itens: readonly EmblemaItem[], equipados: readonly string[], itemId: unknown): Resultado<{ equipados: string[] }> {
  if (typeof itemId !== 'string' || !itens.some((i) => i.id === itemId)) return { ok: false, motivo: 'itemNaoEncontrado' };
  if (equipados.includes(itemId)) return { ok: false, motivo: 'jaEquipado' };
  if (equipados.length >= SLOTS_EMBLEMA) return { ok: false, motivo: 'slotsCheios' };
  return { ok: true, equipados: [...equipados, itemId] };
}

export function desequiparEmblema(equipados: readonly string[], itemId: unknown): Resultado<{ equipados: string[] }> {
  if (typeof itemId !== 'string' || !equipados.includes(itemId)) return { ok: false, motivo: 'naoEquipado' };
  return { ok: true, equipados: equipados.filter((id) => id !== itemId) };
}

/**
 * Funde emblemas iguais (mesmo tipo e mesma estrela, fora dos espaços): consome o custo da estrela e cria 1 emblema
 * com uma estrela a mais. `novoId` é o id do emblema criado.
 */
export function fundirEmblemas(
  itens: readonly EmblemaItem[],
  equipados: readonly string[],
  tipoId: unknown,
  estrelas: unknown,
  novoId: string
): Resultado<{ itens: EmblemaItem[]; consumidos: string[]; criado: EmblemaItem }> {
  if (typeof tipoId !== 'string' || !TIPO_EMBLEMA_MAP[tipoId]) return { ok: false, motivo: 'tipoInvalido' };
  if (typeof estrelas !== 'number' || !Number.isInteger(estrelas) || estrelas < 1) return { ok: false, motivo: 'estrelaInvalida' };
  if (estrelas >= estrelasMaximasDoTipo(tipoId)) return { ok: false, motivo: 'estrelaMaxima' };
  const custo = CUSTO_DA_FUSAO[estrelas];
  const candidatos = itens.filter((i) => i.tipo === tipoId && i.estrelas === estrelas && !equipados.includes(i.id));
  if (candidatos.length < custo) return { ok: false, motivo: 'emblemasInsuficientes' };
  const consumidos = candidatos.slice(0, custo).map((i) => i.id);
  const criado: EmblemaItem = { id: novoId, tipo: tipoId, estrelas: estrelas + 1 };
  return { ok: true, itens: [...itens.filter((i) => !consumidos.includes(i.id)), criado], consumidos, criado };
}

export interface NivelDeHabilidadeEmblema {
  tipo: string;
  habilidade: HabilidadeEmblema;
  /** Posição da habilidade no emblema (0 a 3). */
  indice: number;
  /** Nível da habilidade (1 a 4): quantos emblemas equipados do tipo têm esta habilidade desbloqueada. */
  nivel: number;
}

/**
 * Habilidades que valem agora e o nível de cada uma. Cada emblema equipado conta pelas habilidades que a própria
 * estrela dele desbloqueia; o nível da habilidade é a quantidade de emblemas do tipo que a têm (até 4).
 */
export function nivelDasHabilidades(equipados: readonly EmblemaItem[]): NivelDeHabilidadeEmblema[] {
  const resultado: NivelDeHabilidadeEmblema[] = [];
  const tipos = [...new Set(equipados.map((e) => e.tipo))];
  for (const tipoId of tipos) {
    const tipo = TIPO_EMBLEMA_MAP[tipoId];
    if (!tipo) continue;
    tipo.habilidades.forEach((habilidade, indice) => {
      const nivel = equipados.filter((e) => e.tipo === tipoId && e.estrelas >= indice + 1).length;
      if (nivel > 0) resultado.push({ tipo: tipoId, habilidade, indice, nivel: Math.min(SLOTS_EMBLEMA, nivel) });
    });
  }
  return resultado;
}

/** Sorteia um tipo de emblema dentro da raridade. `valor` é um número em [0, 100). */
export function escolherTipoDaRaridade(raridade: EmblemaRaridade, valor: number): TipoEmblema {
  const tipos = tiposDaRaridade(raridade);
  return tipos[Math.min(tipos.length - 1, Math.floor((valor / 100) * tipos.length))];
}

/** Os atributos que um emblema soma na estrela dele (os 3 atributos do tipo, com os pontos da raridade e da estrela). */
export function atributosDoEmblema(item: Pick<EmblemaItem, 'tipo' | 'estrelas'>): Attributes {
  const resultado = Object.fromEntries(ATTRIBUTES.map((a) => [a, 0])) as Attributes;
  const tipo = TIPO_EMBLEMA_MAP[item.tipo];
  if (!tipo) return resultado;
  const tabela = PONTOS_DE_ATRIBUTO_POR_ESTRELA[tipo.raridade];
  const pontos = tabela[Math.min(tabela.length, Math.max(0, item.estrelas)) - 1] ?? 0;
  for (const a of tipo.atributos) resultado[a] += pontos;
  return resultado;
}

/** Soma dos atributos de todos os emblemas equipados. */
export function atributosDosEmblemas(equipados: readonly Pick<EmblemaItem, 'tipo' | 'estrelas'>[]): Attributes {
  const resultado = Object.fromEntries(ATTRIBUTES.map((a) => [a, 0])) as Attributes;
  for (const e of equipados) {
    const a = atributosDoEmblema(e);
    for (const nome of ATTRIBUTES) resultado[nome] += a[nome];
  }
  return resultado;
}

/** Os emblemas equipados do personagem (na ordem dos espaços), descartando ids que não existem mais. */
export function emblemasEquipadosDe(c: { emblemasItens?: readonly EmblemaItem[]; emblemasEquipados?: readonly string[] }): EmblemaItem[] {
  const itens = c.emblemasItens ?? [];
  return (c.emblemasEquipados ?? []).map((id) => itens.find((i) => i.id === id)).filter((i): i is EmblemaItem => !!i);
}
