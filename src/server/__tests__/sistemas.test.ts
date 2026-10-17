import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as statusRota } from '@/app/api/status/route';
import { GET as painelGet, POST as painelPost } from '@/app/api/mestre/sistemas/route';
import { POST as cacadaRota } from '@/app/api/cacada/iniciar/route';
import { GET as meRota } from '@/app/api/character/me/route';
import { limparCacheRevogacao, verifyAuthToken } from '@/server/auth';
import { createCharacter, executarCacada, executarCombate, fabricarArma, updateCharacter } from '@/server/characterService';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import { limparCacheDeSistemas, TTL_CACHE_SISTEMAS_MS } from '@/server/sistemasLeitura';
import { definirSistema, lerSistemasDoPainel } from '@/server/sistemasPainel';
import { ErroManutencao, ErroSistemaDesligado } from '@/server/errosDeSistema';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { configuracaoDoDocumento, configuracaoPadrao, statusPublico } from '@/rules/sistemas';
import { descreverAcao } from '@/lib/mestreTela';
import { resetCharacterStore, setTestSystemsConfigFailHook } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const dono = sessao('dono', 'dono1');
const mestre = sessao('mestre', 'mes1');
const M = 'Correção urgente no servidor';
const FORTE = { vigor: 400, sorte: 0, forca: 300, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 50 };
const bearer = (uid: string) => `Bearer ${tokenDeTeste(uid)}`;

async function jogador(uid: string) {
  await createCharacter(uid, { nome: 'Heroi_' + uid, racaId: 'elfo', classeId: 'cavaleiro', pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 } });
  await updateCharacter(uid, { nivel: 30, atributos: FORTE, ouro: 500 });
}
const req = (url: string, uid?: string, corpo?: unknown) =>
  new NextRequest(`http://t${url}`, { method: corpo ? 'POST' : 'GET', headers: { ...(uid ? { authorization: bearer(uid) } : {}), 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });

describe('Feature flags e modo manutenção (3.5.5.2)', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    await repositorio.gravarPapelMestre({ uid: 'mes1', papel: 'mestre', concedidoPor: 'dono1', concedidoEm: new Date().toISOString(), motivo: 'teste' });
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
    vi.useRealTimers();
  });

  describe('regras', () => {
    it('documento incompleto ou estranho volta ao padrão (tudo ligado); status público só mostra o que importa', () => {
      expect(configuracaoDoDocumento(null)).toEqual(configuracaoPadrao());
      expect(configuracaoDoDocumento({ sistemas: { cacada: 'x' }, manutencao: 3 })).toEqual(configuracaoPadrao());
      const c = configuracaoDoDocumento({ manutencao: { ativa: true, mensagem: 'Voltamos às 18h' }, sistemas: { torre: { ativo: false, mensagem: '' }, inventado: { ativo: false } } });
      const s = statusPublico(c);
      expect(s.manutencao).toEqual({ ativa: true, mensagem: 'Voltamos às 18h' });
      expect(s.desligados).toEqual([{ id: 'torre', nome: 'Provação da Torre Celestial', mensagem: expect.stringMatching(/temporariamente desligado/) }]);
      expect(statusPublico(configuracaoPadrao())).toEqual({ manutencao: { ativa: false, mensagem: '' }, desligados: [] });
    });
  });

  describe('manutenção do jogo todo', () => {
    it('barra o jogador com a mensagem, deixa passar quem tem papel e o Dono, e reabre', async () => {
      await definirSistema(dono, { alvo: 'manutencao', ativo: true, mensagem: 'Voltamos às 18h', motivo: M });
      await expect(verifyAuthToken(bearer('j1'))).rejects.toMatchObject({ name: 'ErroManutencao', message: 'Voltamos às 18h', status: 503 });
      await expect(verifyAuthToken(bearer('j1'))).rejects.toBeInstanceOf(ErroManutencao);
      await expect(verifyAuthToken(bearer('mes1'))).resolves.toMatchObject({ uid: 'mes1' });
      await expect(verifyAuthToken(bearer('dono1'))).resolves.toMatchObject({ uid: 'dono1' });
      await definirSistema(dono, { alvo: 'manutencao', ativo: false, motivo: M });
      await expect(verifyAuthToken(bearer('j1'))).resolves.toMatchObject({ uid: 'j1' });
    });

    it('sem mensagem usa a padrão; token inválido segue sendo null (não vira manutenção)', async () => {
      await definirSistema(dono, { alvo: 'manutencao', ativo: true, motivo: M });
      await expect(verifyAuthToken(bearer('j1'))).rejects.toMatchObject({ message: expect.stringMatching(/em manutenção/) });
      await expect(verifyAuthToken('Bearer lixo')).resolves.toBeNull();
    });

    it('as rotas respondem 503 com manutencao:true; a rota de status é pública', async () => {
      await jogador('j1');
      await definirSistema(dono, { alvo: 'manutencao', ativo: true, mensagem: 'Voltamos às 18h', motivo: M });
      const r = await meRota(req('/api/character/me', 'j1'));
      expect(r.status).toBe(503);
      expect(await r.json()).toMatchObject({ error: 'Voltamos às 18h', manutencao: true });
      const s = await statusRota(req('/api/status'));
      expect(s.status).toBe(200);
      expect(await s.json()).toMatchObject({ manutencao: { ativa: true, mensagem: 'Voltamos às 18h' } });
    });
  });

  describe('sistemas desligados', () => {
    it('desligar a Caçada barra o jogador, mas não os outros sistemas nem quem tem papel', async () => {
      await jogador('j1');
      await jogador('mes1');
      await definirSistema(dono, { alvo: 'cacada', ativo: false, mensagem: 'A Caçada volta amanhã.', motivo: M });
      await expect(executarCacada('j1', 'lobo-cinzento', { seed: 7, combateId: 'cacada-teste-0100' })).rejects.toMatchObject({ name: 'ErroSistemaDesligado', message: 'A Caçada volta amanhã.', sistema: 'cacada' });
      await expect(executarCombate('j1', 'rato-da-peste', { seed: 1 })).resolves.toBeDefined();
      await expect(executarCacada('mes1', 'lobo-cinzento', { seed: 7, combateId: 'cacada-teste-0101' })).resolves.toBeDefined();
      await definirSistema(dono, { alvo: 'cacada', ativo: true, motivo: M });
      await expect(executarCacada('j1', 'lobo-cinzento', { seed: 7, combateId: 'cacada-teste-0102' })).resolves.toBeDefined();
    });

    it('desligar a Forja barra fabricar arma, e a rota da Caçada responde 503 com o id do sistema', async () => {
      await jogador('j1');
      await definirSistema(dono, { alvo: 'forja', ativo: false, motivo: M });
      await expect(fabricarArma('j1', { baseId: 'ferro-de-cacada', categoria: 'lanca' })).rejects.toBeInstanceOf(ErroSistemaDesligado);
      await definirSistema(dono, { alvo: 'cacada', ativo: false, motivo: M });
      const r = await cacadaRota(req('/api/cacada/iniciar', 'j1', { monstroId: 'lobo-cinzento' }));
      expect(r.status).toBe(503);
      expect(await r.json()).toMatchObject({ sistemaDesligado: 'cacada', error: expect.stringMatching(/Caçada/) });
    });
  });

  describe('painel', () => {
    it('só o Dono muda; todos do painel leem; mudança entra no log com antes e depois', async () => {
      await expect(definirSistema(mestre, { alvo: 'torre', ativo: false, motivo: M })).rejects.toMatchObject({ status: 403 });
      await expect(lerSistemasDoPainel(mestre)).resolves.toMatchObject({ manutencao: { ativa: false } });
      await definirSistema(dono, { alvo: 'torre', ativo: false, mensagem: 'Em ajuste', motivo: M }, '1.2.3.4');
      await definirSistema(dono, { alvo: 'manutencao', ativo: true, motivo: M });
      const [m, t] = await repositorio.listarLogAdmin(2);
      expect(t).toMatchObject({ acao: 'sistema.definir', antes: { ativo: true, mensagem: '' }, depois: { ativo: false, mensagem: 'Em ajuste' }, motivo: M, ip: '1.2.3.4', uid: 'dono1' });
      expect(descreverAcao(t)).toMatch(/Desligou o sistema Provação da Torre Celestial/);
      expect(descreverAcao(m)).toMatch(/Fechou o jogo para manutenção/);
    });

    it('valida alvo, ligado/desligado, motivo e tamanho da mensagem; nada é gravado quando falha', async () => {
      await expect(definirSistema(dono, { alvo: 'banco', ativo: false, motivo: M })).rejects.toMatchObject({ status: 400 });
      await expect(definirSistema(dono, { alvo: 'torre', ativo: 'nao', motivo: M })).rejects.toMatchObject({ status: 400 });
      await expect(definirSistema(dono, { alvo: 'torre', ativo: false, motivo: 'x' })).rejects.toMatchObject({ status: 400 });
      await expect(definirSistema(dono, { alvo: 'torre', ativo: false, mensagem: 'a'.repeat(301), motivo: M })).rejects.toMatchObject({ status: 400 });
      expect(await repositorio.listarLogAdmin(5)).toHaveLength(0);
      expect(await repositorio.lerConfiguracaoDeSistemas()).toBeNull();
    });

    it('rotas: Dono muda (200), Mestre lê (200) mas não muda (403), jogador comum nem lê (403)', async () => {
      const post = (uid: string) => painelPost(req('/api/mestre/sistemas', uid, { alvo: 'torre', ativo: false, motivo: M }));
      expect((await post('dono1')).status).toBe(200);
      expect((await post('mes1')).status).toBe(403);
      expect((await painelGet(req('/api/mestre/sistemas', 'mes1'))).status).toBe(200);
      expect((await painelGet(req('/api/mestre/sistemas', 'j1'))).status).toBe(403);
    });
  });

  describe('robustez', () => {
    it('banco fora do ar: o jogo segue aberto (falha aberta) e volta a ler depois', async () => {
      await definirSistema(dono, { alvo: 'manutencao', ativo: true, motivo: M });
      limparCacheDeSistemas();
      setTestSystemsConfigFailHook(() => {
        throw new Error('banco fora do ar');
      });
      await expect(verifyAuthToken(bearer('j1'))).resolves.toMatchObject({ uid: 'j1' });
      setTestSystemsConfigFailHook(null);
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(Date.now() + 6_000);
      await expect(verifyAuthToken(bearer('j1'))).rejects.toBeInstanceOf(ErroManutencao);
    });

    it('mudança feita por outra instância chega depois do cache curto', async () => {
      await expect(verifyAuthToken(bearer('j1'))).resolves.toBeDefined();
      const c = configuracaoPadrao();
      c.manutencao = { ativa: true, mensagem: 'De fora' };
      await repositorio.gravarConfiguracaoDeSistemas(c);
      await expect(verifyAuthToken(bearer('j1'))).resolves.toBeDefined(); // ainda no cache
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(Date.now() + TTL_CACHE_SISTEMAS_MS + 1);
      await expect(verifyAuthToken(bearer('j1'))).rejects.toMatchObject({ message: 'De fora' });
    });
  });
});
