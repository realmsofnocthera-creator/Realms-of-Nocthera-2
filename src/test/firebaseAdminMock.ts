/**
 * Substituto do src/server/firebaseAdmin.ts nos testes (carregado por src/test/setup.ts).
 *
 * - adminAuth aceita tokens no formato gerado por tokenDeTeste(uid) (a revogação por logout
 *   fica no repositório em memória, como em produção).
 * - adminDb nunca é usado nos testes: a persistência roda no repositório em memória.
 *
 * Este arquivo só existe para o Vitest; o código de produção não tem atalho de token.
 */

const PREFIXO = 'test-token-';

/**
 * Gera um ID Token válido para o mock do Firebase Auth. O auth_time (login que originou o
 * token, em segundos) vai embutido: por padrão é "agora"; passe outro valor para simular
 * um token de um login antigo (ou renovado depois de um logout).
 */
export function tokenDeTeste(uid: string, authTimeSegundos = Math.floor(Date.now() / 1000)): string {
  return `${PREFIXO}${uid}.${authTimeSegundos}`;
}

function decodificar(token: string): { uid: string; authTime: number } | null {
  if (!token.startsWith(PREFIXO)) return null;
  const resto = token.slice(PREFIXO.length);
  const ponto = resto.lastIndexOf('.');
  // Tokens sem sufixo ("test-token-<uid>") valem como um login feito agora
  if (ponto === -1) return { uid: resto, authTime: Math.floor(Date.now() / 1000) };
  const authTime = Number(resto.slice(ponto + 1));
  if (!Number.isInteger(authTime)) return { uid: resto, authTime: Math.floor(Date.now() / 1000) };
  return { uid: resto.slice(0, ponto), authTime };
}

export const adminAuth = {
  async verifyIdToken(token: string) {
    const decoded = decodificar(token);
    if (!decoded || !decoded.uid) {
      throw Object.assign(new Error('Token inválido.'), { code: 'auth/argument-error' });
    }
    return { uid: decoded.uid, email: `${decoded.uid}@test.com`, auth_time: decoded.authTime };
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
