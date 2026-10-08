import { adminAuth } from '@/server/firebaseAdmin';
import { descreverErro, registrarLog } from '@/server/log';

// Erros que significam token recusado (nunca cair no caminho sem checagem de revogação)
const CODIGOS_TOKEN_INVALIDO = new Set([
  'auth/id-token-revoked',
  'auth/id-token-expired',
  'auth/argument-error',
  'auth/invalid-id-token',
  'auth/user-disabled',
  'auth/user-not-found',
]);

/**
 * Disjuntor da checagem de revogação.
 *
 * verifyIdToken(token, true) consulta o Firebase Auth com a credencial do servidor. Se essa
 * consulta falhar (ex.: a conta de serviço não tem permissão e o Admin SDK devolve
 * auth/internal-error), insistir a cada requisição só gera erro, aviso em todo log e uma
 * chamada de rede a mais. Depois da primeira falha a checagem fica desligada por
 * COOLDOWN_REVOGACAO_MS; passado o prazo ela é tentada de novo, e volta sozinha quando a
 * permissão for concedida. A assinatura, o projeto e a expiração do token continuam
 * sempre validados; só a revogação (logout no servidor) fica sem efeito nesse período.
 */
export const COOLDOWN_REVOGACAO_MS = 10 * 60_000;
const MAX_MENSAGEM_LOG = 500;
let revogacaoIndisponivelAte = 0;

/** Só para testes: religa a checagem de revogação. */
export function reiniciarDisjuntorRevogacao(): void {
  revogacaoIndisponivelAte = 0;
}

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

  const agora = Date.now();
  const checarRevogacao = agora >= revogacaoIndisponivelAte;

  try {
    const decoded = await adminAuth.verifyIdToken(idToken, checarRevogacao);
    return { uid: decoded.uid, email: decoded.email || '' };
  } catch (error) {
    const codigo = (error as { code?: string })?.code ?? '';
    if (!checarRevogacao || !codigo.startsWith('auth/') || CODIGOS_TOKEN_INVALIDO.has(codigo)) {
      return null;
    }

    // A consulta de revogação falhou por outro motivo (permissão, rede, API). Confirma que o
    // token em si é válido; só então liga o disjuntor. Assim, um token ruim ou uma falha ao
    // buscar as chaves do Google nunca desligam a checagem.
    let user: AuthenticatedUser;
    try {
      const decoded = await adminAuth.verifyIdToken(idToken, false);
      user = { uid: decoded.uid, email: decoded.email || '' };
    } catch {
      return null;
    }

    // Pedidos simultâneos que falharam juntos: só o primeiro liga o disjuntor e registra o aviso
    if (Date.now() >= revogacaoIndisponivelAte) {
      revogacaoIndisponivelAte = Date.now() + COOLDOWN_REVOGACAO_MS;
      registrarLog('WARNING', 'auth.checagem_revogacao_indisponivel', {
        codigo,
        // No auth/internal-error o Admin SDK traz a resposta bruta do servidor na mensagem
        // (ex.: API desativada, permissão negada); é ela que diz a causa real.
        mensagem: descreverErro(error).mensagem.slice(0, MAX_MENSAGEM_LOG),
        novaTentativaEm: new Date(revogacaoIndisponivelAte).toISOString(),
        efeito: 'tokens validados sem checar revogação; o logout no servidor não invalida tokens já emitidos',
        acao: 'ler "mensagem"; causas comuns: conta de serviço sem o papel Firebase Authentication Admin, ou API Identity Toolkit desativada no projeto da conta de serviço',
      });
    }
    return user;
  }
}

/**
 * Invalida todas as sessões do usuário no servidor (logout).
 * Tokens já emitidos passam a ser rejeitados por verifyAuthToken.
 */
export async function revokeUserSessions(uid: string): Promise<void> {
  await adminAuth.revokeRefreshTokens(uid);
}
