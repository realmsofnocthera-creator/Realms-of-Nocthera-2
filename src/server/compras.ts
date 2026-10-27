import { randomUUID } from 'node:crypto';
import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import {
  diamantesDoPacote,
  PACOTES_DE_DIAMANTES,
  pacoteDeDiamantes,
  PEDIDOS_ABERTOS_MAXIMOS,
  PEDIDOS_GUARDADOS,
  type PacoteDeDiamantes,
  type PedidoDeCompra,
  MULTIPLICADOR_DA_PRIMEIRA_COMPRA,
} from '@/rules/compras';
import { bonusDoVip, definicaoDoVip, NIVEIS_DO_VIP, OURO_DIARIO_DO_VIP, progressoDoVip, type NivelDoVip } from '@/rules/vip';
import { alterarSaldoEm, carregarPersonagem, salvarPersonagem, type CharacterDocument } from '@/server/characterService';
import { comMensagem, novaMensagem } from '@/server/correio';
import { repositorio, type ContextoTransacao } from '@/server/persistencia';
import { exigirSistemaLigado } from '@/server/sistemasLeitura';

/**
 * Compras com dinheiro real (8.5). O pedido mora no personagem e cada passo é uma transação só nele: criar o pedido,
 * confirmar o pagamento (entrega os Diamantes, soma ao gasto do VIP e ao recibo) e estornar (tira o que entregou e
 * desconta do gasto). Confirmar e estornar são idempotentes: o aviso do provedor pode chegar mais de uma vez.
 *
 * O único provedor é o de teste, que só funciona com PAGAMENTOS_MODO=teste no ambiente. Sem isso nada pode ser
 * comprado, em produção ou em qualquer outro lugar. Os dados do provedor real (e a chave secreta) nunca ficam no código.
 */

export class ErroDeCompra extends Error {
  readonly status = 400;
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeCompra';
  }
}

export const pagamentosDeTesteLigados = () => process.env.PAGAMENTOS_MODO === 'teste';

const reais = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export interface PacoteNaTela extends PacoteDeDiamantes {
  /** O que o jogador recebe se comprar agora (já com a primeira compra em dobro). */
  total: number;
}

export interface NivelNaTela extends NivelDoVip {
  atual: boolean;
  desbloqueado: boolean;
}

export interface EstadoDaLojaVip {
  /** O Dono ligou a Loja VIP no Painel. */
  aberta: boolean;
  /** Existe um provedor de pagamento ligado (por ora, só o de teste). */
  podeComprar: boolean;
  provedor: 'teste' | null;
  diamantes: number;
  dividaDeDiamantes: number;
  primeiraCompra: boolean;
  multiplicadorDaPrimeiraCompra: number;
  vip: ReturnType<typeof progressoDoVip> & { bonus: { xp: number; ouro: number }; ouroDiario: number };
  niveis: NivelNaTela[];
  pacotes: PacoteNaTela[];
  pedidos: PedidoDeCompra[];
}

export async function estadoDaLojaVip(uid: string): Promise<EstadoDaLojaVip> {
  const c = await repositorio.lerPersonagem(uid);
  if (!c) throw new Error('Personagem não encontrado.');
  const { lerConfiguracaoDeSistemas } = await import('@/server/sistemasLeitura');
  const config = await lerConfiguracaoDeSistemas();
  const progresso = progressoDoVip(c.gastoReal);
  const primeiraCompra = !c.primeiraCompraFeita;
  return {
    aberta: config.sistemas.lojaVip.ativo,
    podeComprar: pagamentosDeTesteLigados(),
    provedor: pagamentosDeTesteLigados() ? 'teste' : null,
    diamantes: c.diamantes ?? 0,
    dividaDeDiamantes: c.dividaDeDiamantes ?? 0,
    primeiraCompra,
    multiplicadorDaPrimeiraCompra: MULTIPLICADOR_DA_PRIMEIRA_COMPRA,
    vip: { ...progresso, bonus: bonusDoVip(c.gastoReal), ouroDiario: definicaoDoVip(progresso.nivel).ouroDiario },
    niveis: NIVEIS_DO_VIP.map((n) => ({ ...n, atual: n.nivel === progresso.nivel, desbloqueado: n.nivel <= progresso.nivel })),
    pacotes: PACOTES_DE_DIAMANTES.map((p) => ({ ...p, total: diamantesDoPacote(p, primeiraCompra) })),
    pedidos: [...(c.pedidosDeCompra ?? [])].reverse().slice(0, 20),
  };
}

/** Quita a dívida de estorno com os Diamantes que o jogador tem agora. */
function quitarDivida(ctx: ContextoTransacao, c: CharacterDocument): CharacterDocument {
  const divida = c.dividaDeDiamantes ?? 0;
  const pago = Math.min(divida, c.diamantes ?? 0);
  if (!divida || !pago) return c;
  const doc = alterarSaldoEm(ctx, c, 'diamantes', -pago, 'Estorno de compra: Diamantes já gastos').character;
  return { ...doc, dividaDeDiamantes: divida - pago || undefined };
}

const grava = (ctx: ContextoTransacao, c: CharacterDocument, pedidos: PedidoDeCompra[], extra: Partial<CharacterDocument> = {}) =>
  salvarPersonagem(ctx, c, { ...extra, diamantes: c.diamantes, dividaDeDiamantes: extra.dividaDeDiamantes ?? c.dividaDeDiamantes, pedidosDeCompra: pedidos.slice(-PEDIDOS_GUARDADOS) });

/** Cria o pedido (estado "criado"). O pagamento só vale quando o provedor confirmar. */
export async function criarPedido(uid: string, produtoBruto: unknown, agora = new Date()): Promise<PedidoDeCompra> {
  await exigirSistemaLigado(uid, 'lojaVip');
  if (!pagamentosDeTesteLigados()) throw new ErroDeCompra('As compras ainda não estão disponíveis.');
  const produto = pacoteDeDiamantes(produtoBruto);
  if (!produto) throw new ErroDeCompra('Esse produto não existe.');
  const resultado = await repositorio.executarTransacao('compra:criar', async (ctx): Promise<PedidoDeCompra | number> => {
    let eu = await carregarPersonagem(ctx, uid);
    eu = quitarDivida(ctx, eu);
    if (eu.dividaDeDiamantes) {
      // grava o que a cobrança já tirou; o erro sai depois da transação (lançá-lo aqui desfaria a cobrança)
      grava(ctx, eu, eu.pedidosDeCompra ?? []);
      return eu.dividaDeDiamantes;
    }
    const pedido: PedidoDeCompra = { id: `ped_${randomUUID()}`, produto: produto.id, nome: `Pacote ${produto.nome} (Diamantes)`, valorCentavos: produto.precoCentavos, estado: 'criado', provedor: 'teste', criadoEm: agora.toISOString() };
    // no máximo 5 pedidos abertos: os mais antigos viram "cancelado"
    const abertos = (eu.pedidosDeCompra ?? []).filter((p) => p.estado === 'criado');
    const cancelar = new Set(abertos.slice(0, Math.max(0, abertos.length + 1 - PEDIDOS_ABERTOS_MAXIMOS)).map((p) => p.id));
    const pedidos = [...(eu.pedidosDeCompra ?? []).map((p) => (cancelar.has(p.id) ? { ...p, estado: 'cancelado' as const } : p)), pedido];
    grava(ctx, eu, pedidos);
    return pedido;
  });
  if (typeof resultado === 'number') throw new ErroDeCompra(`Compras bloqueadas: há um estorno de ${resultado.toLocaleString('pt-BR')} Diamantes ainda não coberto. Ele é cobrado dos Diamantes que você ganhar.`);
  return resultado;
}

/**
 * Confirma o pagamento de um pedido: entrega os Diamantes (o dobro na primeira compra da conta), soma o valor ao gasto
 * do VIP e guarda o recibo. Confirmar de novo um pedido já pago não faz nada.
 */
export async function confirmarPagamento(uid: string, pedidoId: unknown, referencia: string, agora = new Date()): Promise<{ pedido: PedidoDeCompra; jaEstavaPago: boolean }> {
  if (typeof pedidoId !== 'string' || !pedidoId) throw new ErroDeCompra('Pedido inválido.');
  return repositorio.executarTransacao('compra:pagar', async (ctx) => {
    let eu = await carregarPersonagem(ctx, uid);
    const pedidos = eu.pedidosDeCompra ?? [];
    const pedido = pedidos.find((p) => p.id === pedidoId);
    if (!pedido) throw new ErroDeCompra('Pedido não encontrado.');
    if (pedido.estado === 'pago') return { pedido, jaEstavaPago: true };
    if (pedido.estado === 'estornado') throw new ErroDeCompra('Esse pedido foi estornado.');
    if (pedido.estado === 'cancelado') throw new ErroDeCompra('Esse pedido foi cancelado.');
    const produto = pacoteDeDiamantes(pedido.produto);
    if (!produto) throw new ErroDeCompra('O produto desse pedido não existe mais.');
    const diamantes = diamantesDoPacote(produto, !eu.primeiraCompraFeita);
    eu = alterarSaldoEm(ctx, eu, 'diamantes', diamantes, `Compra: ${pedido.nome}${eu.primeiraCompraFeita ? '' : ' (primeira compra em dobro)'}`).character;
    eu = quitarDivida(ctx, eu);
    const pago: PedidoDeCompra = { ...pedido, estado: 'pago', referencia: referencia.slice(0, 128), pagoEm: agora.toISOString(), diamantes };
    const correio = comMensagem(
      eu.correio,
      novaMensagem({ titulo: 'Compra confirmada', texto: `${pedido.nome}: ${diamantes.toLocaleString('pt-BR')} Diamantes entregues (${reais(pedido.valorCentavos)}). Obrigado por apoiar o jogo!`, de: 'Loja VIP' }, agora),
      agora
    );
    grava(
      ctx,
      eu,
      pedidos.map((p) => (p.id === pedido.id ? pago : p)),
      { gastoReal: (eu.gastoReal ?? 0) + pedido.valorCentavos, primeiraCompraFeita: true, correio }
    );
    return { pedido: pago, jaEstavaPago: false };
  });
}

/**
 * Estorno: o pedido deixa de contar no gasto do VIP (o nível é recalculado) e os Diamantes entregues são tirados.
 * O que o jogador já gastou vira dívida: bloqueia novas compras e é cobrada dos próximos Diamantes. A "primeira
 * compra em dobro" continua gasta. Estornar de novo um pedido já estornado não faz nada.
 */
export async function estornarPedido(uid: string, pedidoId: unknown, agora = new Date()): Promise<{ pedido: PedidoDeCompra; jaEstavaEstornado: boolean; dividaGerada: number }> {
  if (typeof pedidoId !== 'string' || !pedidoId) throw new ErroDeCompra('Pedido inválido.');
  return repositorio.executarTransacao('compra:estornar', async (ctx) => {
    let eu = await carregarPersonagem(ctx, uid);
    const pedidos = eu.pedidosDeCompra ?? [];
    const pedido = pedidos.find((p) => p.id === pedidoId);
    if (!pedido) throw new ErroDeCompra('Pedido não encontrado.');
    if (pedido.estado === 'estornado') return { pedido, jaEstavaEstornado: true, dividaGerada: 0 };
    if (pedido.estado !== 'pago') throw new ErroDeCompra('Só um pedido pago pode ser estornado.');
    const entregues = pedido.diamantes ?? 0;
    const tira = Math.min(entregues, eu.diamantes ?? 0);
    if (tira) eu = alterarSaldoEm(ctx, eu, 'diamantes', -tira, `Estorno: ${pedido.nome}`).character;
    const dividaGerada = entregues - tira;
    const estornado: PedidoDeCompra = { ...pedido, estado: 'estornado', estornadoEm: agora.toISOString() };
    const correio = comMensagem(
      eu.correio,
      novaMensagem({ titulo: 'Compra estornada', texto: `${pedido.nome} foi estornado. Os Diamantes dessa compra foram retirados e o valor deixou de contar no seu VIP.`, de: 'Loja VIP' }, agora),
      agora
    );
    grava(
      ctx,
      eu,
      pedidos.map((p) => (p.id === pedido.id ? estornado : p)),
      { gastoReal: Math.max(0, (eu.gastoReal ?? 0) - pedido.valorCentavos) || undefined, dividaDeDiamantes: (eu.dividaDeDiamantes ?? 0) + dividaGerada || undefined, correio }
    );
    return { pedido: estornado, jaEstavaEstornado: false, dividaGerada };
  });
}

/** Compra no provedor de teste: cria o pedido e confirma o pagamento na hora. */
export async function comprarNoTeste(uid: string, produto: unknown, agora = new Date()): Promise<{ mensagem: string }> {
  const pedido = await criarPedido(uid, produto, agora);
  const { pedido: pago } = await confirmarPagamento(uid, pedido.id, `teste_${pedido.id}`, agora);
  return { mensagem: `Compra de teste confirmada: ${pago.diamantes?.toLocaleString('pt-BR')} Diamantes entregues.` };
}

/**
 * Ouro diário do VIP (do nível 1 em diante): uma mensagem com 500 de ouro por dia de Brasília, entregue quando o
 * jogador abre o Correio. Dias em que o jogador não abriu o jogo não se acumulam.
 */
export async function mandarOuroDoVip(uid: string, agora = new Date()): Promise<void> {
  const char = await repositorio.lerPersonagem(uid);
  const hoje = diaDeBrasilia(agora);
  if (!char || char.vipOuroDiario === hoje || progressoDoVip(char.gastoReal).nivel < 1) return;
  await repositorio.executarTransacao('correio:vip', async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    if (eu.vipOuroDiario === hoje || progressoDoVip(eu.gastoReal).nivel < 1) return;
    const nivel = definicaoDoVip(progressoDoVip(eu.gastoReal).nivel);
    const correio = comMensagem(
      eu.correio,
      novaMensagem({ titulo: `Recompensa diária VIP ${nivel.nivel}`, texto: `Sua recompensa diária de VIP (${nivel.nome}) chegou.`, de: 'Loja VIP', presente: { ouro: OURO_DIARIO_DO_VIP } }, agora),
      agora
    );
    salvarPersonagem(ctx, eu, { correio, vipOuroDiario: hoje });
  });
}
