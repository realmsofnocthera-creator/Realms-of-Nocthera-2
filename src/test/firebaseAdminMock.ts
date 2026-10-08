/**
 * Substituto do src/server/firebaseAdmin.ts nos testes (carregado por src/test/setup.ts).
 *
 * - adminAuth aceita tokens no formato gerado por tokenDeTeste(uid) e respeita revogação.
 * - adminDb nunca é usado nos testes: a persistência roda no repositório em memória.
 *
 * Este arquivo só existe para o Vitest; o código de produção não tem atalho de token.
 */

const PREFIXO = 'test-token-';
let sequencia = 0;
const revogadoAte = new Map<string, number>();

/** Gera um ID Token válido para o mock do Firebase Auth. */
export function tokenDeTeste(uid: string): string {
  sequencia += 1;
  return `${PREFIXO}${uid}.${sequencia}`;
}

export function limparRevogacoesDeTeste(): void {
  revogadoAte.clear();
}

function decodificar(token: string): { uid: string; seq: number } | null {
  if (!token.startsWith(PREFIXO)) return null;
  const resto = token.slice(PREFIXO.length);
  const ponto = resto.lastIndexOf('.');
  if (ponto === -1) return { uid: resto, seq: 0 };
  const seq = Number(resto.slice(ponto + 1));
  if (!Number.isInteger(seq)) return { uid: resto, seq: 0 };
  return { uid: resto.slice(0, ponto), seq };
}

function erroAuth(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

export const adminAuth = {
  async verifyIdToken(token: string, checkRevoked = false) {
    const decoded = decodificar(token);
    if (!decoded || !decoded.uid) {
      throw erroAuth('auth/argument-error', 'Token inválido.');
    }
    const limite = revogadoAte.get(decoded.uid);
    if (checkRevoked && limite !== undefined && decoded.seq <= limite) {
      throw erroAuth('auth/id-token-revoked', 'Token revogado.');
    }
    return { uid: decoded.uid, email: `${decoded.uid}@test.com` };
  },
  async revokeRefreshTokens(uid: string) {
    revogadoAte.set(uid, sequencia);
  },
};

export const adminDb = new Proxy(
  {},
  {
    get() {
      throw new Error('adminDb não deve ser usado nos testes: use o repositório em memória.');
    },
  }
);

export const adminApp = {};
