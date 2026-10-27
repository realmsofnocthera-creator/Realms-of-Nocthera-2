/**
 * Compras com dinheiro real (8.5, decididas pelo Yuri em 27/10/2026). Esta fase tem o núcleo: o catálogo, o pedido com
 * estados (criado, pago, estornado, cancelado), a entrega e o estorno. O provedor de pagamento é um só, o de teste;
 * ligar um provedor real depois é trocar essa peça. Os valores em reais são guardados em centavos (inteiros).
 *
 * Os pacotes de Diamantes abaixo são a tabela PROPOSTA pelo Claude (valor por real sempre crescendo); a tabela só vale
 * depois que o Yuri confirmar, e a Loja VIP nasce desligada no Painel do Mestre.
 */

export type EstadoDoPedido = 'criado' | 'pago' | 'estornado' | 'cancelado';

export const PROVEDORES = ['teste'] as const;
export type ProvedorDePagamento = (typeof PROVEDORES)[number];

export interface PacoteDeDiamantes {
  id: string;
  nome: string;
  precoCentavos: number;
  base: number;
  bonus: number;
}

export const PACOTES_DE_DIAMANTES: readonly PacoteDeDiamantes[] = [
  { id: 'diamantes-1', nome: 'Pequeno', precoCentavos: 499, base: 100, bonus: 0 },
  { id: 'diamantes-2', nome: 'Básico', precoCentavos: 999, base: 200, bonus: 20 },
  { id: 'diamantes-3', nome: 'Médio', precoCentavos: 1_999, base: 400, bonus: 80 },
  { id: 'diamantes-4', nome: 'Grande', precoCentavos: 3_499, base: 800, bonus: 100 },
  { id: 'diamantes-5', nome: 'Premium', precoCentavos: 5_999, base: 1_500, bonus: 200 },
  { id: 'diamantes-6', nome: 'Supremo', precoCentavos: 9_999, base: 2_500, bonus: 500 },
];

export const pacoteDeDiamantes = (id: unknown) => PACOTES_DE_DIAMANTES.find((p) => p.id === id);

/** A primeira compra de Diamantes da conta vale o dobro (base e bônus). */
export const MULTIPLICADOR_DA_PRIMEIRA_COMPRA = 2;

export const diamantesDoPacote = (p: PacoteDeDiamantes, primeiraCompra: boolean) => (p.base + p.bonus) * (primeiraCompra ? MULTIPLICADOR_DA_PRIMEIRA_COMPRA : 1);

/** Pedidos guardados no personagem (os mais antigos saem primeiro; o gasto acumulado fica à parte). */
export const PEDIDOS_GUARDADOS = 100;
/** Pedidos "criado" ao mesmo tempo (os mais antigos viram "cancelado"). */
export const PEDIDOS_ABERTOS_MAXIMOS = 5;

export interface PedidoDeCompra {
  id: string;
  /** O id do produto do catálogo. */
  produto: string;
  nome: string;
  valorCentavos: number;
  estado: EstadoDoPedido;
  provedor: ProvedorDePagamento;
  criadoEm: string;
  /** Código do pagamento no provedor (o recibo). */
  referencia?: string;
  pagoEm?: string;
  estornadoEm?: string;
  /** O que o pedido entregou, para o estorno desfazer. */
  diamantes?: number;
}

const ESTADOS: readonly EstadoDoPedido[] = ['criado', 'pago', 'estornado', 'cancelado'];
const inteiroPositivo = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : 0);
const texto = (v: unknown, max: number) => (typeof v === 'string' && v ? v.slice(0, max) : undefined);

/** Lê os pedidos gravados, descartando o que está quebrado. */
export function pedidosDoDocumento(bruto: unknown): PedidoDeCompra[] | undefined {
  if (!Array.isArray(bruto)) return undefined;
  const vistos = new Set<string>();
  const lista: PedidoDeCompra[] = [];
  for (const item of bruto) {
    const o = item as Record<string, unknown> | null;
    if (!o || typeof o !== 'object') continue;
    const id = texto(o.id, 64);
    const produto = texto(o.produto, 64);
    const nome = texto(o.nome, 80);
    const criadoEm = texto(o.criadoEm, 40);
    const valorCentavos = inteiroPositivo(o.valorCentavos);
    if (!id || vistos.has(id) || !produto || !nome || !criadoEm || !valorCentavos) continue;
    if (!ESTADOS.includes(o.estado as EstadoDoPedido) || !PROVEDORES.includes(o.provedor as ProvedorDePagamento)) continue;
    vistos.add(id);
    const diamantes = inteiroPositivo(o.diamantes);
    lista.push({
      id,
      produto,
      nome,
      valorCentavos,
      estado: o.estado as EstadoDoPedido,
      provedor: o.provedor as ProvedorDePagamento,
      criadoEm,
      ...(texto(o.referencia, 128) ? { referencia: texto(o.referencia, 128) } : {}),
      ...(texto(o.pagoEm, 40) ? { pagoEm: texto(o.pagoEm, 40) } : {}),
      ...(texto(o.estornadoEm, 40) ? { estornadoEm: texto(o.estornadoEm, 40) } : {}),
      ...(diamantes ? { diamantes } : {}),
    });
  }
  return lista.length ? lista.slice(-PEDIDOS_GUARDADOS) : undefined;
}

