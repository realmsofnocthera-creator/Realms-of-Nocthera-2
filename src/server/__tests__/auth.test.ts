import { describe, it, expect, beforeEach, vi } from 'vitest';
import { verifyAuthToken, revokeUserSessions } from '@/server/auth';
import {
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

  it('se a checagem de revogação não puder rodar (permissão), ainda valida o token e registra alerta', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    simularFalhaChecagemRevogacao(true);

    expect(await verifyAuthToken(`Bearer ${tokenDeTeste('jogador_sem_perm')}`)).toEqual({
      uid: 'jogador_sem_perm',
      email: 'jogador_sem_perm@test.com',
    });
    expect(await verifyAuthToken('Bearer token-qualquer')).toBeNull();
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('auth.checagem_revogacao_falhou'));
    aviso.mockRestore();
  });
});
