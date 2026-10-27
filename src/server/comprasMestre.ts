import { progressoDoVip, type ProgressoDoVip } from '@/rules/vip';
import type { PedidoDeCompra } from '@/rules/compras';
import { ErroDeCompra, estornarPedido } from '@/server/compras';
import { comRegistro, ErroMestre, exigir, motivoValido, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';

/**
 * Ferramentas do Mestre para as compras (8.5): ver os pedidos e o VIP de um jogador e estornar um pedido pago. Ver é de
 * quem lê jogadores; estornar mexe em Diamantes, então é só de quem ajusta jogadores (o Dono). O motivo é obrigatório e
 * o log é gravado antes do estorno.
 */

const UID_VALIDO = /^[a-zA-Z0-9_-]{1,128}$/;
const uidValido = (uid: unknown): string => {
  if (typeof uid !== 'string' || !UID_VALIDO.test(uid)) throw new ErroMestre(400, 'Escolha o jogador.');
  return uid;
};

export interface ComprasDoJogador {
  uid: string;
  nome: string;
  vip: ProgressoDoVip;
  diamantes: number;
  dividaDeDiamantes: number;
  pedidos: PedidoDeCompra[];
}

export async function comprasDoJogadorNoPainel(sessao: SessaoMestre, uidBruto: unknown): Promise<ComprasDoJogador> {
  exigir(sessao, 'jogadores.ler');
  const uid = uidValido(uidBruto);
  const c = await repositorio.lerPersonagem(uid);
  if (!c) throw new ErroMestre(404, 'Nenhum jogador com esse identificador.');
  return { uid, nome: c.nome, vip: progressoDoVip(c.gastoReal), diamantes: c.diamantes ?? 0, dividaDeDiamantes: c.dividaDeDiamantes ?? 0, pedidos: [...(c.pedidosDeCompra ?? [])].reverse() };
}

export async function estornarComoMestre(sessao: SessaoMestre, pedido: { uid?: unknown; pedido?: unknown; motivo?: unknown }, ip?: string): Promise<{ mensagem: string }> {
  exigir(sessao, 'jogadores.ajustar');
  const uid = uidValido(pedido.uid);
  const motivo = motivoValido(pedido.motivo);
  if (typeof pedido.pedido !== 'string' || !pedido.pedido) throw new ErroMestre(400, 'Escolha o pedido.');
  const id = pedido.pedido;
  const antes = (await repositorio.lerPersonagem(uid))?.pedidosDeCompra?.find((p) => p.id === id);
  if (!antes) throw new ErroMestre(404, 'Pedido não encontrado.');
  try {
    const r = await comRegistro(sessao, { acao: 'compra.estornar', alvo: uid, antes: { pedido: id, estado: antes.estado, valorCentavos: antes.valorCentavos, diamantes: antes.diamantes ?? 0 }, depois: { estado: 'estornado' }, motivo, ip }, () => estornarPedido(uid, id));
    if (r.jaEstavaEstornado) return { mensagem: 'Esse pedido já estava estornado.' };
    return { mensagem: `Pedido estornado.${r.dividaGerada ? ` O jogador já tinha gasto ${r.dividaGerada.toLocaleString('pt-BR')} Diamantes: ficam como dívida e bloqueiam novas compras até serem cobertos.` : ''}${r.naoRecuperado.length ? ` Não deu para retirar o que já foi gasto: ${r.naoRecuperado.join(', ')}.` : ''}` };
  } catch (error) {
    if (error instanceof ErroDeCompra) throw new ErroMestre(400, error.message);
    throw error;
  }
}
