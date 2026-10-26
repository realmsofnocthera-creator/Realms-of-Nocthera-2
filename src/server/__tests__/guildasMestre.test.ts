import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as guildasGet, POST as guildasPost } from '@/app/api/mestre/guildas/route';
import { GET as partysGet } from '@/app/api/mestre/partys/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { estadoDoCorreio, limparCacheDoCorreio } from '@/server/correio';
import { agirNaGuilda, limparCacheDasGuildas } from '@/server/guildas';
import { listarGuildasDoMestre, listarPartysDoMestre, mudarGuildaDoMestre, verGuildaDoMestre } from '@/server/guildasMestre';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { agirNoTeste } from '@/server/testeEquipe';
import { repositorio } from '@/server/persistencia';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const dono = sessao('dono', 'dono1');
const moderador = sessao('moderador', 'mod1');
const suporte = sessao('suporte', 'sup1');
const mestre = sessao('mestre', 'mes1');
const NOMES: Record<string, string> = { u1: 'Aragorn', u2: 'Boromir', u3: 'Celeborn' };
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as { status?: number; message: string });

async function criarGuilda(uid = 'u1', nome = 'Folhaviva', descricao = 'Guardiões da floresta') {
  await agirNaGuilda(uid, 'criar', { nome, descricao });
  return (await getCharacterByUid(uid))!.guildaId!;
}
async function entrar(guildaId: string, uid: string) {
  await agirNaGuilda('u1', 'convidar', { nome: NOMES[uid] });
  await agirNaGuilda(uid, 'aceitarConvite', { guildaId });
}

describe('Ferramentas do Mestre para guildas e parties (7.10)', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoCorreio();
    limparCacheDasGuildas();
    for (const [uid, nome] of Object.entries(NOMES)) {
      await createCharacter(uid, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
      await updateCharacter(uid, { nivel: 12, ouro: 6000 });
    }
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  it('lista e busca as guildas e mostra os membros; ver é de quem lê jogadores', async () => {
    const id = await criarGuilda();
    await entrar(id, 'u2');
    await criarGuilda('u3', 'Lorien', '');
    const todas = await listarGuildasDoMestre(suporte);
    expect(todas.map((g) => g.nome).sort()).toEqual(['Folhaviva', 'Lorien']);
    expect(todas.find((g) => g.nome === 'Folhaviva')).toMatchObject({ lider: 'Aragorn', membros: 2, descricao: 'Guardiões da floresta' });
    expect((await listarGuildasDoMestre(suporte, 'lor')).map((g) => g.nome)).toEqual(['Lorien']);
    const d = await verGuildaDoMestre(suporte, id);
    expect(d.membrosDaGuilda.map((m) => [m.nome, m.cargo])).toEqual([['Aragorn', 'lider'], ['Boromir', 'membro']]);
    expect(await erro(verGuildaDoMestre(suporte, 'g_naoexiste'))).toMatchObject({ status: 404 });
  });

  it('só Moderador e Dono mudam guildas; o motivo é obrigatório', async () => {
    const id = await criarGuilda();
    for (const quem of [suporte, mestre]) expect(await erro(mudarGuildaDoMestre(quem, { acao: 'apagarDescricao', id, motivo: 'texto ofensivo' }))).toMatchObject({ status: 403 });
    expect(await erro(mudarGuildaDoMestre(moderador, { acao: 'apagarDescricao', id }))).toMatchObject({ status: 400 });
    expect(await erro(mudarGuildaDoMestre(moderador, { acao: 'voar', id, motivo: 'motivo qualquer' }))).toMatchObject({ status: 400 });
    expect((await repositorio.lerGuilda(id))!.descricao).toBe('Guardiões da floresta');
    await mudarGuildaDoMestre(moderador, { acao: 'apagarDescricao', id, motivo: 'texto ofensivo' });
    expect((await repositorio.lerGuilda(id))!.descricao).toBe('');
    await mudarGuildaDoMestre(dono, { acao: 'apagarDescricao', id, motivo: 'de novo' });
  });

  it('renomear troca o nome da guilda, a reserva do nome e o nome guardado em cada membro; nome ofensivo ou repetido é recusado', async () => {
    const id = await criarGuilda();
    await entrar(id, 'u2');
    await criarGuilda('u3', 'Lorien');
    expect(await erro(mudarGuildaDoMestre(moderador, { acao: 'renomear', id, nome: 'Lorien', motivo: 'nome ofensivo' }))).toMatchObject({ status: 409 });
    expect(await erro(mudarGuildaDoMestre(moderador, { acao: 'renomear', id, nome: 'x', motivo: 'nome ofensivo' }))).toMatchObject({ status: 400 });
    const r = await mudarGuildaDoMestre(moderador, { acao: 'renomear', id, nome: 'Guardiões do Bosque', motivo: 'nome ofensivo' });
    expect(r.mensagem).toMatch(/Folhaviva agora se chama Guardiões do Bosque/);
    expect((await repositorio.lerGuilda(id))!).toMatchObject({ nome: 'Guardiões do Bosque', nomeBusca: 'guardiões do bosque' });
    for (const uid of ['u1', 'u2']) expect((await getCharacterByUid(uid))!.guildaNome).toBe('Guardiões do Bosque');
    // o nome antigo ficou livre e o novo está reservado
    await criarGuilda('u3', 'Outra').catch(() => undefined);
    expect(await erro(mudarGuildaDoMestre(moderador, { acao: 'renomear', id: (await getCharacterByUid('u3'))!.guildaId!, nome: 'Guardiões do Bosque', motivo: 'teste' }))).toMatchObject({ status: 409 });
    await mudarGuildaDoMestre(moderador, { acao: 'renomear', id: (await getCharacterByUid('u3'))!.guildaId!, nome: 'Folhaviva', motivo: 'o nome antigo ficou livre' });
    // pode trocar só as maiúsculas do próprio nome
    await mudarGuildaDoMestre(moderador, { acao: 'renomear', id, nome: 'GUARDIÕES DO BOSQUE', motivo: 'ajuste' });
    expect((await repositorio.lerGuilda(id))!.nome).toBe('GUARDIÕES DO BOSQUE');
  });

  it('dissolver tira todos os membros, libera o nome e avisa cada um pelo Correio com o motivo', async () => {
    const id = await criarGuilda();
    await entrar(id, 'u2');
    await mudarGuildaDoMestre(dono, { acao: 'dissolver', id, motivo: 'nome ofensivo' });
    expect(await repositorio.lerGuilda(id)).toBeNull();
    for (const uid of ['u1', 'u2']) {
      const c = (await getCharacterByUid(uid))!;
      expect(c.guildaId).toBeUndefined();
      const aviso = (await estadoDoCorreio(uid)).mensagens.find((m) => m.titulo === 'Sua guilda foi desfeita');
      expect(aviso?.texto).toMatch(/Folhaviva.*Motivo: nome ofensivo/);
    }
    // o nome ficou livre: dá para criar de novo
    await criarGuilda('u3', 'Folhaviva');
    expect(await erro(verGuildaDoMestre(dono, id))).toMatchObject({ status: 404 });
  });

  it('tudo fica no log, com o antes e o motivo', async () => {
    const id = await criarGuilda();
    await mudarGuildaDoMestre(moderador, { acao: 'renomear', id, nome: 'Nome Novo', motivo: 'nome ofensivo' }, '200.1.2.3');
    await mudarGuildaDoMestre(moderador, { acao: 'dissolver', id, motivo: 'reincidência' });
    const log = await repositorio.listarLogAdmin(10);
    expect(log.map((l) => l.acao)).toEqual(expect.arrayContaining(['guilda.renomear', 'guilda.dissolver']));
    const renomear = log.find((l) => l.acao === 'guilda.renomear')!;
    expect(renomear).toMatchObject({ papel: 'moderador', alvo: id, antes: { nome: 'Folhaviva' }, depois: { nome: 'Nome Novo' }, motivo: 'nome ofensivo' });
  });

  it('lista as parties, com o líder, quem já está pronto e se ainda estão vivas; ver é de quem lê jogadores', async () => {
    for (const uid of ['u1', 'u2']) await updateCharacter(uid, { nivel: 30 });
    await agirNoTeste('u1', 'criar', {});
    await agirNoTeste('u1', 'convidar', { nome: 'Boromir' });
    const partys = await listarPartysDoMestre(suporte);
    expect(partys).toHaveLength(1);
    expect(partys[0]).toMatchObject({ lider: 'Aragorn', viva: true, convites: 1, membros: [{ nome: 'Aragorn', pronto: false }] });
    // parada há mais de 2 horas: aparece, mas como "parada"
    const daqui3h = new Date(Date.now() + 3 * 3_600_000);
    expect((await listarPartysDoMestre(suporte, daqui3h))[0].viva).toBe(false);
    // o papel mestre também lê jogadores, então ele vê as parties
    expect(await listarPartysDoMestre(mestre)).toHaveLength(1);
  });

  it('as rotas exigem login e papel', async () => {
    const req = (uid: string, url = 'http://t/api/mestre/guildas') => new NextRequest(url, { headers: { authorization: `Bearer ${tokenDeTeste(uid)}` } });
    expect((await guildasGet(new NextRequest('http://t/api/mestre/guildas'))).status).toBe(401);
    expect((await guildasGet(req('u1'))).status).toBe(403);
    expect((await partysGet(req('u1', 'http://t/api/mestre/partys'))).status).toBe(403);
    expect((await guildasGet(req('dono1'))).status).toBe(200);
    expect((await partysGet(req('dono1', 'http://t/api/mestre/partys'))).status).toBe(200);
    const post = new NextRequest('http://t/api/mestre/guildas', { method: 'POST', headers: { authorization: `Bearer ${tokenDeTeste('u1')}`, 'content-type': 'application/json' }, body: JSON.stringify({ acao: 'dissolver', id: 'x', motivo: 'teste teste' }) });
    expect((await guildasPost(post)).status).toBe(403);
  });
});
