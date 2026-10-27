import { MATERIAIS_MUNDO } from './materiaisArmas';
import { mesDeBrasilia, type ComprasNaLoja } from './loja';
import type { RaridadeMaterial } from './raridades';

/**
 * Loja de Moedas VIP (8.5, decidida pelo Yuri em 27/10/2026). As Moedas VIP vêm dos Passes (Premium: 10 por dia;
 * Deluxe: 20 por dia). Os preços são fixos, sem rotação, e cada item tem um limite de compra por mês (zera no dia 1, em
 * Brasília). Vende baús de escolha (emblema lendário e carta lendária, 200 Moedas cada, até 4 por mês) e os materiais de
 * mundo (comuns a épicos; os lendários ficam de fora).
 */

export type TipoDoItemDaLojaVip = 'material' | 'bauEmblemaLendario' | 'bauCartaLendaria';

export interface ItemDaLojaVip {
  /** `material:id` ou `bau:...`: identifica o item e o limite do mês. */
  chave: string;
  tipo: TipoDoItemDaLojaVip;
  /** O id do material (vazio nos baús). */
  id: string;
  nome: string;
  raridade: RaridadeMaterial | 'lendario';
  preco: number;
  limiteMensal: number;
}

const DO_MATERIAL: Readonly<Partial<Record<RaridadeMaterial, { preco: number; limite: number }>>> = {
  comum: { preco: 2, limite: 100 },
  raro: { preco: 5, limite: 60 },
  muitoRaro: { preco: 15, limite: 30 },
  epico: { preco: 40, limite: 10 },
};

export const PRECO_DO_BAU_EM_MOEDAS = 200;
export const LIMITE_MENSAL_DO_BAU = 4;

export const ITENS_DA_LOJA_VIP: readonly ItemDaLojaVip[] = [
  { chave: 'bau:emblemaLendario', tipo: 'bauEmblemaLendario', id: '', nome: 'Baú de escolha de emblema lendário', raridade: 'lendario', preco: PRECO_DO_BAU_EM_MOEDAS, limiteMensal: LIMITE_MENSAL_DO_BAU },
  { chave: 'bau:cartaLendaria', tipo: 'bauCartaLendaria', id: '', nome: 'Baú de escolha de carta lendária', raridade: 'lendario', preco: PRECO_DO_BAU_EM_MOEDAS, limiteMensal: LIMITE_MENSAL_DO_BAU },
  ...MATERIAIS_MUNDO.flatMap((m) => {
    const regra = DO_MATERIAL[m.raridade];
    return regra ? [{ chave: `material:${m.id}`, tipo: 'material' as const, id: m.id, nome: m.nome, raridade: m.raridade, preco: regra.preco, limiteMensal: regra.limite }] : [];
  }),
];

export const itemDaLojaVip = (chave: unknown) => ITENS_DA_LOJA_VIP.find((i) => i.chave === chave);

/** Quantas unidades de um item o jogador já comprou neste mês. */
export const compradasNaLojaVip = (c: ComprasNaLoja | undefined, chave: string, agora: Date) => (c && c.mes === mesDeBrasilia(agora) ? (c.itens[chave] ?? 0) : 0);
