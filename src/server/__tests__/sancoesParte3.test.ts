import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as apelacaoGet, POST as apelacaoPost } from '@/app/api/apelacao/route';
import { POST as criarRota } from '@/app/api/character/create/route';
import { GET as statusRota } from '@/app/api/status/route';
import { limparCacheRevogacao, verifyAuthToken } from '@/server/auth';
import { createCharacter, updateCharacter } from '@/server/characterService';
import { estadoDoChefeMundial, lutarChefeMundial } from '@/server/chefeMundial';
import { estadoDoCorreio, limparCacheDoCorreio } from '@/server/correio';
import { aplicarSancao, buscarJogador, responderApelacao } from '@/server/jogadores';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import { filaDeRevisao } from '@/server/revisao';
import { ErroContaSancionada, limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { lerRanking, limparCacheDoRanking } from '@/server/social';
import { ErroDoTurnstile, exigirHumano } from '@/server/turnstile';
import { totalDosMembros } from '@/rules/chefeSemanal';
import { podeApelar } from '@/rules/sancoes';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const FORTE = { vigor: 300, sorte: 0, forca: 300, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 50 };
const dono: SessaoMestre = { uid: 'dono1', email: 'dono1@test.com', papel: 'dono', origem: 'ambiente' };
const HOJE = new Date('2026-10-22T18:00:00.000Z');
const AMANHA = new Date('2026-10-23T12:00:00.000Z');
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as Error);
const pedido = (rota: string, uid: string, corpo?: unknown) =>
  new NextRequest(`http://t${rota}`, { method: corpo ? 'POST' : 'GET', headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json', 'x-forwarded-for': '177.1.2.3' }, body: corpo ? JSON.stringify(corpo) : undefined });
const respostaDoCloudflare = (corpo: unknown) => vi.fn(async () => new Response(JSON.stringify(corpo), { status: 200 })) as unknown as typeof fetch;

describe('Etapa 6.5, parte 3', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoCorreio();
    limparCacheDoRanking();
    for (const [uid, nome, nivel] of [['u1', 'Aragorn', 30], ['u2', 'Boromir', 20]] as const) {
      await createCharacter(uid, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
      await updateCharacter(uid, { nivel, atributos: FORTE });
    }
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_SITE_KEY;
    vi.unstubAllGlobals();
  });

  describe('Anti-bot com Turnstile (6.5-5)', () => {
    it('sem as chaves no Cloud Run, nada muda', async () => {
      await expect(exigirHumano(undefined, '1.2.3.4')).resolves.toBeUndefined();
      expect((await (await statusRota(pedido('/api/status', 'u1'))).json()).turnstile).toBeNull();
    });

    it('com as chaves: pede o token, confere no Cloudflare e deixa passar se o Cloudflare cair', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'segredo';
      process.env.TURNSTILE_SITE_KEY = 'chave-publica';
      expect((await (await statusRota(pedido('/api/status', 'u1'))).json()).turnstile).toBe('chave-publica');
      await expect(exigirHumano(undefined, '1.2.3.4')).rejects.toBeInstanceOf(ErroDoTurnstile);
      await expect(exigirHumano('x'.repeat(3000), '1.2.3.4')).rejects.toBeInstanceOf(ErroDoTurnstile);
      const aceita = respostaDoCloudflare({ success: true });
      await exigirHumano('token-bom', '1.2.3.4', aceita);
      const corpo = (aceita as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body as URLSearchParams;
      expect(Object.fromEntries(corpo)).toEqual({ secret: 'segredo', response: 'token-bom', remoteip: '1.2.3.4' });
      await expect(exigirHumano('token-ruim', '1.2.3.4', respostaDoCloudflare({ success: false, 'error-codes': ['invalid-input-response'] }))).rejects.toBeInstanceOf(ErroDoTurnstile);
      const caiu = vi.fn(async () => {
        throw new Error('rede');
      }) as unknown as typeof fetch;
      await expect(exigirHumano('token', '1.2.3.4', caiu)).resolves.toBeUndefined();
    });

    it('a criação do personagem pede o Turnstile quando ele está ligado', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'segredo';
      vi.stubGlobal('fetch', respostaDoCloudflare({ success: false }));
      const sem = await criarRota(pedido('/api/character/create', 'n1', { nome: 'Novato', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS }));
      expect(sem.status).toBe(400);
      expect(await sem.json()).toMatchObject({ turnstile: true, error: expect.stringMatching(/não é um robô/) });
      vi.stubGlobal('fetch', respostaDoCloudflare({ success: true }));
      expect((await criarRota(pedido('/api/character/create', 'n1', { nome: 'Novato', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS, turnstile: 'ok' }))).status).toBe(201);
    });
  });

  describe('Apelação pelo jogo (6.5-7)', () => {
    it('o jogador suspenso vê o motivo, manda um pedido por sanção, e o Mestre recusa ou aceita', async () => {
      await aplicarSancao(dono, 'u1', { acao: 'suspender', dias: 7, motivo: 'uso de automação' });
      expect(await erro(verifyAuthToken(`Bearer ${tokenDeTeste('u1')}`))).toBeInstanceOf(ErroContaSancionada);
      // a apelação aceita a conta sancionada
      const estado = await (await apelacaoGet(pedido('/api/apelacao', 'u1'))).json();
      expect(estado).toMatchObject({ sancao: { tipo: 'suspensao', motivo: 'uso de automação', mensagem: expect.stringMatching(/suspensa/) }, apelacao: null, podeApelar: true });
      expect((await apelacaoPost(pedido('/api/apelacao', 'u1', { texto: 'curto' }))).status).toBe(400);
      const feito = await (await apelacaoPost(pedido('/api/apelacao', 'u1', { texto: 'Eu não usei automação, só jogo rápido no celular.' }))).json();
      expect(feito).toMatchObject({ apelacao: { situacao: 'pendente' }, podeApelar: false });
      expect((await apelacaoPost(pedido('/api/apelacao', 'u1', { texto: 'Mais um pedido para a mesma sanção.' }))).status).toBe(400);
      expect(await filaDeRevisao(dono)).toEqual([expect.objectContaining({ uid: 'u1', tipo: 'apelacao', descricao: expect.stringMatching(/só jogo rápido/) })]);
      // recusa: a sanção continua e a resposta aparece para o jogador
      let ficha = await responderApelacao(dono, 'u1', { decisao: 'recusar', resposta: 'O ritmo das lutas confirma a automação.' });
      expect(ficha.apelacao).toMatchObject({ situacao: 'recusada', resposta: 'O ritmo das lutas confirma a automação.' });
      expect(ficha.sancao).not.toBeNull();
      expect(await filaDeRevisao(dono)).toEqual([]);
      expect(await (await apelacaoGet(pedido('/api/apelacao', 'u1'))).json()).toMatchObject({ apelacao: { situacao: 'recusada' }, podeApelar: false });
      await expect(responderApelacao(dono, 'u1', { decisao: 'aceitar', resposta: 'Mudei de ideia.' })).rejects.toThrow(/não tem pedido/);
      // sanção nova (a suspensão vira banimento), pedido novo; aceito, a conta volta
      await aplicarSancao(dono, 'u1', { acao: 'banir', motivo: 'reincidência confirmada' });
      expect(podeApelar(await repositorio.lerSancao('u1'), new Date())).toBe(true);
      await apelacaoPost(pedido('/api/apelacao', 'u1', { texto: 'Peço que revejam o banimento, por favor.' }));
      ficha = await responderApelacao(dono, 'u1', { decisao: 'aceitar', resposta: 'Revisto: a conta foi liberada.' });
      expect(ficha.sancao).toBeNull();
      expect(await verifyAuthToken(`Bearer ${tokenDeTeste('u1')}`)).toMatchObject({ uid: 'u1' });
    });

    it('quem não está sancionado não pede apelação; a resposta pede texto e decisão válidos', async () => {
      expect(await (await apelacaoGet(pedido('/api/apelacao', 'u2'))).json()).toEqual({ sancao: null, apelacao: null, podeApelar: false });
      expect((await apelacaoPost(pedido('/api/apelacao', 'u2', { texto: 'Quero apelar de algo que não existe.' }))).status).toBe(400);
      await aplicarSancao(dono, 'u2', { acao: 'suspender', dias: 1, motivo: 'teste da resposta' });
      await apelacaoPost(pedido('/api/apelacao', 'u2', { texto: 'Pedido para testar a resposta do Mestre.' }));
      await expect(responderApelacao(dono, 'u2', { decisao: 'talvez', resposta: 'ok ok ok' })).rejects.toThrow(/aceitar ou recusar/);
      await expect(responderApelacao(dono, 'u2', { decisao: 'aceitar', resposta: '' })).rejects.toThrow(/resposta/);
      const suporte: SessaoMestre = { uid: 'sup1', email: 's@t.com', papel: 'suporte', origem: 'painel' };
      await expect(responderApelacao(suporte, 'u2', { decisao: 'aceitar', resposta: 'liberado' })).rejects.toThrow(/não permite/);
    });
  });

  describe('Limite silencioso (6.5-7)', () => {
    it('não bloqueia a conta, aparece na ficha e tira o jogador do ranking', async () => {
      const antes = await lerRanking('nivel');
      expect(antes.entradas.map((e) => e.nome)).toEqual(['Aragorn', 'Boromir']);
      const ficha = await aplicarSancao(dono, 'u1', { acao: 'limitar', motivo: 'suspeita de automação' });
      expect(ficha.limiteSilencioso).toMatchObject({ motivo: 'suspeita de automação', aplicadoPor: 'dono1' });
      expect(ficha.sancao).toBeNull();
      expect(await verifyAuthToken(`Bearer ${tokenDeTeste('u1')}`)).toMatchObject({ uid: 'u1' });
      await expect(aplicarSancao(dono, 'u1', { acao: 'limitar', motivo: 'de novo' })).rejects.toThrow(/já está/);
      limparCacheDoRanking();
      await repositorio.gravarRanking({ criterio: 'nivel', atualizadoEm: '2000-01-01T00:00:00.000Z', entradas: [] });
      expect((await lerRanking('nivel')).entradas.map((e) => e.nome)).toEqual(['Boromir']);
      // tirar o limite: volta ao ranking
      expect((await aplicarSancao(dono, 'u1', { acao: 'tirarLimite', motivo: 'revisado: era jogador rápido' })).limiteSilencioso).toBeNull();
      limparCacheDoRanking();
      await repositorio.gravarRanking({ criterio: 'nivel', atualizadoEm: '2000-01-01T00:00:00.000Z', entradas: [] });
      expect((await lerRanking('nivel')).entradas.map((e) => e.nome)).toEqual(['Aragorn', 'Boromir']);
    });

    it('Chefe Mundial: o dano fica só para o jogador, fora do ranking, e a recompensa é a da última faixa', async () => {
      await aplicarSancao(dono, 'u1', { acao: 'limitar', motivo: 'suspeita de automação' });
      await lutarChefeMundial('u1', 11, HOJE);
      await updateCharacter('u2', { atributos: { ...FORTE, forca: 30 } });
      await lutarChefeMundial('u2', 13, HOJE);
      const meu = await estadoDoChefeMundial('u1', HOJE);
      expect(meu.meuMelhor).toBeGreaterThan(0);
      expect(meu.minhaPosicao).toBeNull();
      expect(meu.ranking.map((r) => r.nome)).toEqual(['Boromir']);
      // Boromir, com menos dano, fica em 1º
      expect((await estadoDoChefeMundial('u2', HOJE)).minhaPosicao).toBe(1);
      expect((await estadoDoCorreio('u2', AMANHA)).mensagens[0].titulo).toBe('Chefe Mundial: 1º lugar');
      const correio = (await estadoDoCorreio('u1', AMANHA)).mensagens;
      expect(correio[0]).toMatchObject({ titulo: 'Chefe Mundial: 101º em diante', presente: { ouro: 1500, diamantes: 5 } });
      // a ficha mostra o limite
      expect((await buscarJogador(dono, 'u1')).limiteSilencioso).not.toBeNull();
    });

    it('Chefe de guildas: o dano de quem está com limite não soma no total da guilda', () => {
      expect(totalDosMembros({ a: { nome: 'A', dano: 100 }, b: { nome: 'B', dano: 50, oculto: true } })).toBe(100);
    });
  });
});
