import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { criarLimitador } from '../rateLimit';
import { createCharacter } from '../characterService';
import { resetCharacterStore } from '../../test/repositorioMemoria';
import { tokenDeTeste } from '../../test/firebaseAdminMock';

const REGRA = { limite: 3, janelaMs: 1000 };

describe('0.5-A3 — rate limiting', () => {
  it('permite até o limite na janela e bloqueia a próxima com Retry-After', () => {
    const lim = criarLimitador();
    expect(lim.verificar('k', REGRA, 0).permitido).toBe(true);
    expect(lim.verificar('k', REGRA, 10).permitido).toBe(true);
    expect(lim.verificar('k', REGRA, 20).permitido).toBe(true);
    const bloqueado = lim.verificar('k', REGRA, 30);
    expect(bloqueado.permitido).toBe(false);
    expect(bloqueado.retryAfterSegundos).toBe(30);
  });

  it('chaves diferentes não interferem entre si', () => {
    const lim = criarLimitador();
    for (let i = 0; i < 3; i++) lim.verificar('a', REGRA, i);
    expect(lim.verificar('a', REGRA, 5).permitido).toBe(false);
    expect(lim.verificar('b', REGRA, 5).permitido).toBe(true);
  });

  it('bloqueio é progressivo: cada nova infração dobra o tempo', () => {
    const lim = criarLimitador();
    let agora = 0;
    const estourar = () => {
      let r = lim.verificar('k', REGRA, agora);
      while (r.permitido) r = lim.verificar('k', REGRA, agora);
      return r.retryAfterSegundos;
    };
    expect(estourar()).toBe(30);
    agora += 31_000;
    expect(estourar()).toBe(60);
    agora += 61_000;
    expect(estourar()).toBe(120);
  });

  it('libera de novo quando a janela passa sem estouro', () => {
    const lim = criarLimitador();
    for (let i = 0; i < 3; i++) lim.verificar('k', REGRA, i);
    expect(lim.verificar('k', REGRA, 1500).permitido).toBe(true);
  });

  describe('na rota', () => {
    beforeEach(() => resetCharacterStore());

    it('rota de escrita responde 429 com Retry-After depois de 30 requisições por minuto da mesma conta', async () => {
      const { POST } = await import('../../app/api/character/sobre/route');
      const uid = 'a3_limite_conta';
      await createCharacter(uid, {
        nome: 'Limitada',
        racaId: 'humano',
        classeId: 'barbaro',
        pontos: { vigor: 4, mente: 0, forca: 4, vitalidade: 1, arcano: 0, inteligencia: 0, agilidade: 1 },
      });

      const pedir = (i: number) =>
        POST(
          new NextRequest('http://localhost:3000/api/character/sobre', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${tokenDeTeste(uid)}`,
              'x-forwarded-for': `10.0.0.${i % 200}`,
            },
            body: JSON.stringify({ sobre: `texto ${i}` }),
          })
        );

      const status: number[] = [];
      for (let i = 0; i < 30; i++) status.push((await pedir(i)).status);
      expect(status.every((s) => s === 200)).toBe(true);

      // 31ª requisição no mesmo minuto (de IPs variados): bloqueada pela conta
      const bloqueada = await pedir(30);
      expect(bloqueada.status).toBe(429);
      expect(Number(bloqueada.headers.get('Retry-After'))).toBeGreaterThan(0);
    });
  });
});
