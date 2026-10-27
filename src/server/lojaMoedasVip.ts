import { randomUUID } from 'node:crypto';
import { mesDeBrasilia } from '@/rules/loja';
import { compradasNaLojaVip, itemDaLojaVip } from '@/rules/lojaMoedasVip';
import type { BauDeEscolha } from '@/rules/arenaRanqueada';
import { carregarPersonagem, salvarPersonagem } from '@/server/characterService';
import { ErroDeCompra } from '@/server/compras';
import { repositorio } from '@/server/persistencia';
import { exigirSistemaLigado } from '@/server/sistemasLeitura';

/**
 * Loja de Moedas VIP (8.5): troca Moedas VIP (que vêm dos Passes) por baús de escolha e materiais de mundo. Cada compra é
 * uma transação só no personagem: tira as moedas, entrega e conta o limite do mês.
 */

const QUANTIDADE_MAXIMA_POR_COMPRA = 100;
/** Os baús de escolha guardados no personagem não passam de 20 (é o que o documento lê). */
const BAUS_MAXIMOS = 20;

export async function comprarComMoedasVip(uid: string, chaveBruta: unknown, quantidadeBruta: unknown, agora = new Date()): Promise<{ mensagem: string }> {
  await exigirSistemaLigado(uid, 'lojaVip');
  const item = itemDaLojaVip(chaveBruta);
  if (!item) throw new ErroDeCompra('Esse item não está na Loja de Moedas VIP.');
  const quantidade = typeof quantidadeBruta === 'number' && Number.isInteger(quantidadeBruta) ? quantidadeBruta : 0;
  if (quantidade < 1 || quantidade > QUANTIDADE_MAXIMA_POR_COMPRA) throw new ErroDeCompra('Quantidade inválida.');
  return repositorio.executarTransacao('loja:moedasVip', async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    const comprados = compradasNaLojaVip(eu.comprasMoedasVip, item.chave, agora);
    if (comprados + quantidade > item.limiteMensal) {
      const resta = Math.max(0, item.limiteMensal - comprados);
      throw new ErroDeCompra(resta ? `Você só pode comprar mais ${resta} deste item neste mês.` : 'Você já comprou o limite deste item neste mês. O limite zera no dia 1.');
    }
    const total = item.preco * quantidade;
    if ((eu.moedasVip ?? 0) < total) throw new ErroDeCompra('Moedas VIP insuficientes.');
    const mes = mesDeBrasilia(agora);
    const anteriores = eu.comprasMoedasVip?.mes === mes ? eu.comprasMoedasVip.itens : {};
    const patch: Record<string, unknown> = {
      moedasVip: eu.moedasVip! - total || undefined,
      comprasMoedasVip: { mes, itens: { ...anteriores, [item.chave]: comprados + quantidade } },
    };
    if (item.tipo === 'material') {
      patch.inventario = { ...(eu.inventario ?? {}), [item.id]: (eu.inventario?.[item.id] ?? 0) + quantidade };
    } else {
      const baus = eu.bausDeEscolha ?? [];
      if (baus.length + quantidade > BAUS_MAXIMOS) throw new ErroDeCompra('Você tem baús de escolha demais fechados. Abra alguns antes de comprar mais.');
      const tipo: BauDeEscolha['tipo'] = item.tipo === 'bauEmblemaLendario' ? 'emblemaLendario' : 'cartaLendariaVip';
      const novos: BauDeEscolha[] = Array.from({ length: quantidade }, () => ({ id: `bau-${randomUUID()}`, tipo, origem: 'Loja de Moedas VIP', em: agora.toISOString() }));
      patch.bausDeEscolha = [...baus, ...novos];
    }
    salvarPersonagem(ctx, eu, patch);
    const rotulo = `${quantidade > 1 ? `${quantidade}× ` : ''}${item.nome}`;
    return { mensagem: `Você comprou ${rotulo} por ${total.toLocaleString('pt-BR')} Moedas VIP.${item.tipo === 'material' ? '' : ' Abra o baú na aba VIP para escolher.'}` };
  });
}
