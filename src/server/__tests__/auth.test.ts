import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  COOLDOWN_REVOGACAO_MS,
  reiniciarDisjuntorRevogacao,
  revokeUserSessions,
  verifyAuthToken,
} from '@/server/auth';
import {
  chamadasComChecagemDeRevogacao,
  limparRevogacoesDeTeste,
  simularFalhaChecagemRevogacao,
  tokenDeTeste,
} from '@/test/firebaseAdminMock';

describe('0.5-A1/A4 — verifyAuthToken (Firebase Auth via firebase-admin)', () => {
  beforeEach(() => {
    limparRevogacoesDeTeste();
  });

  it('rejeita cabeçalho ausente, sem Bearer ou vazio', async () => {
    expect(await verifyAuthToken(null)).toBeNull();
    expect(await verifyAuthToken('Basic abc')).toBeNull();
    expect(await verifyAuthToken('Bearer    ')).toBeNull();
  });

  it('aceita um ID Token válido e devolve uid e email', async () => {
    const user = await verifyAuthToken(`Bearer ${tokenDeTeste('jogador_a1')}`);
    expect(user).toEqual({ uid: 'jogador_a1', email: 'jogador_a1@test.com' });
  });

  it('logout no servidor invalida tokens emitidos antes dele, e um login novo volta a valer', async () => {
    const antigo = tokenDeTeste('jogador_logout');
    expect(await verifyAuthToken(`Bearer ${antigo}`)).not.toBeNull();

    await revokeUserSessions('jogador_logout');
    expect(await verifyAuthToken(`Bearer ${antigo}`)).toBeNull();

    const novo = tokenDeTeste('jogador_logout');
    expect(await verifyAuthToken(`Bearer ${novo}`)).not.toBeNull();
  });

  describe('disjuntor da checagem de revogação (erro auth/internal-error em produção)', () => {
    let aviso: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      reiniciarDisjuntorRevogacao();
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-08T12:00:00Z'));
      aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      aviso.mockRestore();
      vi.useRealTimers();
    });

    const avisosDeRevogacao = () =>
      aviso.mock.calls.filter((chamada: unknown[]) => String(chamada[0]).includes('auth.checagem_revogacao_indisponivel'));

    it('com a consulta falhando, aceita o token, avisa UMA vez e para de consultar durante o cooldown', async () => {
      simularFalhaChecagemRevogacao(true);

      for (let i = 0; i < 6; i++) {
        expect(await verifyAuthToken(`Bearer ${tokenDeTeste('jogador_sem_perm')}`)).toEqual({
          uid: 'jogador_sem_perm',
          email: 'jogador_sem_perm@test.com',
        });
      }

      expect(avisosDeRevogacao()).toHaveLength(1);
      expect(chamadasComChecagemDeRevogacao()).toBe(1);
    });

    it('pedidos simultâneos na primeira falha geram um único aviso', async () => {
      simularFalhaChecagemRevogacao(true);

      const resultados = await Promise.all(
        Array.from({ length: 5 }, () => verifyAuthToken(`Bearer ${tokenDeTeste('jogador_paralelo')}`))
      );

      expect(resultados.every((u) => u?.uid === 'jogador_paralelo')).toBe(true);
      expect(avisosDeRevogacao()).toHaveLength(1);
    });

    it('depois do cooldown tenta de novo e, com a permissão concedida, a revogação volta a valer', async () => {
      simularFalhaChecagemRevogacao(true);
      const antigo = tokenDeTeste('jogador_volta');
      expect(await verifyAuthToken(`Bearer ${antigo}`)).not.toBeNull();
      expect(chamadasComChecagemDeRevogacao()).toBe(1);

      // Permissão concedida e logout feito; ainda dentro do cooldown a checagem segue desligada
      simularFalhaChecagemRevogacao(false);
      await revokeUserSessions('jogador_volta');
      expect(await verifyAuthToken(`Bearer ${antigo}`)).not.toBeNull();
      expect(chamadasComChecagemDeRevogacao()).toBe(1);

      // Passado o cooldown a checagem é religada e o token revogado é recusado
      vi.setSystemTime(Date.now() + COOLDOWN_REVOGACAO_MS + 1000);
      expect(await verifyAuthToken(`Bearer ${antigo}`)).toBeNull();
      expect(chamadasComChecagemDeRevogacao()).toBe(2);
    });

    it('se a consulta continua falhando após o cooldown, tenta uma vez e volta a esperar', async () => {
      simularFalhaChecagemRevogacao(true);
      await verifyAuthToken(`Bearer ${tokenDeTeste('jogador_persistente')}`);

      vi.setSystemTime(Date.now() + COOLDOWN_REVOGACAO_MS + 1000);
      for (let i = 0; i < 4; i++) {
        await verifyAuthToken(`Bearer ${tokenDeTeste('jogador_persistente')}`);
      }

      expect(chamadasComChecagemDeRevogacao()).toBe(2);
      expect(avisosDeRevogacao()).toHaveLength(2);
    });

    it('token inválido nunca liga o disjuntor nem é aceito', async () => {
      simularFalhaChecagemRevogacao(true);

      expect(await verifyAuthToken('Bearer token-qualquer')).toBeNull();
      expect(avisosDeRevogacao()).toHaveLength(0);

      // A checagem continua ativa: o próximo token válido ainda tenta consultar
      await verifyAuthToken(`Bearer ${tokenDeTeste('jogador_valido')}`);
      expect(avisosDeRevogacao()).toHaveLength(1);
    });

    it('erros que significam token recusado não caem no caminho sem revogação', async () => {
      simularFalhaChecagemRevogacao(true, 'auth/id-token-revoked');

      expect(await verifyAuthToken(`Bearer ${tokenDeTeste('jogador_revogado')}`)).toBeNull();
      expect(avisosDeRevogacao()).toHaveLength(0);
    });
  });
});
