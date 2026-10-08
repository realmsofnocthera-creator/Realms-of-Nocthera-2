import crypto from 'crypto';
import firebaseConfig from '../../firebase-applet-config.json';

export interface AuthenticatedUser {
  uid: string;
  email: string;
}

const SESSION_PREFIX = 'nocthera-session.';
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  `nocthera-secret-${firebaseConfig.projectId}-${firebaseConfig.appId}`;

export function createSignedSessionToken(user: AuthenticatedUser): string {
  const payload = Buffer.from(
    JSON.stringify({
      uid: user.uid,
      email: user.email,
      iat: Date.now(),
    }),
    'utf8'
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');

  return `${SESSION_PREFIX}${payload}.${signature}`;
}

export function verifySignedSessionToken(token: string): AuthenticatedUser | null {
  if (!token.startsWith(SESSION_PREFIX)) {
    return null;
  }

  const raw = token.slice(SESSION_PREFIX.length);
  const parts = raw.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [payload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');

  if (signature.length !== expectedSig.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof decoded.uid === 'string' && decoded.uid && typeof decoded.email === 'string') {
      return {
        uid: decoded.uid,
        email: decoded.email,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Valida o token de autenticação (ID Token) do Firebase recebido no cabeçalho Authorization: Bearer <token>.
 * Usa a API oficial do Google Identity Toolkit ou token assinado pelo servidor.
 */
export async function verifyAuthToken(authHeader: string | null): Promise<AuthenticatedUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.substring('Bearer '.length).trim();
  if (!idToken) {
    return null;
  }

  // Suporte a mocks para ambiente de teste unitário
  if ((process.env.NODE_ENV === 'test' || process.env.VITEST) && idToken.startsWith('test-token-')) {
    const testUid = idToken.replace('test-token-', '');
    return {
      uid: testUid,
      email: `${testUid}@test.com`,
    };
  }

  // Suporte a token de sessão assinado pelo servidor (fallback quando Email/Password não está ativo no console)
  if (idToken.startsWith(SESSION_PREFIX)) {
    return verifySignedSessionToken(idToken);
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data.users || data.users.length === 0) {
      return null;
    }

    const user = data.users[0];
    return {
      uid: user.localId,
      email: user.email || '',
    };
  } catch {
    return null;
  }
}
