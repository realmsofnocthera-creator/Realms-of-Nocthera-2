import { NextRequest, NextResponse } from 'next/server';
import { registrarLog } from './log';

/**
 * Rate limiting (0.5-A3) por IP e por conta, com bloqueio progressivo.
 *
 * Primeira camada, em memória: vale por instância do servidor. Com várias instâncias,
 * cada uma conta separadamente (o limite efetivo multiplica pelo número de instâncias).
 * O Firebase Auth já limita login, cadastro e recuperação de senha do lado do Google.
 */

export interface RegraLimite {
  /** Requisições permitidas por janela. */
  limite: number;
  janelaMs: number;
}

interface EstadoChave {
  inicioJanela: number;
  contagem: number;
  bloqueadoAte: number;
  infracoes: number;
  ultimaInfracao: number;
}

export interface ResultadoLimite {
  permitido: boolean;
  /** Segundos até poder tentar de novo (só quando bloqueado). */
  retryAfterSegundos: number;
}

const BLOQUEIO_BASE_MS = 30_000;
const BLOQUEIO_MAXIMO_MS = 15 * 60_000;
const PERDAO_INFRACOES_MS = 60 * 60_000;
const MAX_CHAVES = 50_000;

export function criarLimitador() {
  const estados = new Map<string, EstadoChave>();

  function limpar(agora: number) {
    if (estados.size < MAX_CHAVES) return;
    for (const [chave, e] of estados) {
      if (e.bloqueadoAte < agora && agora - e.inicioJanela > PERDAO_INFRACOES_MS) {
        estados.delete(chave);
      }
    }
  }

  return {
    verificar(chave: string, regra: RegraLimite, agora = Date.now()): ResultadoLimite {
      limpar(agora);
      let e = estados.get(chave);
      if (!e) {
        e = { inicioJanela: agora, contagem: 0, bloqueadoAte: 0, infracoes: 0, ultimaInfracao: 0 };
        estados.set(chave, e);
      }

      if (e.bloqueadoAte > agora) {
        return { permitido: false, retryAfterSegundos: Math.ceil((e.bloqueadoAte - agora) / 1000) };
      }

      if (e.infracoes > 0 && agora - e.ultimaInfracao > PERDAO_INFRACOES_MS) {
        e.infracoes = 0;
      }

      if (agora - e.inicioJanela >= regra.janelaMs) {
        e.inicioJanela = agora;
        e.contagem = 0;
      }

      e.contagem += 1;
      if (e.contagem <= regra.limite) {
        return { permitido: true, retryAfterSegundos: 0 };
      }

      // Estourou: bloqueio dobra a cada infração (30 s, 1 min, 2 min... até 15 min)
      e.infracoes += 1;
      e.ultimaInfracao = agora;
      const bloqueio = Math.min(BLOQUEIO_BASE_MS * 2 ** (e.infracoes - 1), BLOQUEIO_MAXIMO_MS);
      e.bloqueadoAte = agora + bloqueio;
      e.inicioJanela = agora;
      e.contagem = 0;
      return { permitido: false, retryAfterSegundos: Math.ceil(bloqueio / 1000) };
    },
  };
}

export type GrupoLimite = 'escrita' | 'combate' | 'leitura';

const REGRAS: Record<GrupoLimite, { porIp: RegraLimite; porConta: RegraLimite }> = {
  escrita: {
    porIp: { limite: 120, janelaMs: 60_000 },
    porConta: { limite: 30, janelaMs: 60_000 },
  },
  // Só contra abuso/automação: não é limite de jogo (decisão 0.5-B2: batalhas sem limite)
  combate: {
    porIp: { limite: 300, janelaMs: 60_000 },
    porConta: { limite: 120, janelaMs: 60_000 },
  },
  leitura: {
    porIp: { limite: 300, janelaMs: 60_000 },
    porConta: { limite: 120, janelaMs: 60_000 },
  },
};

const limitador = criarLimitador();

function ipDaRequisicao(req: NextRequest): string {
  const encaminhado = req.headers.get('x-forwarded-for');
  if (encaminhado) {
    return encaminhado.split(',')[0].trim() || 'desconhecido';
  }
  return req.headers.get('x-real-ip') || 'desconhecido';
}

function resposta429(retryAfterSegundos: number): NextResponse {
  return NextResponse.json(
    { error: 'Muitas requisições seguidas. Aguarde um pouco e tente novamente.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSegundos) } }
  );
}

/** Limite por IP: chamar antes da autenticação. Retorna a resposta 429 ou null. */
export function limitarPorIp(req: NextRequest, grupo: GrupoLimite): NextResponse | null {
  const ip = ipDaRequisicao(req);
  const r = limitador.verificar(`ip:${grupo}:${ip}`, REGRAS[grupo].porIp);
  if (r.permitido) return null;
  registrarLog('WARNING', 'rate_limit.ip', { grupo, ip, retryAfterSegundos: r.retryAfterSegundos });
  return resposta429(r.retryAfterSegundos);
}

/** Limite por conta: chamar logo depois de autenticar. Retorna a resposta 429 ou null. */
export function limitarPorConta(uid: string, grupo: GrupoLimite): NextResponse | null {
  const r = limitador.verificar(`uid:${grupo}:${uid}`, REGRAS[grupo].porConta);
  if (r.permitido) return null;
  registrarLog('WARNING', 'rate_limit.conta', { grupo, uid, retryAfterSegundos: r.retryAfterSegundos });
  return resposta429(r.retryAfterSegundos);
}
