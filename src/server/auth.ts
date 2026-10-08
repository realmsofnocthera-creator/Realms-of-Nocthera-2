import { adminAuth } from '@/server/firebaseAdmin';
import { registrarLog } from '@/server/log';

// Erros que significam token recusado (nunca cair no caminho sem checagem de revogação)
const CODIGOS_TOKEN_INVALIDO = new Set([
  'auth/id-token-revoked',
  'auth/id-token-expired',
  'auth/argument-error',
  'auth/invalid-id-token',
  'auth/user-disabled',
  'auth/user-not-found',
]);

export interface AuthenticatedUser {
  uid: string;
  email: string;
}

/**
 * Valida o ID Token do Firebase Auth recebido no cabeçalho Authorization: Bearer <token>.
 *
 * O firebase-admin confere a assinatura do Google, o projeto (aud/iss) e a expiração (exp).
 * Com checkRevoked, tokens emitidos antes de um logout (revokeRefreshTokens) também são
 * rejeitados. Não existe mais token de sessão próprio (removido na 0.5-A1/A2).
 */
export async function verifyAuthToken(authHeader: string | null): Promise<AuthenticatedUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.substring('Bearer '.length).trim();
  if (!idToken) {
    return null;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    return { uid: decoded.uid, email: decoded.email || '' };
  } catch (error) {
    const codigo = (error as { code?: string })?.code ?? '';
    if (!codigo.startsWith('auth/') || CODIGOS_TOKEN_INVALIDO.has(codigo)) {
      return null;
    }

    // A checagem de revogação consulta o Firebase Auth com a credencial do servidor.
    // Se ela falhar por permissão/rede, o token ainda é validado (assinatura, aud, exp)
    // e o problema fica registrado, em vez de derrubar todos os logins.
    registrarLog('WARNING', 'auth.checagem_revogacao_falhou', { codigo });
    try {
      const decoded = await adminAuth.verifyIdToken(idToken, false);
      return { uid: decoded.uid, email: decoded.email || '' };
    } catch {
      return null;
    }
  }
}

/**
 * Invalida todas as sessões do usuário no servidor (logout).
 * Tokens já emitidos passam a ser rejeitados por verifyAuthToken.
 */
export async function revokeUserSessions(uid: string): Promise<void> {
  await adminAuth.revokeRefreshTokens(uid);
}
