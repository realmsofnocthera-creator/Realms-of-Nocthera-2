import type { AuthenticatedUser } from '../../auth';

/**
 * Substituto de `verifyAuthToken` SOMENTE para testes (0.5-A5): aceita `Bearer test-token-<uid>`.
 * Uso: vi.mock('../auth', () => import('./helpers/authFake'))
 * Nunca é importado pelo código de produção.
 */
export async function verifyAuthToken(authHeader: string | null): Promise<AuthenticatedUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer test-token-')) {
    return null;
  }
  const uid = authHeader.slice('Bearer test-token-'.length).trim();
  return uid ? { uid, email: `${uid}@test.com` } : null;
}
