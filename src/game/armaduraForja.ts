import { ATTRIBUTES, AttributeName } from '@/rules/attributes';
import {
  ATRIBUTOS_SORTEAVEIS_ARMADURA,
  NIVEL_MAXIMO_ARMADURA,
  ORBES_ARMADURA,
  ORBES_ARMADURA_MAP,
  PecaArmadura,
  XP_TOTAL_ARMADURA,
  nivelDoXpArmadura,
  sortearAtributoDaArmadura,
  sortearPontosDaArmadura,
} from '@/rules/armaduras';
import { PECAS_ARMADURA_MAP } from '@/rules/armadurasCatalogo';
import { percentualCustoReforja } from '@/rules/armas';
import { MATERIAIS_MAP } from '@/rules/materiais';
import { RARIDADE_MAP, RaridadeMaterial } from '@/rules/raridades';
import { Ambiente, custoDaReceita, pagarCusto } from './forja';

/**
 * Armaduras no servidor: fabricar peça, reforjar e usar orbes de armadura. Funções puras: recebem o estado do
 * personagem e devolvem o estado novo ou o motivo do bloqueio. Regras aprovadas pelo Yuri em 13/10/2026.
 */

/** Peça de armadura que o personagem tem. O nível sai do XP (0 a 30). */
export interface ArmaduraPersonagem {
  id: string;
  pecaId: string;
  atributo: AttributeName;
  pontos: number;
  reforjas: number;
  /** XP de armadura acumulado (no máximo 10.000, o nível 30). */
  xp: number;
  criadaEm: string;
}

export interface EstadoArmaduras {
  inventario: Readonly<Record<string, number>>;
  ouro: number;
  armaduras: readonly ArmaduraPersonagem[];
}

/** Limite de peças guardadas por personagem (o documento do Firestore tem tamanho máximo). */
export const MAX_ARMADURAS_POR_PERSONAGEM = 300;

export type MotivoBloqueioArmadura =
  | 'pecaInvalida'
  | 'materiaisInsuficientes'
  | 'ouroInsuficiente'
  | 'limiteDeArmaduras'
  | 'armaduraNaoEncontrada'
  | 'orbesInvalidos'
  | 'orbesInsuficientes'
  | 'nivelMaximo';

export const MENSAGEM_BLOQUEIO_ARMADURA: Readonly<Record<MotivoBloqueioArmadura, string>> = {
  pecaInvalida: 'Peça de armadura inválida.',
  materiaisInsuficientes: 'Materiais insuficientes para esta receita.',
  ouroInsuficiente: 'Ouro insuficiente.',
  limiteDeArmaduras: `Você já tem ${MAX_ARMADURAS_POR_PERSONAGEM} peças de armadura. Libere espaço para fabricar outra.`,
  armaduraNaoEncontrada: 'Peça de armadura não encontrada.',
  orbesInvalidos: 'Escolha os orbes de armadura e a quantidade de cada um.',
  orbesInsuficientes: 'Orbes de armadura insuficientes.',
  nivelMaximo: `Esta peça já está no nível máximo (${NIVEL_MAXIMO_ARMADURA}).`,
};

export type ResultadoArmadura<T> = ({ ok: true } & T) | { ok: false; motivo: MotivoBloqueioArmadura };

interface PlanoComCusto {
  inventario: Record<string, number>;
  ouroGasto: number;
  armaduras: ArmaduraPersonagem[];
  armadura: ArmaduraPersonagem;
  peca: PecaArmadura;
}

export function nivelDaArmadura(a: Pick<ArmaduraPersonagem, 'xp'>): number {
  return nivelDoXpArmadura(a.xp);
}

/** Fabrica uma peça: paga a receita e sorteia o atributo (Arcano, Vigor ou Vitalidade) e os pontos. */
export function planejarFabricacaoArmadura(
  estado: EstadoArmaduras,
  pecaId: unknown,
  amb: Ambiente
): ResultadoArmadura<PlanoComCusto> {
  const peca = typeof pecaId === 'string' ? PECAS_ARMADURA_MAP[pecaId] : undefined;
  if (!peca) return { ok: false, motivo: 'pecaInvalida' };
  if (estado.armaduras.length >= MAX_ARMADURAS_POR_PERSONAGEM) return { ok: false, motivo: 'limiteDeArmaduras' };

  const custo = custoDaReceita(peca.receita);
  const inventario = pagarCusto(estado.inventario, custo);
  if (!inventario) return { ok: false, motivo: 'materiaisInsuficientes' };
  if (estado.ouro < custo.ouro) return { ok: false, motivo: 'ouroInsuficiente' };

  const armadura: ArmaduraPersonagem = {
    id: amb.novoId(),
    pecaId: peca.id,
    atributo: sortearAtributoDaArmadura(amb.aleatorio),
    pontos: sortearPontosDaArmadura(peca.raridade, amb.aleatorio),
    reforjas: 0,
    xp: 0,
    criadaEm: amb.agora,
  };
  return { ok: true, inventario, ouroGasto: custo.ouro, armaduras: [...estado.armaduras, armadura], armadura, peca };
}

/** Reforjar: sorteia de novo os pontos (mantém o tipo), pagando parte da receita, como nas armas. */
export function planejarReforjaArmadura(
  estado: EstadoArmaduras,
  armaduraId: unknown,
  amb: Pick<Ambiente, 'aleatorio'>
): ResultadoArmadura<PlanoComCusto & { percentual: number }> {
  const atual = estado.armaduras.find((a) => a.id === armaduraId);
  const peca = atual ? PECAS_ARMADURA_MAP[atual.pecaId] : undefined;
  if (!atual || !peca) return { ok: false, motivo: 'armaduraNaoEncontrada' };

  const percentual = percentualCustoReforja(atual.reforjas);
  const custo = custoDaReceita(peca.receita, percentual);
  const inventario = pagarCusto(estado.inventario, custo);
  if (!inventario) return { ok: false, motivo: 'materiaisInsuficientes' };
  if (estado.ouro < custo.ouro) return { ok: false, motivo: 'ouroInsuficiente' };

  const armadura: ArmaduraPersonagem = {
    ...atual,
    pontos: sortearPontosDaArmadura(peca.raridade, amb.aleatorio),
    reforjas: atual.reforjas + 1,
  };
  const armaduras = estado.armaduras.map((a) => (a.id === armadura.id ? armadura : a));
  return { ok: true, inventario, ouroGasto: custo.ouro, armaduras, armadura, peca, percentual };
}

/**
 * Usa orbes de armadura numa peça: soma o XP de todos e sobe os níveis. Na peça já no nível 30 é recusado;
 * o XP que passar do nível 30 se perde.
 */
export function planejarUsoDeOrbes(
  estado: EstadoArmaduras,
  armaduraId: unknown,
  orbes: unknown
): ResultadoArmadura<{ inventario: Record<string, number>; armaduras: ArmaduraPersonagem[]; armadura: ArmaduraPersonagem; xpGanho: number; nivelAntes: number; nivelDepois: number }> {
  const atual = estado.armaduras.find((a) => a.id === armaduraId);
  if (!atual || !PECAS_ARMADURA_MAP[atual.pecaId]) return { ok: false, motivo: 'armaduraNaoEncontrada' };
  if (!orbes || typeof orbes !== 'object' || Array.isArray(orbes)) return { ok: false, motivo: 'orbesInvalidos' };
  const pedido = Object.entries(orbes as Record<string, unknown>).filter(([, q]) => q !== 0);
  if (pedido.length === 0) return { ok: false, motivo: 'orbesInvalidos' };
  for (const [id, q] of pedido) {
    if (!ORBES_ARMADURA_MAP[id] || typeof q !== 'number' || !Number.isInteger(q) || q < 0) return { ok: false, motivo: 'orbesInvalidos' };
  }
  const nivelAntes = nivelDoXpArmadura(atual.xp);
  if (nivelAntes >= NIVEL_MAXIMO_ARMADURA) return { ok: false, motivo: 'nivelMaximo' };

  const inventario = { ...estado.inventario };
  let xp = 0;
  for (const [id, q] of pedido as [string, number][]) {
    if ((inventario[id] ?? 0) < q) return { ok: false, motivo: 'orbesInsuficientes' };
    inventario[id] -= q;
    if (inventario[id] === 0) delete inventario[id];
    xp += ORBES_ARMADURA_MAP[id].xp * q;
  }
  const novoXp = Math.min(XP_TOTAL_ARMADURA, atual.xp + xp);
  const armadura: ArmaduraPersonagem = { ...atual, xp: novoXp };
  const armaduras = estado.armaduras.map((a) => (a.id === armadura.id ? armadura : a));
  return { ok: true, inventario, armaduras, armadura, xpGanho: novoXp - atual.xp, nivelAntes, nivelDepois: nivelDoXpArmadura(novoXp) };
}

const ORDEM_RARIDADE: readonly RaridadeMaterial[] = ['comum', 'raro', 'muitoRaro', 'epico', 'lendario'];
/** Os sorteios dos orbes começam aqui, depois dos materiais e dos extras. */
const INDICE_SORTEIO_ORBES = 80;

/**
 * Orbes de armadura de uma vitória: um por raridade até a maior raridade de material do monstro (o mesmo teto
 * dos materiais). O Comum é garantido; os outros caem com a chance da raridade mais o bônus de drop da Sorte.
 */
export function sortearOrbesDaCacada(
  drops: readonly string[],
  sorteio: (indice: number) => number,
  bonusChancePercentual = 0
): { materialId: string; quantidade: number }[] {
  const teto = Math.max(-1, ...drops.map((id) => ORDEM_RARIDADE.indexOf(MATERIAIS_MAP[id]?.raridade as RaridadeMaterial)));
  const resultado: { materialId: string; quantidade: number }[] = [];
  ORBES_ARMADURA.forEach((orbe, i) => {
    const r = ORDEM_RARIDADE.indexOf(orbe.raridade);
    if (r > teto) return;
    const chance = orbe.raridade === 'comum' ? 100 : RARIDADE_MAP[orbe.raridade].chancePercentual + bonusChancePercentual;
    if (orbe.raridade === 'comum' || sorteio(INDICE_SORTEIO_ORBES + i) < chance) {
      resultado.push({ materialId: orbe.id, quantidade: 1 });
    }
  });
  return resultado;
}

/** Lê as peças gravadas, descartando entradas inválidas (dados antigos ou corrompidos). */
export function lerArmadurasPersonagem(valor: unknown): ArmaduraPersonagem[] {
  if (!Array.isArray(valor)) return [];
  const lidas: ArmaduraPersonagem[] = [];
  for (const v of valor) {
    if (!v || typeof v !== 'object') continue;
    const a = v as Record<string, unknown>;
    if (typeof a.id !== 'string' || typeof a.pecaId !== 'string' || !PECAS_ARMADURA_MAP[a.pecaId]) continue;
    if (typeof a.atributo !== 'string' || !(ATTRIBUTES as readonly string[]).includes(a.atributo)) continue;
    if (!(ATRIBUTOS_SORTEAVEIS_ARMADURA as readonly string[]).includes(a.atributo)) continue;
    lidas.push({
      id: a.id,
      pecaId: a.pecaId,
      atributo: a.atributo as AttributeName,
      pontos: Number(a.pontos) || 0,
      reforjas: Number(a.reforjas) || 0,
      xp: Math.max(0, Math.min(XP_TOTAL_ARMADURA, Number(a.xp) || 0)),
      criadaEm: typeof a.criadaEm === 'string' ? a.criadaEm : '',
    });
  }
  return lidas;
}
