import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as estadoRota } from '@/app/api/campanha/estado/route';
import { GET as cenaRota } from '@/app/api/campanha/cena/route';
import { POST as vistaRota } from '@/app/api/campanha/cena/vista/route';
import { POST as acionarRota } from '@/app/api/campanha/acionar/route';
import { POST as sistemasRota } from '@/app/api/mestre/sistemas/route';
import { limparCacheRevogacao } from '@/server/auth';
import { campanhaAberturaVista, campanhaAcionar, campanhaCena, campanhaEstado, createCharacter, getCharacterByUid } from '@/server/characterService';
import { criarConteudo, limparCacheDoConteudo, publicarConteudo } from '@/server/conteudo';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { definirCenaDeAbertura, definirMapaInicial } from '@/server/sistemasPainel';
import { cenaEmBranco } from '@/rules/cena';
import { mapaVazio, type MapaDados } from '@/rules/mapa';
import { objetoNovo, type ObjetoDoMapa } from '@/rules/objetosDoMapa';
import { repositorio } from '@/server/persistencia';
import { descreverAcao } from '@/lib/mestreTela';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const dono = sessao('dono', 'dono1');
const mestre = sessao('mestre', 'mes1');
const M = 'Preparando as cenas';

const mapa = (objetos: ObjetoDoMapa[]): MapaDados => {
  const m = mapaVazio(10, 8);
  m.objetos = objetos;
  return m;
};
async function publicarCena(id: string) {
  await criarConteudo(mestre, { tipo: 'cena', id, nome: `Cena ${id}`, dados: cenaEmBranco(`Cena ${id}`) });
  await publicarConteudo(mestre, 'cena', id, { revisao: 1, motivo: 'publicada no teste' });
  limparCacheDoConteudo();
}
async function publicarVila(objetos: ObjetoDoMapa[]) {
  await criarConteudo(mestre, { tipo: 'mapa', id: 'vila', nome: 'Vila', dados: mapa([objetoNovo('inicio', 'inicio-1', 1, 1), ...objetos]) });
  await publicarConteudo(mestre, 'mapa', 'vila', { revisao: 1, motivo: 'publicado no teste' });
  limparCacheDoConteudo();
  await definirMapaInicial(dono, { mapa: 'vila', motivo: M });
}
const req = (url: string, uid: string, corpo?: unknown) =>
  new NextRequest(`http://t${url}`, { method: corpo ? 'POST' : 'GET', headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });

describe('Campanha: cenas (abertura, ativadores e diálogos)', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoConteudo();
    await repositorio.gravarPapelMestre({ uid: 'mes1', papel: 'mestre', concedidoPor: 'dono1', concedidoEm: new Date().toISOString(), motivo: 'teste' });
    await createCharacter('j1', { nome: 'Heroi_j1', racaId: 'elfo', classeId: 'cavaleiro', pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 } });
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  describe('cena de abertura (painel)', () => {
    it('o Dono escolhe uma cena publicada; fica no log; recusa rascunho, quem não é Dono; vazio desfaz; o mapa inicial não apaga a abertura', async () => {
      await criarConteudo(mestre, { tipo: 'cena', id: 'rascunho', nome: 'Rascunho', dados: cenaEmBranco('Rascunho') });
      await expect(definirCenaDeAbertura(dono, { cena: 'rascunho', motivo: M })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/não está publicada/) });
      await expect(definirCenaDeAbertura(dono, { cena: 7, motivo: M })).rejects.toMatchObject({ status: 400 });
      await publicarCena('abertura');
      await expect(definirCenaDeAbertura(mestre, { cena: 'abertura', motivo: M })).rejects.toMatchObject({ status: 403 });
      const c = await definirCenaDeAbertura(dono, { cena: 'abertura', motivo: M });
      expect(c.campanha.aberturaCenaId).toBe('abertura');
      const [e] = await repositorio.listarLogAdmin(1);
      expect(e).toMatchObject({ acao: 'campanha.cena-abertura', antes: { aberturaCenaId: '' }, depois: { aberturaCenaId: 'abertura' } });
      expect(descreverAcao(e)).toMatch(/Cena de abertura da Campanha: abertura/);
      await publicarVila([]);
      expect((await repositorio.lerConfiguracaoDeSistemas())!.campanha).toEqual({ mapaInicial: 'vila', aberturaCenaId: 'abertura' });
      await definirCenaDeAbertura(dono, { cena: '', motivo: M });
      expect((await repositorio.lerConfiguracaoDeSistemas())!.campanha).toEqual({ mapaInicial: 'vila', aberturaCenaId: '' });
    });

    it('a rota do painel define a abertura', async () => {
      await publicarCena('abertura');
      const r = await sistemasRota(req('/api/mestre/sistemas', 'dono1', { alvo: 'campanha-cena-abertura', cena: 'abertura', motivo: M }));
      expect(r.status).toBe(200);
      expect((await r.json()).configuracao.campanha.aberturaCenaId).toBe('abertura');
    });
  });

  describe('abertura para o jogador', () => {
    it('o estado manda a abertura e o nome do jogador até ele ver; depois não manda mais', async () => {
      await publicarCena('abertura');
      await publicarVila([]);
      expect((await campanhaEstado('j1')).abertura).toBeUndefined();
      await definirCenaDeAbertura(dono, { cena: 'abertura', motivo: M });
      expect(await campanhaEstado('j1')).toMatchObject({ abertura: 'abertura', jogador: { nome: 'Heroi_j1' } });
      const r = await campanhaAberturaVista('j1');
      expect(r.progresso?.cenas).toEqual(['abertura', 'cena:abertura']);
      expect((await campanhaEstado('j1')).abertura).toBeUndefined();
      expect((await getCharacterByUid('j1'))!.campanha?.cenas).toEqual(['abertura', 'cena:abertura']);
      expect((await campanhaAberturaVista('j1')).progresso?.cenas).toEqual(['abertura', 'cena:abertura']); // marcar de novo não duplica
    });

    it('cada personagem vê a sua vez; sem abertura configurada não dá para marcar', async () => {
      await publicarVila([]);
      await expect(campanhaAberturaVista('j1')).rejects.toMatchObject({ message: expect.stringMatching(/Não há cena de abertura/) });
      await publicarCena('abertura');
      await definirCenaDeAbertura(dono, { cena: 'abertura', motivo: M });
      await createCharacter('j2', { nome: 'Heroi_j2', racaId: 'elfo', classeId: 'cavaleiro', pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 } });
      await campanhaAberturaVista('j1');
      expect((await campanhaEstado('j2')).abertura).toBe('abertura');
    });

    it('abertura que deixou de estar publicada não trava o jogador', async () => {
      await publicarVila([]);
      await repositorio.gravarConfiguracaoDeSistemas({ ...(await repositorio.lerConfiguracaoDeSistemas())!, campanha: { mapaInicial: 'vila', aberturaCenaId: 'sumiu' } });
      limparCacheDeSistemas();
      expect((await campanhaEstado('j1')).abertura).toBeUndefined();
    });
  });

  describe('ler a cena', () => {
    it('devolve só cena publicada; id ruim ou rascunho dão erro; a rota exige login', async () => {
      await criarConteudo(mestre, { tipo: 'cena', id: 'rascunho', nome: 'Rascunho', dados: cenaEmBranco('Rascunho') });
      await publicarCena('abertura');
      await publicarVila([]);
      expect(await campanhaCena('j1', 'abertura')).toMatchObject({ id: 'abertura', titulo: 'Cena abertura', dados: { formato: 1, telas: [{ tipo: 'narracao' }] } });
      await expect(campanhaCena('j1', 'rascunho')).rejects.toMatchObject({ status: 400 });
      await expect(campanhaCena('j1', 'Id Ruim!')).rejects.toMatchObject({ status: 400 });
      await expect(campanhaCena('j1', undefined)).rejects.toMatchObject({ status: 400 });
      const ok = await cenaRota(req('/api/campanha/cena?id=abertura', 'j1'));
      expect(ok.status).toBe(200);
      expect((await ok.json()).cena.dados.titulo).toBe('Cena abertura');
      expect((await cenaRota(req('/api/campanha/cena?id=rascunho', 'j1'))).status).toBe(400);
      expect((await cenaRota(new NextRequest('http://t/api/campanha/cena?id=abertura'))).status).toBe(401);
    });
  });

  describe('ativador "uma vez só" e diálogo de NPC', () => {
    const ativador = (unica: boolean): ObjetoDoMapa => ({ ...objetoNovo('cena', 'cena-1', 3, 3), largura: 2, altura: 2, cenaId: 'chegada', unica });

    it('o mapa só publica com a cena publicada (ativador ou NPC)', async () => {
      await criarConteudo(mestre, { tipo: 'cena', id: 'chegada', nome: 'Chegada', dados: cenaEmBranco('Chegada') });
      await criarConteudo(mestre, { tipo: 'mapa', id: 'vila', nome: 'Vila', dados: mapa([ativador(true)]) });
      await expect(publicarConteudo(mestre, 'mapa', 'vila', { revisao: 1, motivo: 'tentativa no teste' })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/Publique antes o cena "chegada"/i) });
      await criarConteudo(mestre, { tipo: 'mapa', id: 'aldeia', nome: 'Aldeia', dados: mapa([{ ...objetoNovo('npc', 'npc-1', 2, 2), cenaId: 'inexistente' }]) }).then(
        () => { throw new Error('devia recusar'); },
        (e) => expect(e).toMatchObject({ status: 400, message: expect.stringMatching(/Cena "inexistente" não existe/i) })
      );
      await publicarConteudo(mestre, 'cena', 'chegada', { revisao: 1, motivo: 'publicada no teste' });
      await expect(publicarConteudo(mestre, 'mapa', 'vila', { revisao: 1, motivo: 'agora vai no teste' })).resolves.toBeDefined();
    });

    it('acionar o ativador: toca uma vez só, marca "mapa:objeto" e a cena vista; "toda vez" não grava a chave; fora da área é recusado', async () => {
      await publicarCena('chegada');
      await publicarVila([ativador(true), { ...ativador(false), id: 'cena-2', x: 6, y: 5 }]);
      const dentro1 = { mapaId: 'vila', x: 3, y: 3 };
      const dentro2 = { mapaId: 'vila', x: 6, y: 5 };
      const r = await campanhaAcionar('j1', 'cena-1', dentro1);
      expect(r).toMatchObject({ cenaId: 'chegada', progresso: { cenas: ['vila:cena-1', 'cena:chegada'] } });
      const de_novo = await campanhaAcionar('j1', 'cena-1', dentro1);
      expect(de_novo.cenaId).toBeUndefined(); // já viu
      expect((await campanhaAcionar('j1', 'cena-2', dentro2)).cenaId).toBe('chegada');
      expect((await campanhaAcionar('j1', 'cena-2', dentro2)).cenaId).toBe('chegada'); // toda vez
      expect((await getCharacterByUid('j1'))!.campanha?.cenas).toEqual(['vila:cena-1', 'cena:chegada']);
      await expect(campanhaAcionar('j1', 'cena-1', { mapaId: 'vila', x: 1, y: 1 })).rejects.toMatchObject({ message: expect.stringMatching(/não está nessa área/) });
      await expect(campanhaAcionar('j1', 'nao-existe')).rejects.toMatchObject({ status: 400 });
      await expect(campanhaAcionar('j1', 'inicio-1')).rejects.toMatchObject({ status: 400 });
      const rota = await acionarRota(req('/api/campanha/acionar', 'j1', { objetoId: 'cena-2', posicao: dentro2 }));
      expect(rota.status).toBe(200);
      expect((await rota.json()).cenaId).toBe('chegada');
      expect((await acionarRota(req('/api/campanha/acionar', 'j1', { objetoId: 'x' }))).status).toBe(400);
      expect((await acionarRota(new NextRequest('http://t/api/campanha/acionar', { method: 'POST', body: '{}' }))).status).toBe(401);
    });

    it('a rota da abertura exige login e marca a abertura', async () => {
      await publicarCena('abertura');
      await publicarVila([]);
      await definirCenaDeAbertura(dono, { cena: 'abertura', motivo: M });
      expect((await vistaRota(new NextRequest('http://t/api/campanha/cena/vista', { method: 'POST', body: '{}' }))).status).toBe(401);
      const ok = await vistaRota(req('/api/campanha/cena/vista', 'j1', {}));
      expect(ok.status).toBe(200);
      expect((await (await estadoRota(req('/api/campanha/estado', 'j1'))).json()).progresso.cenas).toEqual(['abertura', 'cena:abertura']);
    });
  });
});
