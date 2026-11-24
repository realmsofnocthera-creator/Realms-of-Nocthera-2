import { afterEach, describe, expect, it, vi } from 'vitest';
import { chamar } from '@/components/mestre/comum';

describe('chamar: erro de rede do navegador', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('"Failed to fetch" e "Load failed" viram um aviso que explica; outros erros seguem como eram', async () => {
    for (const msg of ['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.']) {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError(msg)));
      const r = await chamar(async () => 't', '/api/x');
      expect(r).toMatchObject({ ok: false, status: 0 });
      expect(String(r.dados.error)).toMatch(/A conexão com o servidor falhou/);
    }
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('outro problema')));
    expect((await chamar(async () => 't', '/api/x')).dados.error).toBe('outro problema');
  });
});
