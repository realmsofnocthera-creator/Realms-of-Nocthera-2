import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  concederPapel,
  donosDoAmbiente,
  exigirPermissao,
  listarLog,
  listarPapeis,
  papelDoUsuario,
  revogarPapel,
  type SessaoMestre,
} from '@/server/mestre';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter } from '@/server/characterService';
import { repositorio } from '@/server/persistencia';
import { resetCharacterStore, setTestAdminLogFailHook } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

/** Painel do Mestre: papéis, autorização no servidor e log administrativo. */
describe('Painel do Mestre (servidor)', () => {
  const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
  const bearer = (uid: string) => `Bearer ${tokenDeTeste(uid)}`;
  const dono: SessaoMestre = { uid: 'dono1', email: 'dono1@test.com', papel: 'dono', origem: 'ambiente' };

  async function jogador(uid: string) {
    await createCharacter(uid, { nome: 'Jogador_' + uid, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
  }

  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  describe('quem é Dono', () => {
    it('vem da variável de ambiente (uids separados por vírgula, com espaços e lixo ignorados)', () => {
      process.env.MESTRE_DONO_UIDS = ' a1 , b_2,, c-3 ,tem espaco,';
      expect([...donosDoAmbiente()].sort()).toEqual(['a1', 'b_2', 'c-3']);
    });

    it('sem a variável, ninguém é Dono e o painel fica fechado', async () => {
      delete process.env.MESTRE_DONO_UIDS;
      expect(donosDoAmbiente().size).toBe(0);
      expect(await papelDoUsuario('dono1')).toBeNull();
    });
  });

  describe('exigirPermissao', () => {
    it('sem token ou com token inválido: 401', async () => {
      for (const h of [null, '', 'Bearer', 'Bearer lixo', 'Basic abc']) {
        await expect(exigirPermissao(h, 'painel.entrar'), String(h)).rejects.toMatchObject({ status: 401 });
      }
    });

    it('logado mas sem papel: 403', async () => {
      await jogador('j1');
      await expect(exigirPermissao(bearer('j1'), 'painel.entrar')).rejects.toMatchObject({ status: 403, message: 'Acesso restrito aos Mestres.' });
    });

    it('o Dono do ambiente passa em qualquer permissão', async () => {
      const s = await exigirPermissao(bearer('dono1'), 'papeis.gerir');
      expect(s).toMatchObject({ uid: 'dono1', papel: 'dono', origem: 'ambiente' });
    });

    it('um papel do painel só passa no que a tabela permite', async () => {
      await jogador('m1');
      await repositorio.gravarPapelMestre({ uid: 'm1', papel: 'mestre', concedidoPor: 'dono1', concedidoEm: '2026-10-15T00:00:00.000Z', motivo: 'teste' });
      await expect(exigirPermissao(bearer('m1'), 'mapas.editar')).resolves.toMatchObject({ papel: 'mestre', origem: 'painel' });
      await expect(exigirPermissao(bearer('m1'), 'papeis.gerir')).rejects.toMatchObject({ status: 403, message: 'Seu papel não permite esta ação.' });
    });

    it('um "dono" gravado no banco é ignorado: Dono só vem do ambiente', async () => {
      await repositorio.gravarPapelMestre({ uid: 'x1', papel: 'dono', concedidoPor: 'alguem', concedidoEm: '', motivo: 'forjado' });
      expect(await papelDoUsuario('x1')).toBeNull();
      await expect(exigirPermissao(bearer('x1'), 'painel.entrar')).rejects.toMatchObject({ status: 403 });
    });

    it('um token de antes do logout é recusado', async () => {
      await repositorio.gravarRevogacaoSessoes('dono1', Math.floor(Date.now() / 1000) + 10);
      limparCacheRevogacao();
      await expect(exigirPermissao(bearer('dono1'), 'painel.entrar')).rejects.toMatchObject({ status: 401 });
    });
  });

  describe('conceder papel', () => {
    it('grava o papel e registra no log quem, o quê, antes, depois, motivo e IP', async () => {
      await jogador('j2');
      await concederPapel(dono, { uidAlvo: 'j2', papel: 'mestre', motivo: 'vai cuidar dos mapas' }, '1.2.3.4');
      expect(await papelDoUsuario('j2')).toEqual({ papel: 'mestre', origem: 'painel' });
      const [entrada] = await listarLog(dono);
      expect(entrada).toMatchObject({
        uid: 'dono1', email: 'dono1@test.com', papel: 'dono', acao: 'papel.conceder', alvo: 'j2',
        antes: { papel: null }, depois: { papel: 'mestre' }, motivo: 'vai cuidar dos mapas', ip: '1.2.3.4',
      });
      expect(entrada.id).toMatch(/[0-9a-f-]{36}/);
    });

    it('trocar o papel mostra o papel de antes', async () => {
      await jogador('j3');
      await concederPapel(dono, { uidAlvo: 'j3', papel: 'suporte', motivo: 'começa com leitura' });
      await concederPapel(dono, { uidAlvo: 'j3', papel: 'moderador', motivo: 'agora modera' });
      const [ultima] = await listarLog(dono);
      expect(ultima).toMatchObject({ antes: { papel: 'suporte' }, depois: { papel: 'moderador' } });
    });

    it('recusa: motivo curto ou vazio, papel inválido, "dono", alvo inválido, o próprio papel, o Dono do ambiente e jogador inexistente', async () => {
      await jogador('j4');
      const ok = { uidAlvo: 'j4', papel: 'mestre', motivo: 'motivo bom' };
      const casos: [Record<string, unknown>, number, RegExp][] = [
        [{ motivo: 'abc' }, 400, /motivo/i],
        [{ motivo: '   ' }, 400, /motivo/i],
        [{ motivo: 'x'.repeat(301) }, 400, /motivo/i],
        [{ papel: 'admin' }, 400, /papel válido/i],
        [{ papel: 'dono' }, 400, /Dono vem do ambiente/],
        [{ uidAlvo: '../x' }, 400, /identificador/i],
        [{ uidAlvo: 42 }, 400, /identificador/i],
        [{ uidAlvo: 'dono1' }, 400, /próprio papel/],
        [{ uidAlvo: 'ninguem' }, 404, /Nenhum jogador/],
      ];
      for (const [mudanca, status, texto] of casos) {
        await expect(concederPapel(dono, { ...ok, ...mudanca }), JSON.stringify(mudanca)).rejects.toMatchObject({ status, message: expect.stringMatching(texto) });
      }
      expect(await papelDoUsuario('j4')).toBeNull();
      expect(await listarLog(dono)).toEqual([]); // recusas de validação não chegam a gravar nada
    });

    it('não se muda o Dono do ambiente nem pelo painel', async () => {
      process.env.MESTRE_DONO_UIDS = 'dono1,dono2';
      await jogador('dono2');
      await expect(concederPapel(dono, { uidAlvo: 'dono2', papel: 'suporte', motivo: 'rebaixar' })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/Dono vem do ambiente/) });
      await expect(revogarPapel(dono, { uidAlvo: 'dono2', motivo: 'remover dono' })).rejects.toMatchObject({ status: 400 });
    });

    it('quem não gere papéis não concede nem remove (403), mesmo chamando direto', async () => {
      const mestre: SessaoMestre = { uid: 'm9', email: 'm9@test.com', papel: 'mestre', origem: 'painel' };
      await jogador('j5');
      await expect(concederPapel(mestre, { uidAlvo: 'j5', papel: 'suporte', motivo: 'tentativa' })).rejects.toMatchObject({ status: 403 });
      await expect(revogarPapel(mestre, { uidAlvo: 'j5', motivo: 'tentativa' })).rejects.toMatchObject({ status: 403 });
      await expect(listarPapeis(mestre)).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('revogar papel', () => {
    it('remove o papel e registra o antes e o depois', async () => {
      await jogador('j6');
      await concederPapel(dono, { uidAlvo: 'j6', papel: 'moderador', motivo: 'moderar o chat' });
      await revogarPapel(dono, { uidAlvo: 'j6', motivo: 'saiu da equipe' }, '9.9.9.9');
      expect(await papelDoUsuario('j6')).toBeNull();
      const [entrada] = await listarLog(dono);
      expect(entrada).toMatchObject({ acao: 'papel.revogar', alvo: 'j6', antes: { papel: 'moderador' }, depois: { papel: null }, motivo: 'saiu da equipe', ip: '9.9.9.9' });
    });

    it('quem não tem papel: 404', async () => {
      await jogador('j7');
      await expect(revogarPapel(dono, { uidAlvo: 'j7', motivo: 'sem papel nenhum' })).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('listar papéis', () => {
    it('mostra o Dono do ambiente primeiro e depois os concedidos, com o nome do personagem', async () => {
      await jogador('dono1');
      await jogador('j8');
      await jogador('j9');
      await concederPapel(dono, { uidAlvo: 'j8', papel: 'mestre', motivo: 'primeiro' });
      await concederPapel(dono, { uidAlvo: 'j9', papel: 'suporte', motivo: 'segundo' });
      const lista = await listarPapeis(dono);
      expect(lista.map((p) => [p.uid, p.papel, p.origem])).toEqual([['dono1', 'dono', 'ambiente'], ['j8', 'mestre', 'painel'], ['j9', 'suporte', 'painel']]);
      expect(lista[0].nome).toBe('Jogador_dono1');
      expect(lista[1]).toMatchObject({ concedidoPor: 'dono1', motivo: 'primeiro' });
    });
  });

  describe('log administrativo', () => {
    it('nenhuma ação sem registro: se o log falhar, a mudança não acontece', async () => {
      await jogador('j10');
      setTestAdminLogFailHook(() => {
        throw new Error('banco fora do ar');
      });
      await expect(concederPapel(dono, { uidAlvo: 'j10', papel: 'mestre', motivo: 'sem log não vale' })).rejects.toThrow('banco fora do ar');
      expect(await papelDoUsuario('j10')).toBeNull();
    });

    it('se a mudança falhar depois do log, fica um segundo registro ".falhou"', async () => {
      await jogador('j11');
      const original = repositorio.gravarPapelMestre;
      repositorio.gravarPapelMestre = async () => {
        throw new Error('falha ao gravar');
      };
      try {
        await expect(concederPapel(dono, { uidAlvo: 'j11', papel: 'mestre', motivo: 'vai falhar' })).rejects.toThrow('falha ao gravar');
      } finally {
        repositorio.gravarPapelMestre = original;
      }
      const log = await listarLog(dono);
      expect(log.map((e) => e.acao).sort()).toEqual(['papel.conceder', 'papel.conceder.falhou']);
      expect(await papelDoUsuario('j11')).toBeNull();
    });

    it('o repositório não aceita registro com o mesmo id (o log não se sobrescreve)', async () => {
      const base = { id: 'fixo', criadoEm: '2026-10-15T10:00:00.000Z', uid: 'dono1', email: 'e@x', papel: 'dono' as const, acao: 'a' };
      await repositorio.registrarLogAdmin(base);
      await expect(repositorio.registrarLogAdmin({ ...base, acao: 'b' })).rejects.toBeTruthy();
      expect((await repositorio.listarLogAdmin(10)).map((e) => e.acao)).toEqual(['a']);
    });

    it('lista do mais recente para o mais antigo e respeita o limite (padrão 50, máximo 200)', async () => {
      for (let i = 0; i < 5; i++) {
        await repositorio.registrarLogAdmin({ id: `e${i}`, criadoEm: `2026-10-15T10:00:0${i}.000Z`, uid: 'dono1', email: 'e@x', papel: 'dono', acao: `a${i}` });
      }
      expect((await listarLog(dono)).map((e) => e.acao)).toEqual(['a4', 'a3', 'a2', 'a1', 'a0']);
      expect((await listarLog(dono, 2)).map((e) => e.acao)).toEqual(['a4', 'a3']);
      expect((await listarLog(dono, '3')).length).toBe(3);
      expect((await listarLog(dono, -5)).length).toBe(5); // inválido volta ao padrão
      expect((await listarLog(dono, 99999)).length).toBe(5); // acima do máximo vira 200
    });
  });
});
