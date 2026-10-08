import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import firebaseConfig from '../../../firebase-applet-config.json';
import * as authModule from '../auth';
import { verifyAuthToken } from '../auth';
import { verificarLimite, resetarLimitesParaTeste } from '../rateLimit';

/** Reproduz o token que o código ANTIGO assinava com o segredo derivado de dados públicos. */
function tokenForjadoDoModeloAntigo(uid: string): string {
  const segredoPublico = `nocthera-secret-${firebaseConfig.projectId}-${firebaseConfig.appId}`;
  const payload = Buffer.from(
    JSON.stringify({ uid, email: `${uid}@x.com`, iat: Date.now() }),
    'utf8'
  ).toString('base64url');
  const assinatura = crypto.createHmac('sha256', segredoPublico).update(payload).digest('base64url');
  return `nocthera-session.${payload}.${assinatura}`;
}

describe('0.5-A1 / A5 — autenticação só por ID Token do Firebase', () => {
  it('rejeita token de sessão forjado com o segredo público antigo', async () => {
    const forjado = tokenForjadoDoModeloAntigo('vitima');
    expect(await verifyAuthToken(`Bearer ${forjado}`)).toBeNull();
  });

  it('rejeita JWT com assinatura inválida e valores aleatórios', async () => {
    const cabecalho = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const corpo = Buffer.from(
      JSON.stringify({ sub: 'vitima', aud: firebaseConfig.projectId, exp: 9999999999 })
    ).toString('base64url');
    expect(await verifyAuthToken(`Bearer ${cabecalho}.${corpo}.assinatura`)).toBeNull();
    expect(await verifyAuthToken('Bearer lixo')).toBeNull();
    expect(await verifyAuthToken('Bearer ')).toBeNull();
    expect(await verifyAuthToken(null)).toBeNull();
  });

  it('o atalho test-token-* não existe no código de produção', async () => {
    expect(await verifyAuthToken('Bearer test-token-qualquer')).toBeNull();
  });

  it('não existe mais emissão de token próprio nem a rota de login paralelo', () => {
    expect((authModule as Record<string, unknown>).createSignedSessionToken).toBeUndefined();
    expect((authModule as Record<string, unknown>).verifySignedSessionToken).toBeUndefined();
    const rota = path.resolve(__dirname, '../../app/api/auth/email/route.ts');
    expect(fs.existsSync(rota)).toBe(false);
  });
});

describe('0.5-A3 — rate limiting', () => {
  beforeEach(() => resetarLimitesParaTeste());

  it('bloqueia depois do máximo e informa Retry-After', () => {
    const regra = { max: 3, janelaMs: 60_000 };
    const t0 = 1_000_000;
    expect(verificarLimite('k', regra, t0).permitido).toBe(true);
    expect(verificarLimite('k', regra, t0 + 1).permitido).toBe(true);
    expect(verificarLimite('k', regra, t0 + 2).permitido).toBe(true);
    const bloqueado = verificarLimite('k', regra, t0 + 3);
    expect(bloqueado.permitido).toBe(false);
    expect(bloqueado.retryAfterSegundos).toBeGreaterThan(0);
  });

  it('libera de novo quando a janela desliza e isola chaves diferentes', () => {
    const regra = { max: 1, janelaMs: 1000 };
    expect(verificarLimite('a', regra, 0).permitido).toBe(true);
    expect(verificarLimite('a', regra, 500).permitido).toBe(false);
    expect(verificarLimite('b', regra, 500).permitido).toBe(true);
    expect(verificarLimite('a', regra, 1500).permitido).toBe(true);
  });
});
