/**
 * Idempotência das compras (P2 de segurança): quando um pedido de compra, do Mercado ou da Loja VIP dá timeout, a transação pode ter gravado mesmo
 * assim, e o jogador toca de novo. Com uma `idempotencyKey` (um texto único por toque, que a tela gera), o servidor guarda o resultado no próprio
 * personagem, na MESMA gravação da compra (uma só transação), e quem repete a mesma chave recebe o resultado de antes, sem comprar de novo.
 * Sem chave, tudo funciona como antes. Ficam as últimas 20 chaves das últimas 24 horas.
 */
export interface ChaveGuardada {
  chave: string;
  /** A ação em que a chave foi usada ("loja", "mercado:comprar"...). */
  acao: string;
  em: string;
  /** O resultado da ação, em JSON. */
  resposta: string;
}

export const FORMATO_DA_CHAVE = /^[A-Za-z0-9_-]{8,64}$/;
export const MAXIMO_DE_CHAVES = 20;
export const VALIDADE_DAS_CHAVES_MS = 24 * 60 * 60 * 1000;
export const TAMANHO_MAXIMO_DA_RESPOSTA = 4000;

export class ErroDeChave extends Error {
  constructor(
    mensagem: string,
    readonly status: 400 | 409 = 400
  ) {
    super(mensagem);
    this.name = 'ErroDeChave';
  }
}

/** A chave que veio no pedido: null se não veio; erro 400 se veio num formato inválido. */
export function lerChave(bruta: unknown): string | null {
  if (bruta === undefined || bruta === null || bruta === '') return null;
  if (typeof bruta !== 'string' || !FORMATO_DA_CHAVE.test(bruta)) throw new ErroDeChave('A chave de repetição é inválida (de 8 a 64 letras, números, "_" ou "-").');
  return bruta;
}

const valida = (c: ChaveGuardada, agora: Date) => agora.getTime() - Date.parse(c.em) < VALIDADE_DAS_CHAVES_MS;

/**
 * O resultado guardado desta chave, se a ação já foi feita (devolve o mesmo resultado, sem repetir). Chave usada antes em outra ação é um erro
 * 409: a tela deve gerar uma chave nova a cada toque.
 */
export function resultadoGuardado<T>(lista: readonly ChaveGuardada[] | undefined, chave: string | null, acao: string, agora: Date): T | null {
  if (!chave) return null;
  const c = (lista ?? []).find((x) => x.chave === chave && valida(x, agora));
  if (!c) return null;
  if (c.acao !== acao) throw new ErroDeChave('Essa chave de repetição já foi usada em outra ação.', 409);
  try {
    return JSON.parse(c.resposta) as T;
  } catch {
    return null;
  }
}

/** A lista nova, para ir na mesma gravação da ação. Sem chave, não muda nada (devolve undefined: o campo não entra no patch). */
export function guardarResultado(lista: readonly ChaveGuardada[] | undefined, chave: string | null, acao: string, resposta: unknown, agora: Date): { idempotencia: ChaveGuardada[] } | Record<string, never> {
  if (!chave) return {};
  const texto = JSON.stringify(resposta);
  const guardada: ChaveGuardada = { chave, acao, em: agora.toISOString(), resposta: texto.length <= TAMANHO_MAXIMO_DA_RESPOSTA ? texto : JSON.stringify({ mensagem: 'Feito.' }) };
  return { idempotencia: [...(lista ?? []).filter((x) => valida(x, agora) && x.chave !== chave), guardada].slice(-MAXIMO_DE_CHAVES) };
}

/** Lê a lista do documento (descarta o que não tem o formato). */
export function idempotenciaDoDocumento(bruto: unknown): ChaveGuardada[] | undefined {
  if (!Array.isArray(bruto)) return undefined;
  const lista = bruto.flatMap((c): ChaveGuardada[] => {
    const o = c as Partial<ChaveGuardada> | null;
    return o && typeof o.chave === 'string' && FORMATO_DA_CHAVE.test(o.chave) && typeof o.acao === 'string' && typeof o.em === 'string' && typeof o.resposta === 'string' && o.resposta.length <= TAMANHO_MAXIMO_DA_RESPOSTA ? [{ chave: o.chave, acao: o.acao, em: o.em, resposta: o.resposta }] : [];
  });
  return lista.length ? lista.slice(-MAXIMO_DE_CHAVES) : undefined;
}
