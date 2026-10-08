import { NextResponse } from 'next/server';

/**
 * Limitador de taxa em janela deslizante, em memória (0.5-A3).
 *
 * Limitação conhecida: o contador vive em cada instância do servidor. Isso já barra
 * abuso simples e martelar de API; o limite global entre instâncias (e a proteção de
 * cadastro/login, que ficam no Firebase Auth) entram na Etapa 6.5.
 */
interface Janela {
  marcas: number[];
}

const janelas = new Map<string, Janela>();
const LIMPEZA_A_CADA = 500;
let chamadas = 0;

export interface RegraLimite {
  /** Máximo de requisições na janela. */
  max: number;
  /** Tamanho da janela em ms. */
  janelaMs: number;
}

export interface ResultadoLimite {
  permitido: boolean;
  retryAfterSegundos: number;
}

export function verificarLimite(chave: string, regra: RegraLimite, agora = Date.now()): ResultadoLimite {
  if (++chamadas % LIMPEZA_A_CADA === 0) {
    for (const [k, j] of janelas) {
      if (j.marcas.every((m) => agora - m > 3_600_000)) janelas.delete(k);
    }
  }

  const j = janelas.get(chave) ?? { marcas: [] };
  j.marcas = j.marcas.filter((m) => agora - m < regra.janelaMs);

  if (j.marcas.length >= regra.max) {
    janelas.set(chave, j);
    const maisAntiga = j.marcas[0];
    return {
      permitido: false,
      retryAfterSegundos: Math.max(1, Math.ceil((maisAntiga + regra.janelaMs - agora) / 1000)),
    };
  }

  j.marcas.push(agora);
  janelas.set(chave, j);
  return { permitido: true, retryAfterSegundos: 0 };
}

/** Regra padrão para rotas que escrevem: por conta e por IP. */
export const LIMITE_ESCRITA: RegraLimite = { max: 30, janelaMs: 60_000 };
export const LIMITE_POR_IP: RegraLimite = { max: 120, janelaMs: 60_000 };

export function ipDaRequisicao(req: Request): string {
  const encaminhado = req.headers.get('x-forwarded-for');
  if (encaminhado) return encaminhado.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'desconhecido';
}

/**
 * Retorna uma resposta 429 se a conta ou o IP passaram do limite; senão `null`.
 */
export function limitarEscrita(req: Request, uid: string, rota: string): NextResponse | null {
  // Os testes de rota chamam a mesma conta muitas vezes; o limitador é testado direto.
  if (process.env.VITEST || process.env.NODE_ENV === 'test') return null;
  const porConta = verificarLimite(`${rota}:uid:${uid}`, LIMITE_ESCRITA);
  const porIp = verificarLimite(`${rota}:ip:${ipDaRequisicao(req)}`, LIMITE_POR_IP);
  if (porConta.permitido && porIp.permitido) return null;

  const espera = Math.max(porConta.retryAfterSegundos, porIp.retryAfterSegundos);
  return NextResponse.json(
    { error: 'Muitas requisições. Aguarde alguns instantes e tente novamente.' },
    { status: 429, headers: { 'Retry-After': String(espera) } }
  );
}

export function resetarLimitesParaTeste(): void {
  janelas.clear();
}
