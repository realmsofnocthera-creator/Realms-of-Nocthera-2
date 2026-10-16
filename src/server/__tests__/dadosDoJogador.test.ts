import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as excluirRota } from '@/app/api/mestre/jogadores/[uid]/excluir/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, getCharacterByUid } from '@/server/characterService';
import { ajustarJogador, excluirJogador, exportarJogador, zerarProgressaoDoJogador } from '@/server/jogadores';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import { chaveDoNome } from '@/server/persistencia/tipos';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { loginsRemovidos, tokenDeTeste } from '@/test/firebaseAdminMock';
import { descreverAcao } from '@/lib/mestreTela';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const dono = sessao('dono', 'dono1');
const M = 'Pedido do jogador por e-mail';

async function jogador(uid: string, nome: string) {
  await createCharacter(uid, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
}

describe('Dados do jogador: exportar, zerar e excluir (3.5.4.4)', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    loginsRemovidos.length = 0;
    await jogador('j1', 'Aldric');
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  it('exportar traz personagem, transações, combates, sanção e fica no log; só o Dono', async () => {
    await ajustarJogador(dono, 'j1', { campos: { ouro: 50 }, motivo: 'Ajuste de teste' });
    const x = await exportarJogador(dono, 'j1', '1.2.3.4');
    expect(x).toMatchObject({ uid: 'j1', email: 'j1@test.com', personagem: { nome: 'Aldric', ouro: 50 }, sancao: null, papelNoPainel: null });
    expect(x.transacoes).toHaveLength(1);
    const [e] = await repositorio.listarLogAdmin(1);
    expect(e).toMatchObject({ acao: 'jogador.exportar', alvo: 'j1', ip: '1.2.3.4' });
    expect(descreverAcao(e)).toMatch(/Exportou/);
    await expect(exportarJogador(sessao('mestre'), 'j1')).rejects.toMatchObject({ status: 403 });
    await expect(exportarJogador(dono, 'nadie')).rejects.toMatchObject({ status: 404 });
  });

  describe('zerar progressão', () => {
    it('volta ao nível 1, sem moedas nem mochila, mantém identidade e atributos da criação', async () => {
      const criado = (await getCharacterByUid('j1'))!;
      await ajustarJogador(dono, 'j1', { campos: { ouro: 900, diamantes: 4, xp: 100_000 }, materiais: { 'pelo-de-rato': 7 }, motivo: 'Preparar teste' });
      const f = await zerarProgressaoDoJogador(dono, 'j1', { motivo: M, confirmarNome: 'Aldric' }, '1.1.1.1');
      expect(f.personagem).toMatchObject({ nome: 'Aldric', racaId: 'elfo', classeId: 'cavaleiro', nivel: 1, xpAtual: 0, pontosDisponiveis: 0, ouro: 0, diamantes: 0, torreAndar: 0, inventario: {} });
      expect(f.personagem.atributos).toEqual(criado.atributos);
      expect(f.personagem.criadoEm).toBe(criado.criadoEm);
      // o saldo que existia foi debitado no extrato
      expect(f.transacoes.filter((t) => t.tipo === 'perda').map((t) => t.moeda).sort()).toEqual(['diamantes', 'ouro']);
      const [e] = await repositorio.listarLogAdmin(1);
      expect(e).toMatchObject({ acao: 'jogador.zerar', antes: { nivel: expect.any(Number), ouro: 900 }, motivo: M, ip: '1.1.1.1' });
    });

    it('exige o nome exato e o motivo; nada muda se faltar', async () => {
      await ajustarJogador(dono, 'j1', { campos: { ouro: 10 }, motivo: 'Preparar teste' });
      for (const confirmarNome of [undefined, '', 'aldric', 'Outro']) {
        await expect(zerarProgressaoDoJogador(dono, 'j1', { motivo: M, confirmarNome })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/Confirmação/) });
      }
      await expect(zerarProgressaoDoJogador(dono, 'j1', { motivo: 'x', confirmarNome: 'Aldric' })).rejects.toMatchObject({ status: 400 });
      expect((await getCharacterByUid('j1'))!.ouro).toBe(10);
    });

    it('recusa quem não é Dono, a si mesmo e quem tem papel no painel', async () => {
      await expect(zerarProgressaoDoJogador(sessao('moderador'), 'j1', { motivo: M, confirmarNome: 'Aldric' })).rejects.toMatchObject({ status: 403 });
      await jogador('dono1', 'Chefe');
      await expect(zerarProgressaoDoJogador(dono, 'dono1', { motivo: M, confirmarNome: 'Chefe' })).rejects.toMatchObject({ status: 400 });
      await jogador('m1', 'Mestre_M');
      await repositorio.gravarPapelMestre({ uid: 'm1', papel: 'mestre', concedidoPor: 'dono1', concedidoEm: new Date().toISOString(), motivo: 'teste' });
      await expect(zerarProgressaoDoJogador(dono, 'm1', { motivo: M, confirmarNome: 'Mestre_M' })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/papel/) });
    });
  });

  describe('excluir', () => {
    it('apaga personagem, nome, transações e sanção; libera o nome; remove o login; mantém o log', async () => {
      await ajustarJogador(dono, 'j1', { campos: { ouro: 10 }, motivo: 'Preparar teste' });
      const r = await excluirJogador(dono, 'j1', { motivo: M, confirmarNome: 'Aldric' }, '9.9.9.9');
      expect(r).toEqual({ excluido: true, loginRemovido: true });
      expect(loginsRemovidos).toContain('j1');
      expect(await repositorio.lerPersonagem('j1')).toBeNull();
      expect(await repositorio.lerDonoDoNome(chaveDoNome('Aldric'))).toBeNull();
      expect(await repositorio.listarTransacoes('j1', 10)).toHaveLength(0);
      expect(await repositorio.lerSancao('j1')).toBeNull();
      const [e] = await repositorio.listarLogAdmin(1);
      expect(e).toMatchObject({ acao: 'jogador.excluir', alvo: 'j1', antes: { nome: 'Aldric' }, motivo: M, ip: '9.9.9.9' });
      expect(descreverAcao(e)).toMatch(/Excluiu o jogador j1/);
      // o nome volta a ficar livre
      await expect(jogador('j2', 'Aldric')).resolves.toBeUndefined();
    });

    it('API de login fora do ar: os dados são apagados mesmo assim e avisa loginRemovido=false', async () => {
      await jogador('semlogin1', 'Sem_Login');
      const r = await excluirJogador(dono, 'semlogin1', { motivo: M, confirmarNome: 'Sem_Login' });
      expect(r).toEqual({ excluido: true, loginRemovido: false });
      expect(await repositorio.lerPersonagem('semlogin1')).toBeNull();
    });

    it('confirmação errada, permissão e papel: nada é apagado', async () => {
      await expect(excluirJogador(dono, 'j1', { motivo: M, confirmarNome: 'errado' })).rejects.toMatchObject({ status: 400 });
      await expect(excluirJogador(sessao('mestre'), 'j1', { motivo: M, confirmarNome: 'Aldric' })).rejects.toMatchObject({ status: 403 });
      expect(await repositorio.lerPersonagem('j1')).not.toBeNull();
      expect(await repositorio.listarLogAdmin(5)).toHaveLength(0);
    });

    it('rota: Dono 200; jogador comum 403', async () => {
      const req = (uid: string) => new NextRequest('http://t/api/mestre/jogadores/j1/excluir', {
        method: 'POST',
        headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' },
        body: JSON.stringify({ motivo: M, confirmarNome: 'Aldric' }),
      });
      const ctx = { params: Promise.resolve({ uid: 'j1' }) };
      expect((await excluirRota(req('j1'), ctx)).status).toBe(403);
      expect((await excluirRota(req('dono1'), ctx)).status).toBe(200);
    });
  });
});
