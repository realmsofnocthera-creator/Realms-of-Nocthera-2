import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as estadoRota } from '@/app/api/campanha/estado/route';
import { POST as bauRota } from '@/app/api/campanha/bau/route';
import { POST as portaRota } from '@/app/api/campanha/porta/route';
import { POST as posicaoRota } from '@/app/api/campanha/posicao/route';
import { POST as sistemasRota } from '@/app/api/mestre/sistemas/route';
import { limparCacheRevogacao } from '@/server/auth';
import { campanhaAbrirBau, campanhaAtravessarPorta, campanhaEstado, campanhaSalvarPosicao, createCharacter, getCharacterByUid, zerarProgressaoPorMestre } from '@/server/characterService';
import { criarConteudo, limparCacheDoConteudo, publicarConteudo, salvarRascunho } from '@/server/conteudo';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { definirMapaInicial, definirSistema } from '@/server/sistemasPainel';
import { mapaVazio, type MapaDados } from '@/rules/mapa';
import { objetoNovo, type ObjetoDoMapa } from '@/rules/objetosDoMapa';
import { repositorio } from '@/server/persistencia';
import { descreverAcao } from '@/lib/mestreTela';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const dono = sessao('dono', 'dono1');
const mestre = sessao('mestre', 'mes1');
const M = 'Preparando a Campanha';

const mapa = (objetos: ObjetoDoMapa[], colisao: [number, number][] = []): MapaDados => {
  const m = mapaVazio(10, 8);
  m.objetos = objetos;
  for (const [x, y] of colisao) m.camadas.colisao[y * 10 + x] = 1;
  return m;
};
async function publicar(id: string, dados: MapaDados) {
  await criarConteudo(mestre, { tipo: 'mapa', id, nome: id === 'vila' ? 'Vila' : 'Floresta', dados });
  await publicarConteudo(mestre, 'mapa', id, { revisao: 1, motivo: 'publicado no teste' });
  limparCacheDoConteudo();
}
const MUNDO = () => {
  const vila = mapa([
    objetoNovo('inicio', 'inicio-1', 1, 1),
    { ...objetoNovo('bau', 'bau-1', 3, 1), item: { id: 'pelo-de-rato', qtd: 3 } },
    { ...objetoNovo('porta', 'porta-1', 6, 1), destino: { mapa: 'floresta', x: 2, y: 2 } },
  ]);
  const floresta = mapa([{ ...objetoNovo('porta', 'volta', 1, 2), destino: { mapa: 'vila', x: 5, y: 1 } }]);
  return { vila, floresta };
};
async function jogador(uid: string) {
  await createCharacter(uid, { nome: 'Heroi_' + uid, racaId: 'elfo', classeId: 'cavaleiro', pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 } });
}
async function prepararMundo() {
  const { vila, floresta } = MUNDO();
  // portas só exigem que o destino exista: cria a floresta vazia, publica a vila e depois preenche a volta
  await criarConteudo(mestre, { tipo: 'mapa', id: 'floresta', nome: 'Floresta', dados: mapa([]) });
  await publicar('vila', vila);
  await salvarRascunho(mestre, 'mapa', 'floresta', { revisao: 1, dados: floresta });
  await publicarConteudo(mestre, 'mapa', 'floresta', { revisao: 2, motivo: 'publicado no teste' });
  limparCacheDoConteudo();
  await definirMapaInicial(dono, { mapa: 'vila', motivo: M });
}
const req = (url: string, uid: string, corpo?: unknown) =>
  new NextRequest(`http://t${url}`, { method: corpo ? 'POST' : 'GET', headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });

describe('Campanha: progresso no servidor (5.5-3 e 5.5-8)', () => {
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
    await jogador('j1');
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  describe('mapa inicial (painel)', () => {
    it('sem mapa inicial a Campanha "ainda não começou"; o Dono define um mapa publicado e fica no log', async () => {
      expect(await campanhaEstado('j1')).toMatchObject({ iniciada: false, mensagem: expect.stringMatching(/ainda não começou/) });
      await prepararMundo();
      const [e] = await repositorio.listarLogAdmin(1);
      expect(e).toMatchObject({ acao: 'campanha.mapa-inicial', antes: { mapaInicial: '' }, depois: { mapaInicial: 'vila' }, motivo: M });
      expect(descreverAcao(e)).toMatch(/Mapa inicial da Campanha: vila/);
    });

    it('recusa mapa não publicado ou inexistente, só o Dono muda, e vazio desfaz', async () => {
      await criarConteudo(mestre, { tipo: 'mapa', id: 'rascunho', nome: 'Rascunho', dados: mapa([]) });
      await expect(definirMapaInicial(dono, { mapa: 'rascunho', motivo: M })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/não está publicado/) });
      await expect(definirMapaInicial(dono, { mapa: 'nao-existe', motivo: M })).rejects.toMatchObject({ status: 400 });
      await expect(definirMapaInicial(dono, { mapa: 7, motivo: M })).rejects.toMatchObject({ status: 400 });
      await expect(definirMapaInicial(mestre, { mapa: '', motivo: M })).rejects.toMatchObject({ status: 403 });
      await prepararMundo();
      await definirMapaInicial(dono, { mapa: '', motivo: M });
      expect((await campanhaEstado('j1')).iniciada).toBe(false);
    });

    it('a rota do painel define o mapa inicial', async () => {
      await prepararMundo();
      const r = await sistemasRota(req('/api/mestre/sistemas', 'dono1', { alvo: 'campanha-mapa-inicial', mapa: 'floresta', motivo: M }));
      expect(r.status).toBe(200);
      expect((await r.json()).configuracao.campanha.mapaInicial).toBe('floresta');
    });
  });

  describe('estado', () => {
    it('o jogador novo aparece no início do mapa inicial, sem gravar nada; o mapa vem publicado', async () => {
      await prepararMundo();
      const e = await campanhaEstado('j1');
      expect(e).toMatchObject({ iniciada: true, progresso: { mapaId: 'vila', x: 1, y: 1, baus: [] }, mapa: { id: 'vila', nome: 'Vila' } });
      expect((await getCharacterByUid('j1'))!.campanha).toBeUndefined();
    });

    it('só mostra mapa publicado: o rascunho novo não chega ao jogador', async () => {
      await prepararMundo();
      const { vila } = MUNDO();
      vila.objetos[0] = objetoNovo('inicio', 'inicio-1', 8, 6);
      await salvarRascunho(mestre, 'mapa', 'vila', { revisao: 1, dados: vila });
      limparCacheDoConteudo();
      expect((await campanhaEstado('j1')).progresso).toMatchObject({ x: 1, y: 1 });
    });

    it('rota: exige login e devolve o estado', async () => {
      await prepararMundo();
      expect((await estadoRota(new NextRequest('http://t/api/campanha/estado'))).status).toBe(401);
      const r = await estadoRota(req('/api/campanha/estado', 'j1'));
      expect(r.status).toBe(200);
      expect(await r.json()).toMatchObject({ iniciada: true });
    });
  });

  describe('posição, baú e porta', () => {
    it('salva a posição só em tile livre e alcançável; grava no personagem', async () => {
      await prepararMundo();
      const e = await campanhaSalvarPosicao('j1', { mapaId: 'vila', x: 4, y: 1 });
      expect(e.progresso).toMatchObject({ x: 4, y: 1 });
      expect((await getCharacterByUid('j1'))!.campanha).toMatchObject({ mapaId: 'vila', x: 4, y: 1 });
      await expect(campanhaSalvarPosicao('j1', { mapaId: 'vila', x: 3, y: 1 })).rejects.toMatchObject({ name: 'ErroDaCampanha' }); // o baú ocupa o tile
      await expect(campanhaSalvarPosicao('j1', { mapaId: 'floresta', x: 2, y: 2 })).rejects.toMatchObject({ name: 'ErroDaCampanha' });
    });

    it('baú: perto abre, dá o item na mochila e não abre de novo; longe é recusado', async () => {
      await prepararMundo();
      await campanhaSalvarPosicao('j1', { mapaId: 'vila', x: 8, y: 6 });
      await expect(campanhaAbrirBau('j1', 'bau-1')).rejects.toMatchObject({ message: expect.stringMatching(/mais perto/) });
      await campanhaSalvarPosicao('j1', { mapaId: 'vila', x: 2, y: 1 });
      const r = await campanhaAbrirBau('j1', 'bau-1');
      expect(r.item).toEqual({ id: 'pelo-de-rato', qtd: 3 });
      expect(r.character.inventario?.['pelo-de-rato']).toBe(3);
      await expect(campanhaAbrirBau('j1', 'bau-1')).rejects.toMatchObject({ message: expect.stringMatching(/já foi aberto/) });
      const c = (await getCharacterByUid('j1'))!;
      expect(c.inventario?.['pelo-de-rato']).toBe(3);
      expect(c.campanha?.baus).toEqual(['vila:bau-1']);
    });

    it('jogador novo que abre baú sem salvar posição: usa o início do mapa como posição', async () => {
      await prepararMundo();
      const r = await campanhaAbrirBau('j1', 'bau-1'); // início (1,1), baú (3,1): 2 tiles
      expect(r.item.qtd).toBe(3);
    });

    it('porta: leva ao mapa publicado de destino e volta; destino não publicado fecha a passagem', async () => {
      await prepararMundo();
      await campanhaSalvarPosicao('j1', { mapaId: 'vila', x: 5, y: 1 });
      const dentro = await campanhaAtravessarPorta('j1', 'porta-1');
      expect(dentro.progresso).toMatchObject({ mapaId: 'floresta', x: 2, y: 2 });
      expect(dentro.mapa?.id).toBe('floresta');
      const volta = await campanhaAtravessarPorta('j1', 'volta');
      expect(volta.progresso).toMatchObject({ mapaId: 'vila', x: 5, y: 1 });
      await criarConteudo(mestre, { tipo: 'mapa', id: 'caverna', nome: 'Caverna', dados: mapa([]) }); // só rascunho
      const v = MUNDO().vila;
      v.objetos.push({ ...objetoNovo('porta', 'porta-2', 5, 3), destino: { mapa: 'caverna', x: 1, y: 1 } });
      await salvarRascunho(mestre, 'mapa', 'vila', { revisao: 1, dados: v });
      await publicarConteudo(mestre, 'mapa', 'vila', { revisao: 2, motivo: 'porta nova' });
      limparCacheDoConteudo();
      await campanhaSalvarPosicao('j1', { mapaId: 'vila', x: 5, y: 2 });
      await expect(campanhaAtravessarPorta('j1', 'porta-2')).rejects.toMatchObject({ message: expect.stringMatching(/fechada/) });
    });

    it('rotas: posição, baú e porta; erro de regra vira 400; sem login, 401', async () => {
      await prepararMundo();
      expect((await posicaoRota(req('/api/campanha/posicao', 'j1', { mapaId: 'vila', x: 2, y: 1 }))).status).toBe(200);
      expect((await bauRota(req('/api/campanha/bau', 'j1', { objetoId: 'bau-1' }))).status).toBe(200);
      const repetido = await bauRota(req('/api/campanha/bau', 'j1', { objetoId: 'bau-1' }));
      expect(repetido.status).toBe(400);
      expect((await repetido.json()).error).toMatch(/já foi aberto/);
      expect((await portaRota(req('/api/campanha/porta', 'j1', { objetoId: 'porta-1' }))).status).toBe(400); // longe da porta
      expect((await posicaoRota(new NextRequest('http://t/api/campanha/posicao', { method: 'POST', body: '{}' }))).status).toBe(401);
    });
  });

  describe('sistema e robustez', () => {
    it('desligar o sistema Campanha barra o jogador com a mensagem; quem tem papel continua', async () => {
      await prepararMundo();
      await jogador('mes1');
      await definirSistema(dono, { alvo: 'campanha', ativo: false, mensagem: 'A Campanha está em ajuste.', motivo: M });
      await expect(campanhaEstado('j1')).rejects.toMatchObject({ name: 'ErroSistemaDesligado', message: 'A Campanha está em ajuste.' });
      await expect(campanhaSalvarPosicao('j1', { mapaId: 'vila', x: 2, y: 1 })).rejects.toMatchObject({ name: 'ErroSistemaDesligado' });
      await expect(campanhaEstado('mes1')).resolves.toMatchObject({ iniciada: true });
    });

    it('se o mapa do jogador deixou de estar publicado, ele volta ao mapa inicial sem perder os baús abertos', async () => {
      await prepararMundo();
      await campanhaSalvarPosicao('j1', { mapaId: 'vila', x: 2, y: 1 });
      await campanhaAbrirBau('j1', 'bau-1');
      await repositorio.gravarConfiguracaoDeSistemas({ ...(await repositorio.lerConfiguracaoDeSistemas())!, campanha: { mapaInicial: 'vila' } });
      const c = (await getCharacterByUid('j1'))!;
      await repositorio.executarTransacao('teste', async (ctx) => {
        ctx.gravarPersonagem({ ...c, campanha: { ...c.campanha!, mapaId: 'mapa-apagado', x: 0, y: 0 } });
      });
      limparCacheDeSistemas();
      const e = await campanhaEstado('j1');
      expect(e.progresso).toMatchObject({ mapaId: 'vila', x: 1, y: 1, baus: ['vila:bau-1'] });
    });

    it('zerar a progressão apaga o progresso da Campanha', async () => {
      await prepararMundo();
      await campanhaSalvarPosicao('j1', { mapaId: 'vila', x: 2, y: 1 });
      await campanhaAbrirBau('j1', 'bau-1');
      await zerarProgressaoPorMestre('j1', 'Zerar para teste');
      expect((await getCharacterByUid('j1'))!.campanha).toBeUndefined();
    });
  });
});
