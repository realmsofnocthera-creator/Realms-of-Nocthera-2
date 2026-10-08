import crypto from 'crypto';
import { describe, it, expect, vi } from 'vitest';
import firebaseConfig from '../../../firebase-applet-config.json';

// Este arquivo usa o firebase-admin de verdade (sem o mock do setup), sem rede:
// todos os tokens abaixo são recusados antes de qualquer busca de chave pública.
vi.unmock('@/server/firebaseAdmin');

const { verifyAuthToken } = await import('@/server/auth');

function base64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}

describe('0.5-A1 — tokens forjados são rejeitados pelo servidor', () => {
  it('rejeita o token de sessão antigo assinado com o segredo padrão público', async () => {
    // Reproduz o formato e o segredo padrão removidos (derivado de projectId e appId públicos)
    const segredoAntigo = `nocthera-secret-${firebaseConfig.projectId}-${firebaseConfig.appId}`;
    const payload = base64url({ uid: 'vitima', email: 'vitima@x.com', iat: Date.now() });
    const assinatura = crypto.createHmac('sha256', segredoAntigo).update(payload).digest('base64url');
    const tokenAntigo = `nocthera-session.${payload}.${assinatura}`;

    expect(await verifyAuthToken(`Bearer ${tokenAntigo}`)).toBeNull();
  });

  it('rejeita o atalho test-token fora do mock de teste', async () => {
    expect(await verifyAuthToken('Bearer test-token-vitima')).toBeNull();
  });

  it('rejeita JWT assinado com HMAC (alg HS256) mesmo com aud e iss corretos', async () => {
    const agora = Math.floor(Date.now() / 1000);
    const header = base64url({ alg: 'HS256', typ: 'JWT' });
    const corpo = base64url({
      aud: firebaseConfig.projectId,
      iss: `https://securetoken.google.com/${firebaseConfig.projectId}`,
      sub: 'vitima',
      iat: agora,
      exp: agora + 3600,
      auth_time: agora,
    });
    const assinatura = crypto.createHmac('sha256', 'qualquer').update(`${header}.${corpo}`).digest('base64url');

    expect(await verifyAuthToken(`Bearer ${header}.${corpo}.${assinatura}`)).toBeNull();
  });

  it('rejeita JWT RS256 de outro projeto (aud diferente)', async () => {
    const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const agora = Math.floor(Date.now() / 1000);
    const header = base64url({ alg: 'RS256', typ: 'JWT', kid: 'chave-falsa' });
    const corpo = base64url({
      aud: 'outro-projeto',
      iss: 'https://securetoken.google.com/outro-projeto',
      sub: 'vitima',
      iat: agora,
      exp: agora + 3600,
      auth_time: agora,
    });
    const assinatura = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${corpo}`), privateKey).toString('base64url');

    expect(await verifyAuthToken(`Bearer ${header}.${corpo}.${assinatura}`)).toBeNull();
  });
});
