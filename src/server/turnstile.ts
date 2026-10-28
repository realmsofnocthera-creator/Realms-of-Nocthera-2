import { descreverErro, registrarLog } from '@/server/log';

/**
 * Anti-bot na criação do personagem (6.5-5, decisão do Yuri em 24/10/2026): Cloudflare Turnstile, grátis e sem
 * limite de verificações. Uma conta sem personagem não faz nada no jogo, então é ali que o robô é barrado.
 *
 * Liga sozinho quando o Cloud Run tem TURNSTILE_SECRET_KEY (a chave secreta, nunca no código) e TURNSTILE_SITE_KEY
 * (a pública, que a tela usa). Sem as chaves, nada muda. Se o Cloudflare não responder, deixa passar e avisa no log:
 * uma queda do Cloudflare não pode impedir jogadores de entrar.
 */

const URL_DA_VERIFICACAO = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TEMPO_MAXIMO_MS = 5000;
const TAMANHO_MAXIMO_DO_TOKEN = 2048;

export class ErroDoTurnstile extends Error {
  readonly status = 400;
  constructor() {
    super('Confirme que você não é um robô e tente de novo.');
    this.name = 'ErroDoTurnstile';
  }
}

/**
 * Domínios que podem enviar o token (TURNSTILE_HOSTNAMES, separados por vírgula). Sem a variável, não confere o domínio
 * (como antes). Com ela, o token precisa vir de um destes domínios; em produção, não inclua localhost.
 */
export function dominiosPermitidosDoTurnstile(): Set<string> | null {
  const lista = process.env.TURNSTILE_HOSTNAMES?.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean) ?? [];
  return lista.length > 0 ? new Set(lista) : null;
}

/** A chave pública da tela, ou null se o Turnstile não está ligado. */
export function chaveDoSiteDoTurnstile(): string | null {
  return (process.env.TURNSTILE_SECRET_KEY?.trim() && process.env.TURNSTILE_SITE_KEY?.trim()) || null;
}

/** Confere o token do Turnstile no Cloudflare. Lança ErroDoTurnstile se ele recusar. */
export async function exigirHumano(token: unknown, ip: string, buscar: typeof fetch = fetch): Promise<void> {
  const segredo = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!segredo) return;
  if (typeof token !== 'string' || !token || token.length > TAMANHO_MAXIMO_DO_TOKEN) throw new ErroDoTurnstile();
  let resposta: { success?: unknown; hostname?: unknown; 'error-codes'?: unknown };
  try {
    const corpo = new URLSearchParams({ secret: segredo, response: token, ...(ip && ip !== 'desconhecido' ? { remoteip: ip } : {}) });
    const res = await buscar(URL_DA_VERIFICACAO, { method: 'POST', body: corpo, signal: AbortSignal.timeout(TEMPO_MAXIMO_MS) });
    resposta = (await res.json()) as typeof resposta;
  } catch (error) {
    registrarLog('ERROR', 'turnstile.indisponivel', descreverErro(error));
    return;
  }
  const dominiosPermitidos = dominiosPermitidosDoTurnstile();
  const dominioDoToken = typeof resposta.hostname === 'string' ? resposta.hostname.toLowerCase() : '';
  const dominioRecusado = dominiosPermitidos !== null && !dominiosPermitidos.has(dominioDoToken);
  if (resposta.success === true && !dominioRecusado) return;
  registrarLog('WARNING', 'turnstile.recusado', {
    codigos: Array.isArray(resposta['error-codes']) ? resposta['error-codes'] : [],
    ...(dominioRecusado ? { dominio: dominioDoToken } : {}),
  });
  throw new ErroDoTurnstile();
}
