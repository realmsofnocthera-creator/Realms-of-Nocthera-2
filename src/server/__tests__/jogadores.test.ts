import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as buscar } from '@/app/api/mestre/jogadores/route';
import { POST as sancionar } from '@/app/api/mestre/jogadores/[uid]/sancoes/route';
import { GET as personagemMe } from '@/app/api/character/me/route';
import { limparCacheRevogacao, verifyAuthToken } from '@/server/auth';
import { createCharacter } from '@/server/characterService';
import { aplicarSancao, buscarJogador } from '@/server/jogadores';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import { ErroContaSancionada, limparCacheDeSancoes } from '@/server/sancoes';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const dono = sessao('dono', 'dono1');
const moderador = sessao('moderador', 'mod1');
const suporte = sessao('suporte', 'sup1');
const mestre = sessao('mestre', 'mes1');
const bearer = (uid: string) => `Bearer ${tokenDeTeste(uid)}`;

async function jogador(uid: string, nome = 'Jogador_' + uid) {
  await createCharacter(uid, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
}
async function papel(uid: string, p: 'mestre' | 'moderador' | 'suporte') {
  await repositorio.gravarPapelMestre({ uid, papel: p, concedidoPor: 'dono1', concedidoEm: new Date().toISOString(), motivo: 'teste' });
}

describe('Gestão de jogadores (servidor)', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    await jogador('j1', 'Aldric');
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  describe('busca e ficha (3.5.4.1)', () => {
    it('acha por nome (sem diferenciar maiúsculas), por uid e por e-mail', async () => {
      for (const busca of ['Aldric', 'aldric', 'j1', 'j1@test.com', ' ALDRIC ']) {
        const f = await buscarJogador(suporte, busca);
        expect(f.uid).toBe('j1');
        expect(f.personagem.nome).toBe('Aldric');
        expect(f.email).toBe('j1@test.com');
      }
    });

    it('a ficha traz o personagem, o saldo, a situação e as transações mais recentes primeiro', async () => {
      await jogador('j2', 'Borin');
      const f = await buscarJogador(suporte, 'Borin');
      expect(f.personagem).toMatchObject({ nivel: 1, racaId: 'elfo', classeId: 'cavaleiro', diamantes: 0, quantidadeDeArmas: 0 });
      expect(f).toMatchObject({ sancao: null, advertencias: [], papelNoPainel: null });
      await repositorio.executarTransacao('teste', async (ctx) => {
        ctx.registrarTransacao({ uid: 'j2', tipo: 'ganho', quantidade: 5, moeda: 'ouro', motivo: 'antiga', timestamp: '2026-10-01T10:00:00.000Z' });
        ctx.registrarTransacao({ uid: 'j2', tipo: 'perda', quantidade: 2, moeda: 'diamantes', motivo: 'nova', timestamp: '2026-10-02T10:00:00.000Z' });
      });
      const g = await buscarJogador(suporte, 'j2');
      expect(g.transacoes.map((t) => t.motivo)).toEqual(['nova', 'antiga']);
      expect(g.transacoes.every((t) => t.uid === 'j2')).toBe(true);
    });

    it('mostra o papel de quem é do painel', async () => {
      await jogador('m1');
      await papel('m1', 'mestre');
      expect((await buscarJogador(suporte, 'm1')).papelNoPainel).toBe('mestre');
    });

    it('não achou: 404 com a dica do nome inteiro; busca vazia ou curta: 400; e-mail sem conta: 404', async () => {
      await expect(buscarJogador(suporte, 'Ald')).rejects.toMatchObject({ status: 404, message: expect.stringMatching(/nome inteiro/) });
      await expect(buscarJogador(suporte, 'a')).rejects.toMatchObject({ status: 400 });
      await expect(buscarJogador(suporte, '')).rejects.toMatchObject({ status: 400 });
      await expect(buscarJogador(suporte, 12)).rejects.toMatchObject({ status: 400 });
      await expect(buscarJogador(suporte, 'fantasma@exemplo.com')).rejects.toMatchObject({ status: 404 });
    });

    it('e-mail de conta sem personagem: 404 explicando; API de e-mail fora do ar: 503 com a alternativa', async () => {
      await expect(buscarJogador(suporte, 'semperso@test.com')).rejects.toMatchObject({ status: 404, message: expect.stringMatching(/ainda não criou/) });
      await expect(buscarJogador(suporte, 'indisponivel@test.com')).rejects.toMatchObject({ status: 503, message: expect.stringMatching(/nome do personagem/) });
    });

    it('consultar fica no log, com o IP (são dados pessoais)', async () => {
      await buscarJogador(suporte, 'Aldric', '1.2.3.4');
      const [e] = await repositorio.listarLogAdmin(1);
      expect(e).toMatchObject({ acao: 'jogador.consultar', alvo: 'j1', uid: 'sup1', ip: '1.2.3.4' });
    });
  });

  describe('sanções (3.5.4.3)', () => {
    it('só Moderador e Dono sancionam: Suporte e Mestre recebem 403', async () => {
      for (const quem of [suporte, mestre]) {
        await expect(aplicarSancao(quem, 'j1', { acao: 'banir', motivo: 'tentativa' })).rejects.toMatchObject({ status: 403 });
      }
      await expect(aplicarSancao(moderador, 'j1', { acao: 'advertir', motivo: 'linguagem' })).resolves.toBeTruthy();
      await expect(aplicarSancao(dono, 'j1', { acao: 'advertir', motivo: 'de novo' })).resolves.toBeTruthy();
    });

    it('advertir guarda no histórico e não bloqueia a conta', async () => {
      const f = await aplicarSancao(moderador, 'j1', { acao: 'advertir', motivo: 'linguagem' });
      expect(f.advertencias).toMatchObject([{ por: 'mod1', motivo: 'linguagem' }]);
      expect(f.sancao).toBeNull();
      await expect(verifyAuthToken(bearer('j1'))).resolves.toMatchObject({ uid: 'j1' });
    });

    it('guarda só as 20 advertências mais recentes', async () => {
      for (let i = 1; i <= 22; i++) await aplicarSancao(moderador, 'j1', { acao: 'advertir', motivo: `aviso ${i}` });
      const f = await buscarJogador(suporte, 'j1');
      expect(f.advertencias).toHaveLength(20);
      expect(f.advertencias[0].motivo).toBe('aviso 3');
      expect(f.advertencias[19].motivo).toBe('aviso 22');
    });

    it('suspender com prazo bloqueia na hora, com o motivo, e a suspensão vencida libera sozinha', async () => {
      const f = await aplicarSancao(moderador, 'j1', { acao: 'suspender', dias: 3, motivo: 'ofensas no chat' });
      expect(f.sancao).toMatchObject({ tipo: 'suspensao', motivo: 'ofensas no chat' });
      const ate = Date.parse(f.sancao!.ate!);
      expect(ate - Date.now()).toBeGreaterThan(3 * 86_400_000 - 5000);
      expect(ate - Date.now()).toBeLessThanOrEqual(3 * 86_400_000);
      await expect(verifyAuthToken(bearer('j1'))).rejects.toBeInstanceOf(ErroContaSancionada);
      await expect(verifyAuthToken(bearer('j1'))).rejects.toMatchObject({ message: expect.stringMatching(/^Sua conta está suspensa até .* Motivo: ofensas no chat$/) });
      // o prazo passa: grava o documento com o fim no passado e limpa o cache
      await repositorio.gravarSancao({ ...(await repositorio.lerSancao('j1'))!, ate: new Date(Date.now() - 1000).toISOString() });
      limparCacheDeSancoes();
      await expect(verifyAuthToken(bearer('j1'))).resolves.toMatchObject({ uid: 'j1' });
    });

    it('banir bloqueia sem prazo; desbanir libera; levantar a suspensão também', async () => {
      await aplicarSancao(moderador, 'j1', { acao: 'banir', motivo: 'fraude comprovada' });
      await expect(verifyAuthToken(bearer('j1'))).rejects.toMatchObject({ sancao: { tipo: 'banimento' } });
      const livre = await aplicarSancao(moderador, 'j1', { acao: 'desbanir', motivo: 'recurso aceito' });
      expect(livre.sancao).toBeNull();
      await expect(verifyAuthToken(bearer('j1'))).resolves.toMatchObject({ uid: 'j1' });
      await aplicarSancao(moderador, 'j1', { acao: 'suspender', dias: 1, motivo: 'teste' });
      await aplicarSancao(moderador, 'j1', { acao: 'desbanir', motivo: 'engano' });
      expect((await buscarJogador(suporte, 'j1')).sancao).toBeNull();
    });

    it('a sessão aberta antes do bloqueio é barrada com o motivo (403) e volta a valer ao liberar, sem novo login', async () => {
      const antigo = `Bearer ${tokenDeTeste('j1', Math.floor(Date.now() / 1000) - 60)}`;
      await expect(verifyAuthToken(antigo)).resolves.toBeTruthy();
      await aplicarSancao(moderador, 'j1', { acao: 'banir', motivo: 'fraude comprovada' });
      await expect(verifyAuthToken(antigo)).rejects.toMatchObject({ message: expect.stringMatching(/banida.*fraude comprovada/) });
      await aplicarSancao(moderador, 'j1', { acao: 'desbanir', motivo: 'recurso aceito' });
      await expect(verifyAuthToken(antigo)).resolves.toMatchObject({ uid: 'j1' });
    });

    it('regras de estado: banir duas vezes, suspender banido e desbanir quem está livre dão 400', async () => {
      await expect(aplicarSancao(moderador, 'j1', { acao: 'desbanir', motivo: 'sem sanção' })).rejects.toMatchObject({ status: 400 });
      await aplicarSancao(moderador, 'j1', { acao: 'banir', motivo: 'fraude comprovada' });
      await expect(aplicarSancao(moderador, 'j1', { acao: 'banir', motivo: 'de novo' })).rejects.toMatchObject({ status: 400 });
      await expect(aplicarSancao(moderador, 'j1', { acao: 'suspender', dias: 2, motivo: 'banido' })).rejects.toMatchObject({ status: 400 });
    });

    it('banir um suspenso vale (a sanção sobe); prolongar a suspensão troca o prazo', async () => {
      await aplicarSancao(moderador, 'j1', { acao: 'suspender', dias: 1, motivo: 'primeira' });
      const longa = await aplicarSancao(moderador, 'j1', { acao: 'suspender', dias: 30, motivo: 'reincidência' });
      expect(Date.parse(longa.sancao!.ate!) - Date.now()).toBeGreaterThan(29 * 86_400_000);
      const banido = await aplicarSancao(moderador, 'j1', { acao: 'banir', motivo: 'fraude comprovada' });
      expect(banido.sancao).toMatchObject({ tipo: 'banimento', ate: null });
    });

    it('valida o pedido: ação, dias, motivo e alvo', async () => {
      await expect(aplicarSancao(moderador, 'j1', { acao: 'expulsar', motivo: 'motivo ok' })).rejects.toMatchObject({ status: 400 });
      for (const dias of [undefined, 0, 366, 1.5, '3']) {
        await expect(aplicarSancao(moderador, 'j1', { acao: 'suspender', dias, motivo: 'motivo ok' })).rejects.toMatchObject({ status: 400 });
      }
      await expect(aplicarSancao(moderador, 'j1', { acao: 'banir', motivo: 'ok' })).rejects.toMatchObject({ status: 400 });
      await expect(aplicarSancao(moderador, '../x', { acao: 'banir', motivo: 'motivo ok' })).rejects.toMatchObject({ status: 400 });
      await expect(aplicarSancao(moderador, 'naoexiste', { acao: 'banir', motivo: 'motivo ok' })).rejects.toMatchObject({ status: 404 });
    });

    it('ninguém sanciona a si mesmo, o Dono, nem quem tem papel no painel', async () => {
      await jogador('mod1');
      await jogador('dono1');
      await jogador('m2');
      await papel('mod1', 'moderador');
      await papel('m2', 'mestre');
      await expect(aplicarSancao(moderador, 'mod1', { acao: 'banir', motivo: 'a mim mesmo' })).rejects.toMatchObject({ status: 400 });
      await expect(aplicarSancao(moderador, 'dono1', { acao: 'banir', motivo: 'o dono' })).rejects.toMatchObject({ status: 400 });
      await expect(aplicarSancao(moderador, 'm2', { acao: 'banir', motivo: 'um mestre' })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/papel no painel/) });
      expect((await repositorio.lerSancao('m2'))).toBeNull();
    });

    it('cada sanção vai para o log com antes, depois, motivo e IP, e o log vem antes da mudança', async () => {
      await aplicarSancao(moderador, 'j1', { acao: 'suspender', dias: 7, motivo: 'ofensas no chat' }, '9.9.9.9');
      const [e] = await repositorio.listarLogAdmin(1);
      expect(e).toMatchObject({ acao: 'jogador.suspender', alvo: 'j1', uid: 'mod1', motivo: 'ofensas no chat', ip: '9.9.9.9', antes: { tipo: null, ate: null }, depois: { tipo: 'suspensao', dias: 7 } });
      const { setTestAdminLogFailHook } = await import('@/test/repositorioMemoria');
      setTestAdminLogFailHook(() => {
        throw new Error('log fora do ar');
      });
      await expect(aplicarSancao(moderador, 'j1', { acao: 'banir', motivo: 'sem log não muda' })).rejects.toThrow('log fora do ar');
      setTestAdminLogFailHook(null);
      expect((await repositorio.lerSancao('j1'))!.tipo).toBe('suspensao');
    });
  });

  describe('rotas', () => {
    let ip = 0;
    const pedido = (url: string, uid: string | null, metodo = 'GET', corpo?: unknown) =>
      new NextRequest(`http://localhost${url}`, {
        method: metodo,
        headers: { ...(uid ? { authorization: bearer(uid) } : {}), 'content-type': 'application/json', 'x-forwarded-for': `10.2.0.${++ip % 250}` },
        ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
      });
    const params = (uid: string) => ({ params: Promise.resolve({ uid }) });

    beforeEach(async () => {
      await papel('sup1', 'suporte');
      await papel('mod1', 'moderador');
    });

    it('401 sem login, 403 sem papel; o Suporte busca mas não sanciona', async () => {
      expect((await buscar(pedido('/api/mestre/jogadores?busca=Aldric', null))).status).toBe(401);
      expect((await buscar(pedido('/api/mestre/jogadores?busca=Aldric', 'j1'))).status).toBe(403);
      const ok = await buscar(pedido('/api/mestre/jogadores?busca=Aldric', 'sup1'));
      expect(ok.status).toBe(200);
      expect((await ok.json()).jogador.personagem.nome).toBe('Aldric');
      expect((await sancionar(pedido('/api/mestre/jogadores/j1/sancoes', 'sup1', 'POST', { acao: 'banir', motivo: 'tentativa' }), params('j1'))).status).toBe(403);
      expect((await buscar(pedido('/api/mestre/jogadores?busca=', 'sup1'))).status).toBe(400);
    });

    it('o Moderador bane pela API e o jogador recebe 403 com o motivo nas outras rotas do jogo', async () => {
      const r = await sancionar(pedido('/api/mestre/jogadores/j1/sancoes', 'mod1', 'POST', { acao: 'suspender', dias: 2, motivo: 'ofensas no chat' }), params('j1'));
      expect(r.status).toBe(200);
      expect((await r.json()).jogador.sancao.tipo).toBe('suspensao');
      const jogo = await personagemMe(pedido('/api/character/me', 'j1'));
      expect(jogo.status).toBe(403);
      expect(await jogo.json()).toMatchObject({ contaSancionada: true, tipo: 'suspensao', error: expect.stringMatching(/Motivo: ofensas no chat/) });
      // corpo quebrado e ação inválida
      const ruim = new NextRequest('http://localhost/api/mestre/jogadores/j1/sancoes', { method: 'POST', headers: { authorization: bearer('mod1'), 'content-type': 'application/json', 'x-forwarded-for': '10.2.9.9' }, body: '{quebrado' });
      expect((await sancionar(ruim, params('j1'))).status).toBe(400);
    });
  });
});
