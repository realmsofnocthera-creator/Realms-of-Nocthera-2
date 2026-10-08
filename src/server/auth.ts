import { getAuth } from 'firebase-admin/auth';
import { adminApp } from './firebaseAdmin';

export interface AuthenticatedUser {
  uid: string;
  email: string;
}

/**
 * Valida o ID Token do Firebase Auth recebido em `Authorization: Bearer <token>`.
 *
 * O Admin SDK confere assinatura, expiração (exp), emissor e audiência. Não existe
 * mais token de sessão próprio nem segredo derivado de configuração pública (0.5-A1/A2).
 * Em produção também confere se a sessão foi revogada (logout no servidor, 0.5-A4).
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
    const decoded = await getAuth(adminApp).verifyIdToken(
      idToken,
      process.env.NODE_ENV === 'production'
    );
    return {
      uid: decoded.uid,
      email: decoded.email || '',
    };
  } catch {
    return null;
  }
}
