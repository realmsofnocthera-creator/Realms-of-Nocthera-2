import { randomUUID } from 'node:crypto';
import { desequiparCarta, despertarCarta, destruirCartas, equiparCarta, guardarCartas, MENSAGEM_BLOQUEIO_ALMA, refinarCarta, type MotivoBloqueioAlma } from '@/game/almas';
import { criarCarta, NIVEL_DA_ALMA, TIPO_DE_CARTA_MAP, tiposDaRaridadeDeCarta, type CartaItem, type CategoriaDeCarta } from '@/rules/almas';
import type { EmblemaRaridade } from '@/rules/emblemas';
import { carregarPersonagem, salvarPersonagem, type CharacterDocument } from '@/server/characterService';
import { gerarSementeCombate } from '@/server/combateSemente';
import { repositorio } from '@/server/persistencia';

/**
 * Sistema de Alma (7.8): equipar, desequipar, despertar, refinar e destruir cartas (tudo numa transação) e a entrega
 * de cartas pelas recompensas (Teste de Equipe, Incursões e Chefe de guildas).
 */

export class ErroDeAlma extends Error {
  readonly status = 400;
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeAlma';
  }
}

/** Sorteador determinístico a partir da semente (mulberry32): números em [0, 1). */
export function sorteadorDaSemente(semente: number): () => number {
  let a = Math.floor(Math.abs(semente)) >>> 0 || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sorteia um tipo de carta da raridade (de qualquer categoria, ou só da `categoria` pedida). */
export function sortearTipoDaRaridade(raridade: EmblemaRaridade, sorteio: () => number, categoria?: CategoriaDeCarta): string {
  const tipos = tiposDaRaridadeDeCarta(raridade).filter((t) => !categoria || t.categoria === categoria);
  return tipos[Math.min(tipos.length - 1, Math.floor(sorteio() * tipos.length))].id;
}

export interface EntregaDeCartas {
  /** Os campos do personagem que mudam (cartas, descobertas e cacos do que passou do limite). */
  patch: Partial<Pick<CharacterDocument, 'cartasItens' | 'cartasDescobertas' | 'cacosDeAlma'>>;
  criadas: { id: string; tipo: string; nome: string; raridade: EmblemaRaridade; nova: boolean }[];
}

/**
 * Entrega cartas ao personagem (recompensa): cria as cartas com os efeitos aleatórios, marca os tipos como
 * descobertos e, se o inventário estiver cheio, converte o excesso em cacos de alma. Não grava: devolve o patch.
 */
export function entregarCartas(char: CharacterDocument, tipoIds: readonly string[], semente: number): EntregaDeCartas {
  const sorteio = sorteadorDaSemente(semente);
  const novas = tipoIds.map((t) => criarCarta(randomUUID(), t, sorteio));
  const guardado = guardarCartas(char.cartasItens ?? [], novas);
  const descobertas = [...(char.cartasDescobertas ?? [])];
  const criadas = novas.map((c) => {
    const nova = !descobertas.includes(c.tipo);
    if (nova) descobertas.push(c.tipo);
    const t = TIPO_DE_CARTA_MAP[c.tipo];
    return { id: c.id, tipo: c.tipo, nome: t.nome, raridade: t.raridade, nova };
  });
  return {
    patch: { cartasItens: guardado.itens, cartasDescobertas: descobertas, ...(guardado.cacosDoExcesso ? { cacosDeAlma: (char.cacosDeAlma ?? 0) + guardado.cacosDoExcesso } : {}) },
    criadas,
  };
}

export const ACOES_DA_ALMA = ['equipar', 'desequipar', 'despertar', 'refinar', 'destruir'] as const;
export type AcaoDaAlma = (typeof ACOES_DA_ALMA)[number];

export interface RespostaDaAlma {
  character: CharacterDocument;
  mensagem: string;
}

function exigir<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  if (!r.ok) throw new ErroDeAlma(MENSAGEM_BLOQUEIO_ALMA[(r as unknown as { motivo: MotivoBloqueioAlma }).motivo]);
  return r as Extract<T, { ok: true }>;
}

export async function agirNaAlma(uid: string, acao: unknown, pedido: { id?: unknown; indice?: unknown; ids?: unknown }): Promise<RespostaDaAlma> {
  if (typeof acao !== 'string' || !(ACOES_DA_ALMA as readonly string[]).includes(acao)) throw new ErroDeAlma('Ação desconhecida.');
  const semente = gerarSementeCombate();
  return repositorio.executarTransacao(`alma:${acao}`, async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    if (eu.nivel < NIVEL_DA_ALMA) throw new ErroDeAlma(MENSAGEM_BLOQUEIO_ALMA.nivelInsuficiente);
    const itens = eu.cartasItens ?? [];
    const equipadas = eu.cartasEquipadas ?? [];
    switch (acao as AcaoDaAlma) {
      case 'equipar': {
        const r = exigir(equiparCarta(itens, equipadas, pedido.id));
        return { character: salvarPersonagem(ctx, eu, { cartasEquipadas: r.equipadas }), mensagem: 'Carta equipada.' };
      }
      case 'desequipar': {
        const r = exigir(desequiparCarta(equipadas, pedido.id));
        return { character: salvarPersonagem(ctx, eu, { cartasEquipadas: r.equipadas }), mensagem: 'Carta desequipada.' };
      }
      case 'despertar': {
        const r = exigir(despertarCarta(itens, equipadas, eu.poeiraDeAlma ?? 0, pedido.id));
        const ainda = new Set(r.itens.map((i) => i.id));
        return {
          character: salvarPersonagem(ctx, eu, { cartasItens: r.itens, poeiraDeAlma: r.poeira, cartasEquipadas: equipadas.filter((id) => ainda.has(id)) }),
          mensagem: `Carta despertada: despertar ${['', 'I', 'II', 'III'][r.nivel]}.`,
        };
      }
      case 'refinar': {
        const r = exigir(refinarCarta(itens, eu.cacosDeAlma ?? 0, pedido.id, pedido.indice, sorteadorDaSemente(semente)));
        return { character: salvarPersonagem(ctx, eu, { cartasItens: r.itens, cacosDeAlma: r.cacos }), mensagem: 'Efeito refinado.' };
      }
      case 'destruir': {
        const r = exigir(destruirCartas(itens, equipadas, pedido.ids));
        return {
          character: salvarPersonagem(ctx, eu, { cartasItens: r.itens, cacosDeAlma: (eu.cacosDeAlma ?? 0) + r.cacos }),
          mensagem: `${r.destruidas} ${r.destruidas === 1 ? 'carta destruída' : 'cartas destruídas'}: +${r.cacos} de cacos de alma.`,
        };
      }
    }
  });
}

export type { CartaItem };
