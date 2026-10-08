import { adminAuth } from '@/server/firebaseAdmin';
import { repositorio } from '@/server/persistencia';

export interface AuthenticatedUser {
  uid: string;
  email: string;
}

/**
 * Revogação de sessão por logout (0.5-A4), guardada no Firestore em revogacoes/{uid}.
 *
 * Por que não verifyIdToken(token, true): essa checagem consulta a API de login do Firebase
 * (Identity Toolkit) a cada requisição. Em ambientes em que a conta de serviço pertence a
 * outro projeto (caso do AI Studio) essa API pode estar desativada no projeto da conta e o
 * Admin SDK devolve auth/internal-error. Guardar o instante do logout no Firestore funciona
 * em qualquer ambiente, evita uma chamada de rede por requisição e dá a mesma garantia:
 * um token é recusado se o login que o originou (auth_time) é anterior ao último logout.
 * O auth_time não muda quando o token é renovado, então renovar um login revogado não ajuda;
 * um login novo tem auth_time maior e volta a valer.
 *
 * Limites conhecidos: com várias instâncias, o logout feito em uma pode levar até
 * TTL_CACHE_REVOGACAO_MS para valer nas outras (cache em memória); e, como na checagem
 * antiga, conta desativada no console só deixa de valer quando o token (1 h) expira.
 */
export const TTL_CACHE_REVOGACAO_MS = 30_000;
const MAX_ENTRADAS_CACHE = 10_000;
const cacheRevogacao = new Map<string, { valor: number | null; expiraEm: number }>();

/** Só para testes: esquece o cache de revogações. */
export function limparCacheRevogacao(): void {
  cacheRevogacao.clear();
}

function guardarNoCache(uid: string, valor: number | null): void {
  if (cacheRevogacao.size >= MAX_ENTRADAS_CACHE) {
    cacheRevogacao.clear();
  }
  cacheRevogacao.set(uid, { valor, expiraEm: Date.now() + TTL_CACHE_REVOGACAO_MS });
}

async function instanteDaRevogacao(uid: string): Promise<number | null> {
  const emCache = cacheRevogacao.get(uid);
  if (emCache && emCache.expiraEm > Date.now()) {
    return emCache.valor;
  }
  const valor = await repositorio.lerRevogacaoSessoes(uid);
  guardarNoCache(uid, valor);
  return valor;
}

/**
 * Valida o ID Token do Firebase Auth recebido no cabeçalho Authorization: Bearer <token>.
 *
 * O firebase-admin confere a assinatura do Google, o projeto (aud/iss) e a expiração (exp),
 * sem nenhuma chamada à API de login. Depois o token é comparado com o último logout do
 * usuário. Se o Firestore falhar, lança ErroPersistencia (as rotas respondem 503).
 */
export async function verifyAuthToken(authHeader: string | null): Promise<AuthenticatedUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.substring('Bearer '.length).trim();
  if (!idToken) {
    return null;
  }

  let decoded: { uid: string; email?: string; auth_time?: number };
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return null;
  }

  const revogadoEm = await instanteDaRevogacao(decoded.uid);
  const loginEm = typeof decoded.auth_time === 'number' ? decoded.auth_time : 0;
  if (revogadoEm !== null && loginEm <= revogadoEm) {
    return null;
  }

  return { uid: decoded.uid, email: decoded.email || '' };
}

/**
 * Invalida todas as sessões do usuário no servidor (logout): tokens de logins anteriores a
 * este instante passam a ser recusados por verifyAuthToken.
 */
export async function revokeUserSessions(uid: string): Promise<void> {
  const revogadoEm = Math.floor(Date.now() / 1000);
  await repositorio.gravarRevogacaoSessoes(uid, revogadoEm);
  guardarNoCache(uid, revogadoEm);
}
