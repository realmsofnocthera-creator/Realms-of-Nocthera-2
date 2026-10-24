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

/** Só para testes: os logins removidos por deleteUser. */
export const loginsRemovidos: string[] = [];

export const adminAuth = {
  async verifyIdToken(token: string) {
    const decoded = decodificar(token);
    if (!decoded || !decoded.uid) {
      throw Object.assign(new Error('Token inválido.'), { code: 'auth/argument-error' });
    }
    // uids que começam com "naoverificado" simulam o e-mail ainda não confirmado
    return { uid: decoded.uid, email: `${decoded.uid}@test.com`, auth_time: decoded.authTime, email_verified: !decoded.uid.startsWith('naoverificado') };
  },
  /** Usuário do Auth pelo uid (o e-mail de teste é <uid>@test.com). */
  async getUser(uid: string) {
    return { uid, email: `${uid}@test.com` };
  },
  /** Remove o login; uids que começam com "semlogin" simulam a API falhando. */
  async deleteUser(uid: string) {
    if (uid.startsWith('semlogin')) throw Object.assign(new Error('API desativada'), { code: 'auth/internal-error' });
    loginsRemovidos.push(uid);
  },
  /** Só acha e-mails no formato <uid>@test.com; "indisponivel@test.com" simula a API de login desativada. */
  async getUserByEmail(email: string) {
    if (email === 'indisponivel@test.com') throw Object.assign(new Error('API desativada'), { code: 'auth/internal-error' });
    const m = /^([a-zA-Z0-9_-]+)@test\.com$/.exec(email);
    if (!m) throw Object.assign(new Error('Usuário não encontrado'), { code: 'auth/user-not-found' });
    return { uid: m[1], email };
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
