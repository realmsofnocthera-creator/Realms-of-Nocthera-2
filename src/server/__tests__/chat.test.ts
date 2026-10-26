import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as chatGet, POST as chatPost } from '@/app/api/chat/route';
import { GET as chatMestreGet, POST as chatMestrePost } from '@/app/api/mestre/chat/route';
import { limparCacheRevogacao } from '@/server/auth';
import { apagarMensagensDoJogador, bloquearAutor, denunciarMensagem, desbloquearPorNome, enviarMensagem, estadoDoChat, limparCacheDoChat } from '@/server/chat';
import { apagarMensagemDoMestre, lerCanalDoMestre, silenciarNoChat, tirarSilencioDoChat } from '@/server/chatMestre';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { agirNaGuilda, limparCacheDasGuildas } from '@/server/guildas';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { censurarOfensas } from '@/rules/nomesProibidos';
import { prepararTexto, TEXTO_MAXIMO_DO_CHAT } from '@/rules/chat';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const dono = sessao('dono', 'dono1');
const moderador = sessao('moderador', 'mod1');
const suporte = sessao('suporte', 'sup1');
const NOMES: Record<string, string> = { u1: 'Aragorn', u2: 'Boromir', u3: 'Celeborn', novato: 'Novato' };
const T0 = new Date('2026-10-26T15:00:00.000Z');
const depois = (s: number) => new Date(T0.getTime() + s * 1000);
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as { status?: number; message: string });

describe('Chat (7.7): regras do texto', () => {
  it('ofensa pesada vira ***, link vira ***, e o resto fica', () => {
    expect(censurarOfensas('que filho da puta')).toEqual({ texto: 'que filho da ***', mudou: true });
    expect(censurarOfensas('olha caralho isso').texto).toBe('olha *** isso');
    expect(censurarOfensas('entra em https://exemplo.com/convite agora').texto).toBe('entra em *** agora');
    expect(censurarOfensas('visita meusite.com.br e www.x.gg').texto).toBe('visita *** e ***');
    expect(censurarOfensas('bom dia, pessoal! Alguém quer fazer o Teste de Equipe?')).toEqual({ texto: 'bom dia, pessoal! Alguém quer fazer o Teste de Equipe?', mudou: false });
    // letras separadas: a mensagem inteira vira ***
    expect(censurarOfensas('c a r a l h o').texto).toBe('***');
  });

  it('prepara o texto: espaços, tamanho e vazio', () => {
    expect(prepararTexto('   oi   tudo\n bem  ')).toEqual({ texto: 'oi tudo bem', mudou: false });
    expect(prepararTexto('   ')).toBeNull();
    expect(prepararTexto(42)).toBeNull();
    const longo = prepararTexto('a'.repeat(500))!;
    expect(longo.texto).toHaveLength(TEXTO_MAXIMO_DO_CHAT);
    expect(longo.mudou).toBe(true);
  });
});

describe('Chat (7.7): servidor', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDasGuildas();
    limparCacheDoChat();
    for (const [uid, nome] of Object.entries(NOMES)) await createCharacter(uid, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    for (const uid of ['u1', 'u2', 'u3']) await updateCharacter(uid, { nivel: 12, ouro: 6000 });
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  it('o Global abre para falar no nível 5, mas qualquer um lê; as mensagens chegam em ordem e a tela pede só as novas', async () => {
    const e0 = await estadoDoChat('novato', 'global', undefined, T0);
    expect(e0).toMatchObject({ canal: 'global', podeEnviar: false, motivoSemEnvio: expect.stringMatching(/nível 5/), mensagens: [] });
    expect((await erro(enviarMensagem('novato', 'global', 'oi', T0)))?.message).toMatch(/nível 5/);
    const a = await enviarMensagem('u1', 'global', 'Bom dia!', T0);
    expect(a.mensagem).toMatchObject({ nome: 'Aragorn', texto: 'Bom dia!', minha: true });
    await enviarMensagem('u2', 'global', 'Olá!', depois(1));
    const tudo = await estadoDoChat('u3', 'global', undefined, depois(2));
    expect(tudo.mensagens.map((m) => `${m.nome}: ${m.texto}`)).toEqual(['Aragorn: Bom dia!', 'Boromir: Olá!']);
    expect(tudo.mensagens.every((m) => !('uid' in m))).toBe(true);
    expect(tudo.podeEnviar).toBe(true);
    // só as novas, depois da última que a tela tem
    await enviarMensagem('u3', 'global', 'Cheguei', depois(3));
    limparCacheDoChat();
    const novas = await estadoDoChat('u1', 'global', tudo.mensagens[1].id, depois(4));
    expect(novas.mensagens.map((m) => m.texto)).toEqual(['Cheguei']);
    expect(novas.mensagens[0].minha).toBe(false);
    expect(novas.ids).toHaveLength(3);
  });

  it('uma mensagem a cada 5 s no Global; o canal guarda só as últimas 50', async () => {
    await enviarMensagem('u1', 'global', 'um', T0);
    expect((await erro(enviarMensagem('u1', 'global', 'dois', depois(3))))).toMatchObject({ status: 429, message: expect.stringMatching(/Espere 2 s/) });
    await enviarMensagem('u1', 'global', 'dois', depois(5));
    for (let i = 0; i < 55; i++) await enviarMensagem('u2', 'global', `msg ${i}`, depois(10 + i * 6));
    const e = await estadoDoChat('u3', 'global', undefined, depois(1000));
    expect(e.mensagens).toHaveLength(50);
    expect(e.mensagens.at(-1)!.texto).toBe('msg 54');
  });

  it('o filtro troca ofensas e links por *** e avisa que mudou', async () => {
    const r = await enviarMensagem('u1', 'global', 'seu filho da puta, entra em https://golpe.com', T0);
    expect(r).toMatchObject({ filtrada: true, mensagem: { texto: 'seu filho da ***, entra em ***' } });
    expect((await enviarMensagem('u2', 'global', 'oi', T0)).filtrada).toBe(false);
    expect((await erro(enviarMensagem('u3', 'global', '   ', T0)))?.message).toMatch(/Escreva/);
  });

  it('a Guilda é só dos membros e cada guilda tem o seu canal', async () => {
    await agirNaGuilda('u1', 'criar', { nome: 'Folhaviva' });
    const g1 = (await getCharacterByUid('u1'))!.guildaId!;
    await agirNaGuilda('u1', 'convidar', { nome: 'Boromir' });
    await agirNaGuilda('u2', 'aceitarConvite', { guildaId: g1 });
    await agirNaGuilda('u3', 'criar', { nome: 'Lorien' });
    limparCacheDoChat();
    expect((await erro(enviarMensagem('novato', 'guilda', 'oi', T0)))?.message).toMatch(/não está numa guilda/);
    expect((await erro(estadoDoChat('novato', 'guilda', undefined, T0)))?.message).toMatch(/não está numa guilda/);
    expect((await estadoDoChat('novato', 'global', undefined, T0)).canais).toEqual([expect.objectContaining({ id: 'global', disponivel: true }), expect.objectContaining({ id: 'guilda', disponivel: false })]);
    await enviarMensagem('u1', 'guilda', 'reunião hoje', T0);
    await enviarMensagem('u3', 'guilda', 'só da Lorien', depois(1));
    expect((await estadoDoChat('u2', 'guilda', undefined, depois(2))).mensagens.map((m) => m.texto)).toEqual(['reunião hoje']);
    expect((await estadoDoChat('u3', 'guilda', undefined, depois(2))).mensagens.map((m) => m.texto)).toEqual(['só da Lorien']);
    // na Guilda o intervalo é de 2 s
    expect((await erro(enviarMensagem('u1', 'guilda', 'de novo', depois(1))))?.message).toMatch(/Espere 1 s/);
    await enviarMensagem('u1', 'guilda', 'de novo', depois(2));
    // e nada vaza para o Global
    expect((await estadoDoChat('u2', 'global', undefined, depois(3))).mensagens).toHaveLength(0);
  });

  it('bloquear esconde as mensagens do jogador; desbloquear volta; o limite é 100', async () => {
    const m = (await enviarMensagem('u2', 'global', 'sou o Boromir', T0)).mensagem;
    await enviarMensagem('u3', 'global', 'sou o Celeborn', depois(1));
    expect((await erro(bloquearAutor('u2', 'global', m.id, depois(2))))?.message).toMatch(/a si mesmo/);
    await bloquearAutor('u1', 'global', m.id, depois(2));
    const e = await estadoDoChat('u1', 'global', undefined, depois(3));
    expect(e.mensagens.map((x) => x.nome)).toEqual(['Celeborn']);
    expect(e.bloqueados).toEqual(['Boromir']);
    expect((await erro(bloquearAutor('u1', 'global', m.id, depois(2))))).toMatchObject({ status: 409 });
    // o Boromir segue vendo todo mundo
    expect((await estadoDoChat('u3', 'global', undefined, depois(3))).mensagens).toHaveLength(2);
    await desbloquearPorNome('u1', 'Boromir');
    expect((await estadoDoChat('u1', 'global', undefined, depois(4))).mensagens).toHaveLength(2);
    expect((await erro(desbloquearPorNome('u1', 'Boromir')))).toMatchObject({ status: 404 });
    // limite
    await updateCharacter('u1', { bloqueadosNoChat: Array.from({ length: 100 }, (_, i) => ({ uid: `x${i}`, nome: `Fulano${i}` })) });
    limparCacheDoChat();
    expect((await erro(bloquearAutor('u1', 'global', m.id, depois(5))))?.message).toMatch(/100 jogadores/);
  });

  it('denunciar manda para a fila de revisão com a mensagem e o contexto, e diz o prazo', async () => {
    await enviarMensagem('u1', 'global', 'primeira', T0);
    const ruim = (await enviarMensagem('u2', 'global', 'mensagem ruim', depois(6))).mensagem;
    const r = await denunciarMensagem('u1', 'global', ruim.id, depois(7));
    expect(r.mensagem).toMatch(/48 horas/);
    const fila = await repositorio.listarRevisoesPendentes(10);
    expect(fila).toHaveLength(1);
    expect(fila[0]).toMatchObject({ uid: 'u2', nome: 'Boromir', tipo: 'denunciaDeChat', revisada: false });
    expect(fila[0].descricao).toMatch(/Denunciado por Aragorn.*mensagem ruim.*Aragorn: primeira/);
    expect((await erro(denunciarMensagem('u2', 'global', ruim.id, depois(8))))?.message).toMatch(/a si mesmo/);
    expect((await erro(denunciarMensagem('u1', 'global', 'naoexiste', depois(8))))).toMatchObject({ status: 404 });
  });

  it('o Moderador silencia por tempo certo; o silêncio vale na hora, vence sozinho e tira-se com motivo', async () => {
    await enviarMensagem('u2', 'global', 'xingando', T0);
    const r = await silenciarNoChat(moderador, { uid: 'u2', duracao: '1h', motivo: 'ofensas repetidas' }, '200.1.2.3');
    expect(r.mensagem).toMatch(/1 hora/);
    const e = await estadoDoChat('u2', 'global', undefined, new Date());
    expect(e).toMatchObject({ podeEnviar: false, motivoSemEnvio: expect.stringMatching(/silenciado no chat até.*ofensas repetidas/) });
    const bloqueada = await erro(enviarMensagem('u2', 'global', 'oi', new Date(Date.now() + 10_000)));
    expect(bloqueada).toMatchObject({ status: 403, message: expect.stringMatching(/silenciado/) });
    // vence sozinho (1 hora depois)
    await expect(enviarMensagem('u2', 'global', 'voltei', new Date(Date.now() + 3_700_000))).resolves.toBeTruthy();
    // levantar
    await silenciarNoChat(dono, { uid: 'u3', duracao: '7d', motivo: 'spam repetido' });
    await tirarSilencioDoChat(moderador, { uid: 'u3', motivo: 'foi engano' });
    await expect(enviarMensagem('u3', 'global', 'livre', new Date(Date.now() + 10_000))).resolves.toBeTruthy();
    const log = await repositorio.listarLogAdmin(10);
    expect(log.map((l) => l.acao)).toEqual(expect.arrayContaining(['chat.silenciar', 'chat.tirarSilencio']));
    expect(log.find((l) => l.acao === 'chat.silenciar' && l.alvo === 'u2')).toMatchObject({ papel: 'moderador', motivo: 'ofensas repetidas', depois: { duracao: '1h' } });
  });

  it('silenciar exige papel, motivo, duração válida e um alvo que não seja a equipe', async () => {
    expect(await erro(silenciarNoChat(suporte, { uid: 'u2', duracao: '1h', motivo: 'spam spam' }))).toMatchObject({ status: 403 });
    expect(await erro(silenciarNoChat(moderador, { uid: 'u2', duracao: '1h' }))).toMatchObject({ status: 400 });
    expect(await erro(silenciarNoChat(moderador, { uid: 'u2', duracao: '2h', motivo: 'spam spam' }))).toMatchObject({ status: 400 });
    expect(await erro(silenciarNoChat(moderador, { uid: 'mod1', duracao: '1h', motivo: 'spam spam' }))).toMatchObject({ status: 400 });
    expect(await erro(silenciarNoChat(moderador, { uid: 'dono1', duracao: '1h', motivo: 'spam spam' }))).toMatchObject({ status: 400 });
    expect(await erro(silenciarNoChat(moderador, { uid: 'naoexiste', duracao: '1h', motivo: 'spam spam' }))).toMatchObject({ status: 404 });
    expect(await erro(tirarSilencioDoChat(moderador, { uid: 'u2', motivo: 'sem silêncio' }))).toMatchObject({ status: 400 });
  });

  it('o Mestre lê o canal e apaga uma mensagem; a tela some com ela e o log guarda o texto', async () => {
    const ruim = (await enviarMensagem('u2', 'global', 'texto indevido', T0)).mensagem;
    await enviarMensagem('u1', 'global', 'texto normal', depois(6));
    const canal = await lerCanalDoMestre(suporte, 'global');
    expect(canal.mensagens.map((m) => m.texto)).toEqual(['texto normal', 'texto indevido']);
    expect(canal.mensagens[1]).toMatchObject({ uid: 'u2', silenciado: false });
    expect(await erro(apagarMensagemDoMestre(suporte, { canal: 'global', mensagem: ruim.id, motivo: 'ofensivo' }))).toMatchObject({ status: 403 });
    expect(await erro(apagarMensagemDoMestre(moderador, { canal: 'global', mensagem: ruim.id }))).toMatchObject({ status: 400 });
    expect(await erro(lerCanalDoMestre(suporte, '../outra'))).toMatchObject({ status: 400 });
    await apagarMensagemDoMestre(moderador, { canal: 'global', mensagem: ruim.id, motivo: 'ofensivo' });
    const e = await estadoDoChat('u3', 'global', undefined, depois(7));
    expect(e.mensagens.map((m) => m.texto)).toEqual(['texto normal']);
    expect(e.ids).toHaveLength(1);
    const log = (await repositorio.listarLogAdmin(5)).find((l) => l.acao === 'chat.apagar')!;
    expect(log).toMatchObject({ alvo: 'u2', antes: { texto: 'texto indevido', nome: 'Boromir' }, motivo: 'ofensivo' });
    expect(await erro(apagarMensagemDoMestre(moderador, { canal: 'global', mensagem: ruim.id, motivo: 'de novo' }))).toMatchObject({ status: 404 });
  });

  it('ao excluir a conta, as mensagens do jogador saem do Global e do canal da guilda', async () => {
    await agirNaGuilda('u1', 'criar', { nome: 'Folhaviva' });
    const g = (await getCharacterByUid('u1'))!.guildaId!;
    await enviarMensagem('u1', 'global', 'do Aragorn', T0);
    await enviarMensagem('u2', 'global', 'do Boromir', depois(1));
    await enviarMensagem('u1', 'guilda', 'só da guilda', depois(2));
    await apagarMensagensDoJogador('u1', g);
    expect((await estadoDoChat('u2', 'global', undefined, depois(3))).mensagens.map((m) => m.texto)).toEqual(['do Boromir']);
    expect((await lerCanalDoMestre(suporte, `guilda_${g}`)).mensagens).toHaveLength(0);
  });

  it('as rotas exigem login; o jogador envia e lê; o Mestre exige papel', async () => {
    const req = (url: string, uid?: string, corpo?: unknown) =>
      new NextRequest(`http://t${url}`, { method: corpo ? 'POST' : 'GET', headers: { ...(uid ? { authorization: `Bearer ${tokenDeTeste(uid)}` } : {}), 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
    expect((await chatGet(req('/api/chat'))).status).toBe(401);
    expect((await chatPost(req('/api/chat', undefined, { acao: 'enviar', canal: 'global', texto: 'oi' }))).status).toBe(401);
    const enviado = await chatPost(req('/api/chat', 'u1', { acao: 'enviar', canal: 'global', texto: 'oi pessoal' }));
    expect(enviado.status).toBe(200);
    expect((await chatPost(req('/api/chat', 'u1', { acao: 'enviar', canal: 'global', texto: 'de novo' }))).status).toBe(429);
    expect((await chatPost(req('/api/chat', 'u1', { acao: 'voar' }))).status).toBe(400);
    const lido = await chatGet(req('/api/chat?canal=global', 'u2'));
    expect(lido.status).toBe(200);
    expect((await lido.json()).mensagens[0]).toMatchObject({ nome: 'Aragorn', texto: 'oi pessoal' });
    expect((await chatMestreGet(req('/api/mestre/chat', 'u1'))).status).toBe(403);
    expect((await chatMestrePost(req('/api/mestre/chat', 'u1', { acao: 'silenciar', uid: 'u2', duracao: '1h', motivo: 'spam spam' }))).status).toBe(403);
    expect((await chatMestreGet(req('/api/mestre/chat?canal=global', 'dono1'))).status).toBe(200);
  });
});
