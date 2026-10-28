import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exigirHumano, ErroDoTurnstile } from '@/server/turnstile';

const respondendo = (corpo: unknown) => (async () => new Response(JSON.stringify(corpo), { status: 200 })) as unknown as typeof fetch;

describe('Turnstile: conferência do token no servidor', () => {
  beforeEach(() => {
    process.env.TURNSTILE_SECRET_KEY = 'segredo-de-teste';
    delete process.env.TURNSTILE_HOSTNAMES;
  });
  afterEach(() => {
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_HOSTNAMES;
  });

  it('aceita o token válido quando não há lista de domínios (como antes)', async () => {
    await expect(exigirHumano('tok', '1.2.3.4', respondendo({ success: true, hostname: 'qualquer.exemplo' }))).resolves.toBeUndefined();
  });

  it('recusa token que o Cloudflare não aceitou', async () => {
    await expect(exigirHumano('tok', '1.2.3.4', respondendo({ success: false }))).rejects.toBeInstanceOf(ErroDoTurnstile);
  });

  it('com TURNSTILE_HOSTNAMES, aceita só o domínio da lista (sem diferenciar maiúsculas)', async () => {
    process.env.TURNSTILE_HOSTNAMES = 'realms-of-nocthera-992825013017.us-central1.run.app, Realms-of-Nocthera-m25x3vtfba-uc.a.run.app';
    await expect(exigirHumano('tok', '1.2.3.4', respondendo({ success: true, hostname: 'realms-of-nocthera-m25x3vtfba-uc.a.run.app' }))).resolves.toBeUndefined();
    await expect(exigirHumano('tok', '1.2.3.4', respondendo({ success: true, hostname: 'outro-site.exemplo' }))).rejects.toBeInstanceOf(ErroDoTurnstile);
  });

  it('sem token ou com token grande demais, recusa antes de consultar o Cloudflare', async () => {
    await expect(exigirHumano(undefined, '1.2.3.4', respondendo({ success: true }))).rejects.toBeInstanceOf(ErroDoTurnstile);
    await expect(exigirHumano('x'.repeat(3000), '1.2.3.4', respondendo({ success: true }))).rejects.toBeInstanceOf(ErroDoTurnstile);
  });

  it('sem chave secreta, não exige nada (o anti-bot fica desligado)', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    await expect(exigirHumano(undefined, '1.2.3.4', respondendo({ success: false }))).resolves.toBeUndefined();
  });
});
