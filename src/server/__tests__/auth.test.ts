import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TTL_CACHE_REVOGACAO_MS,
  limparCacheRevogacao,
  revokeUserSessions,
  verifyAuthToken,
} from '@/server/auth';
import { repositorio } from '@/server/persistencia';
import { ErroPersistencia, resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const T0 = new Date('2026-10-08T12:00:00Z');
const segundos = (d: Date) => Math.floor(d.getTime() / 1000);

describe('0.5-A1/A4 — verifyAuthToken (Firebase Auth via firebase-admin + revogação no Firestore)', () => {
  beforeEach(() => {
    resetCharacterStore();
    limparCacheRevogacao();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('rejeita cabeçalho ausente, sem Bearer ou vazio', async () => {
    expect(await verifyAuthToken(null)).toBeNull();
    expect(await verifyAuthToken('Basic abc')).toBeNull();
    expect(await verifyAuthToken('Bearer    ')).toBeNull();
  });

  it('rejeita token que o Firebase não reconhece', async () => {
    expect(await verifyAuthToken('Bearer token-qualquer')).toBeNull();
  });

  it('aceita um ID Token válido e devolve uid e email', async () => {
    const user = await verifyAuthToken(`Bearer ${tokenDeTeste('jogador_a1')}`);
    expect(user).toEqual({ uid: 'jogador_a1', email: 'jogador_a1@test.com' });
  });

  describe('logout no servidor', () => {
    it('recusa os tokens do login anterior, inclusive renovados, e aceita um login novo', async () => {
      const loginAntigo = segundos(T0);
      const antigo = tokenDeTeste('jogador_logout', loginAntigo);
      expect(await verifyAuthToken(`Bearer ${antigo}`)).not.toBeNull();

      vi.setSystemTime(new Date(T0.getTime() + 5_000));
      await revokeUserSessions('jogador_logout');
      expect(await verifyAuthToken(`Bearer ${antigo}`)).toBeNull();

      // Token renovado a partir da sessão revogada: o auth_time continua o do login antigo
      const renovado = tokenDeTeste('jogador_logout', loginAntigo);
      expect(await verifyAuthToken(`Bearer ${renovado}`)).toBeNull();

      // Login novo (auth_time depois do logout) volta a valer
      vi.setSystemTime(new Date(T0.getTime() + 7_000));
      const novo = tokenDeTeste('jogador_logout');
      expect(await verifyAuthToken(`Bearer ${novo}`)).not.toBeNull();
    });

    it('não afeta outros usuários', async () => {
      const tokenDeOutro = tokenDeTeste('jogador_outro', segundos(T0));
      vi.setSystemTime(new Date(T0.getTime() + 5_000));
      await revokeUserSessions('jogador_que_saiu');
      expect(await verifyAuthToken(`Bearer ${tokenDeOutro}`)).not.toBeNull();
    });

    it('guarda o instante do logout em segundos no repositório', async () => {
      await revokeUserSessions('jogador_registro');
      expect(await repositorio.lerRevogacaoSessoes('jogador_registro')).toBe(segundos(T0));
      expect(await repositorio.lerRevogacaoSessoes('ninguem')).toBeNull();
    });
  });

  describe('cache entre instâncias', () => {
    it('logout feito em outra instância vale aqui no máximo após o TTL do cache', async () => {
      const token = tokenDeTeste('jogador_multi', segundos(T0));
      expect(await verifyAuthToken(`Bearer ${token}`)).not.toBeNull(); // guarda "sem revogação" no cache

      // Outra instância registra o logout direto no banco
      vi.setSystemTime(new Date(T0.getTime() + 5_000));
      await repositorio.gravarRevogacaoSessoes('jogador_multi', segundos(new Date(T0.getTime() + 5_000)));

      expect(await verifyAuthToken(`Bearer ${token}`)).not.toBeNull(); // ainda dentro do TTL

      vi.setSystemTime(new Date(T0.getTime() + TTL_CACHE_REVOGACAO_MS + 6_000));
      expect(await verifyAuthToken(`Bearer ${token}`)).toBeNull();
    });

    it('requisições seguidas do mesmo usuário leem o banco uma vez só', async () => {
      const ler = vi.spyOn(repositorio, 'lerRevogacaoSessoes');
      const token = tokenDeTeste('jogador_cache');
      for (let i = 0; i < 5; i++) {
        await verifyAuthToken(`Bearer ${token}`);
      }
      expect(ler).toHaveBeenCalledTimes(1);
    });
  });

  describe('falha do Firestore', () => {
    it('lança ErroPersistencia em vez de aceitar ou recusar o token às cegas', async () => {
      vi.spyOn(repositorio, 'lerRevogacaoSessoes').mockRejectedValue(new ErroPersistencia('lerRevogacao'));
      await expect(verifyAuthToken(`Bearer ${tokenDeTeste('jogador_banco')}`)).rejects.toBeInstanceOf(
        ErroPersistencia
      );
    });

    it('as rotas respondem 503, não 401 (o cliente pode tentar de novo)', async () => {
      const { GET } = await import('@/app/api/character/me/route');
      const { NextRequest } = await import('next/server');
      vi.spyOn(repositorio, 'lerRevogacaoSessoes').mockRejectedValue(new ErroPersistencia('lerRevogacao'));

      const res = await GET(
        new NextRequest('http://localhost:3000/api/character/me', {
          headers: { Authorization: `Bearer ${tokenDeTeste('jogador_503')}` },
        })
      );
      expect(res.status).toBe(503);
    });

    it('o logout também responde 503 quando não consegue gravar a revogação', async () => {
      const { POST } = await import('@/app/api/auth/logout/route');
      const { NextRequest } = await import('next/server');
      vi.spyOn(repositorio, 'gravarRevogacaoSessoes').mockRejectedValue(new ErroPersistencia('gravarRevogacao'));

      const res = await POST(
        new NextRequest('http://localhost:3000/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokenDeTeste('jogador_logout_503')}` },
        })
      );
      expect(res.status).toBe(503);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('devolve 204 e depois recusa o token usado no logout', async () => {
      const { POST } = await import('@/app/api/auth/logout/route');
      const { NextRequest } = await import('next/server');
      const token = tokenDeTeste('jogador_rota', segundos(T0));
      expect(await verifyAuthToken(`Bearer ${token}`)).not.toBeNull();

      vi.setSystemTime(new Date(T0.getTime() + 3_000));
      const res = await POST(
        new NextRequest('http://localhost:3000/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      expect(res.status).toBe(204);
      expect(await verifyAuthToken(`Bearer ${token}`)).toBeNull();
    });

    it('é idempotente para token inválido (204 sem gravar nada)', async () => {
      const { POST } = await import('@/app/api/auth/logout/route');
      const { NextRequest } = await import('next/server');
      const res = await POST(
        new NextRequest('http://localhost:3000/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: 'Bearer token-invalido' },
        })
      );
      expect(res.status).toBe(204);
    });
  });
});
