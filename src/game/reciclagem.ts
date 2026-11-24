import { ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import { PECAS_ARMADURA_MAP } from '@/rules/armadurasCatalogo';
import type { ArmaBase, ReceitaArma } from '@/rules/armas';
import type { PecaArmadura } from '@/rules/armaduras';
import type { EquipamentoPersonagem } from './equipamento';
import { diversosDaRaridade, type ArmaPersonagem } from './forja';
import type { ArmaduraPersonagem } from './armaduraForja';

/**
 * Reciclar equipamento (pedido do Yuri, 24/11/2026): desmancha uma arma ou uma peça de armadura que o jogador tem e devolve 30% dos materiais da receita
 * da peça (materiais de monstro, de mundo e diversos), arredondado para baixo e com no mínimo 1 de cada material que a receita pede. Não devolve ouro e não
 * devolve o que foi gasto nas reforjas nem nas evoluções. O que está equipado não pode ser reciclado. Funções puras: o servidor grava numa transação.
 */
export const PERCENTUAL_DA_RECICLAGEM = 30;

export type MotivoBloqueioReciclagem = 'naoEncontrada' | 'equipada' | 'semReceita';

export const MENSAGEM_BLOQUEIO_RECICLAGEM: Readonly<Record<MotivoBloqueioReciclagem, string>> = {
  naoEncontrada: 'Equipamento não encontrado.',
  equipada: 'Desequipe antes de reciclar: este item está equipado.',
  semReceita: 'Este equipamento não tem receita para reciclar.',
};

export type ResultadoReciclagem<T> = ({ ok: true } & T) | { ok: false; motivo: MotivoBloqueioReciclagem };

const devolve = (qtd: number): number => Math.max(1, Math.floor((qtd * PERCENTUAL_DA_RECICLAGEM) / 100));

/** O que volta da receita: id do item → quantidade. Os diversos (qualquer um dos dois da raridade) voltam como o primeiro da raridade. */
export function devolucaoDaReceita(receita: ReceitaArma): Record<string, number> {
  const itens: Record<string, number> = {};
  for (const i of [...receita.materiaisMonstro, ...receita.materiaisMundo]) {
    if (i.qtd > 0) itens[i.id] = (itens[i.id] ?? 0) + devolve(i.qtd);
  }
  if (receita.diversos && receita.diversos.qtd > 0) {
    const id = diversosDaRaridade(receita.diversos.raridade)[0];
    if (id) itens[id] = (itens[id] ?? 0) + devolve(receita.diversos.qtd);
  }
  return itens;
}

const somar = (inv: Readonly<Record<string, number>>, itens: Readonly<Record<string, number>>): Record<string, number> => {
  const novo = { ...inv };
  for (const [id, q] of Object.entries(itens)) novo[id] = (novo[id] ?? 0) + q;
  return novo;
};

export interface EstadoReciclagemArmas {
  inventario: Readonly<Record<string, number>>;
  armas: readonly ArmaPersonagem[];
  equipamento?: EquipamentoPersonagem;
}

export function planejarReciclagemArma(
  estado: EstadoReciclagemArmas,
  armaId: unknown
): ResultadoReciclagem<{ inventario: Record<string, number>; armas: ArmaPersonagem[]; arma: ArmaPersonagem; base: ArmaBase; devolucao: Record<string, number> }> {
  const arma = estado.armas.find((a) => a.id === armaId);
  const base = arma ? ARMAS_BASE_MAP[arma.baseId] : undefined;
  if (!arma || !base) return { ok: false, motivo: 'naoEncontrada' };
  if (estado.equipamento?.armaId === arma.id) return { ok: false, motivo: 'equipada' };
  const devolucao = devolucaoDaReceita(base.receita);
  if (Object.keys(devolucao).length === 0) return { ok: false, motivo: 'semReceita' };
  return { ok: true, inventario: somar(estado.inventario, devolucao), armas: estado.armas.filter((a) => a.id !== arma.id), arma, base, devolucao };
}

export interface EstadoReciclagemArmaduras {
  inventario: Readonly<Record<string, number>>;
  armaduras: readonly ArmaduraPersonagem[];
  equipamento?: EquipamentoPersonagem;
}

export function planejarReciclagemArmadura(
  estado: EstadoReciclagemArmaduras,
  armaduraId: unknown
): ResultadoReciclagem<{ inventario: Record<string, number>; armaduras: ArmaduraPersonagem[]; armadura: ArmaduraPersonagem; peca: PecaArmadura; devolucao: Record<string, number> }> {
  const armadura = estado.armaduras.find((a) => a.id === armaduraId);
  const peca = armadura ? PECAS_ARMADURA_MAP[armadura.pecaId] : undefined;
  if (!armadura || !peca) return { ok: false, motivo: 'naoEncontrada' };
  if (Object.values(estado.equipamento?.armadura ?? {}).includes(armadura.id)) return { ok: false, motivo: 'equipada' };
  const devolucao = devolucaoDaReceita(peca.receita);
  if (Object.keys(devolucao).length === 0) return { ok: false, motivo: 'semReceita' };
  return { ok: true, inventario: somar(estado.inventario, devolucao), armaduras: estado.armaduras.filter((a) => a.id !== armadura.id), armadura, peca, devolucao };
}
