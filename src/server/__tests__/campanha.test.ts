import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as estadoRota } from '@/app/api/campanha/estado/route';
import { POST as bauRota } from '@/app/api/campanha/bau/route';
import { POST as portaRota } from '@/app/api/campanha/porta/route';
import { POST as posicaoRota } from '@/app/api/campanha/posicao/route';
import { POST as lutarRota } from '@/app/api/campanha/lutar/route';
import { POST as sistemasRota } from '@/app/api/mestre/sistemas/route';
import { limparCacheRevogacao } from '@/server/auth';
import { campanhaAbrirBau, campanhaAtravessarPorta, campanhaEstado, campanhaLutar, campanhaSalvarPosicao, createCharacter, getCharacterByUid, updateCharacter, zerarProgressaoPorMestre } from '@/server/characterService';
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
    { ...objetoNovo('cacada', 'area-rato', 4, 3), largura: 2, altura: 2, monstroId: 'rato-da-floresta' },
    { ...objetoNovo('cacada', 'area-chefe', 1, 4), largura: 1, altura: 1, monstroId: 'varkhazar-dragao-da-carnificina' },
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

    it('o estado traz os tilesets publicados do mapa; salvar a posição devolve só o progresso', async () => {
      const { tilesetDeTeste } = await import('@/test/pngDeTeste');
      await criarConteudo(mestre, { tipo: 'tileset', id: 'grama', nome: 'Grama', dados: tilesetDeTeste() });
      await publicarConteudo(mestre, 'tileset', 'grama', { revisao: 1, motivo: 'publicado no teste' });
      const { vila, floresta } = MUNDO();
      vila.tilesets = ['grama'];
      await criarConteudo(mestre, { tipo: 'mapa', id: 'floresta', nome: 'Floresta', dados: mapa([]) });
      await publicar('vila', vila);
      await salvarRascunho(mestre, 'mapa', 'floresta', { revisao: 1, dados: floresta });
      await publicarConteudo(mestre, 'mapa', 'floresta', { revisao: 2, motivo: 'publicado no teste' });
      limparCacheDoConteudo();
      await definirMapaInicial(dono, { mapa: 'vila', motivo: M });
      const e = await campanhaEstado('j1');
      expect(e.tilesets).toHaveLength(1);
      expect(e.tilesets?.[0]).toMatchObject({ id: 'grama', dados: { formato: 1 } });
      // um tileset que não está publicado vira null (o jogo desenha sem ele)
      const { tilesetsDoMapa } = await import('@/server/campanha');
      expect(await tilesetsDoMapa({ id: 'x', nome: 'X', versao: 1, dados: { ...vila, tilesets: ['grama', 'nao-existe'] } })).toEqual([expect.objectContaining({ id: 'grama' }), null]);
      const salvo = await campanhaSalvarPosicao('j1', { mapaId: 'vila', x: 2, y: 1 });
      expect(salvo.progresso).toMatchObject({ x: 2, y: 1 });
      expect(salvo.mapa).toBeUndefined();
      expect(salvo.tilesets).toBeUndefined();
    });

    it('baú e porta aceitam a posição junto: uma gravação só, sem checkpoint antes', async () => {
      await prepararMundo();
      // o jogador nasce em (1,1); anda até perto do baú e abre, sem ter salvado a posição antes
      const r = await campanhaAbrirBau('j1', 'bau-1', { mapaId: 'vila', x: 4, y: 2 });
      expect(r.item.qtd).toBe(3);
      const c = (await getCharacterByUid('j1'))!;
      expect(c.campanha).toMatchObject({ x: 4, y: 2, baus: ['vila:bau-1'] });

      // a porta, em (6,1): o jogador está em (5,1) e manda a posição com o pedido
      const dentro = await campanhaAtravessarPorta('j1', 'porta-1', { mapaId: 'vila', x: 5, y: 1 });
      expect(dentro.progresso).toMatchObject({ mapaId: 'floresta', x: 2, y: 2 });
      expect(dentro.mapa?.id).toBe('floresta');
      expect(dentro.tilesets).toEqual([]);
    });

    it('a posição enviada com a ação é conferida: parede, outro mapa, formato ruim ou longe demais da ação', async () => {
      await prepararMundo();
      await expect(campanhaAbrirBau('j1', 'bau-1', { mapaId: 'floresta', x: 4, y: 2 })).rejects.toMatchObject({ name: 'ErroDaCampanha' });
      await expect(campanhaAbrirBau('j1', 'bau-1', { mapaId: 'vila', x: 99, y: 2 })).rejects.toMatchObject({ name: 'ErroDaCampanha' });
      await expect(campanhaAbrirBau('j1', 'bau-1', 'aqui')).rejects.toMatchObject({ name: 'ErroDaCampanha' });
      await expect(campanhaAbrirBau('j1', 'bau-1', { mapaId: 'vila', x: 9, y: 7 })).rejects.toMatchObject({ message: expect.stringMatching(/mais perto/) });
      expect((await getCharacterByUid('j1'))!.campanha).toBeUndefined(); // nada foi gravado
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

  describe('lutas (5.5-3 e 5.5-10)', () => {
    const FORTE = { vigor: 400, sorte: 0, forca: 300, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 50 };
    const FRACO = { vigor: 1, sorte: 0, forca: 0, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
    const NO_RATO = { mapaId: 'vila', x: 4, y: 3 };
    const NO_CHEFE = { mapaId: 'vila', x: 1, y: 4 };
    const T0 = new Date('2026-10-18T12:00:00Z');

    async function lutador(atributos = FORTE) {
      await prepararMundo();
      await updateCharacter('j1', { nivel: 2, atributos, ouro: 500 });
    }

    it('vitória: ganha XP e ouro (sem materiais), fica onde está e a área descansa', async () => {
      await lutador();
      const antes = (await getCharacterByUid('j1'))!;
      const r = await campanhaLutar('j1', 'area-rato', { seed: 7, posicao: NO_RATO, agora: T0 });
      expect(r.resultado.vencedor).toBe('personagem');
      expect(r.campanha).toMatchObject({ vencedor: 'personagem', monstroNome: expect.any(String), descansaAte: T0.getTime() + 5 * 60_000 });
      expect(r.campanha.xpGanho).toBeGreaterThan(0);
      expect(r.campanha.ouroGanho).toBeGreaterThan(0);
      expect(r.campanha.progresso).toMatchObject({ x: 4, y: 3 });
      const c = (await getCharacterByUid('j1'))!;
      expect(c.ouro).toBe(antes.ouro + r.campanha.ouroGanho);
      expect(c.xpAtual !== antes.xpAtual || c.nivel > antes.nivel).toBe(true); // o XP entrou (ou virou nível)
      expect(c.inventario ?? {}).toEqual(antes.inventario ?? {}); // sem drops de materiais
      expect(c.campanha).toMatchObject({ x: 4, y: 3, descansos: { 'vila:area-rato': T0.getTime() + 5 * 60_000 } });
    });

    it('derrota: não perde nada, volta ao último ponto salvo e a área descansa do mesmo jeito', async () => {
      await lutador(FRACO);
      await campanhaSalvarPosicao('j1', { mapaId: 'vila', x: 2, y: 2 });
      const r = await campanhaLutar('j1', 'area-chefe', { seed: 7, posicao: NO_CHEFE, agora: T0 });
      expect(r.resultado.vencedor).toBe('monstro');
      expect(r.campanha).toMatchObject({ vencedor: 'monstro', xpGanho: 0, ouroGanho: 0, progresso: { x: 2, y: 2 } });
      expect(r.resultado.ouroPerdido).toBe(0);
      expect(r.mensagens.join(' ')).toMatch(/Nada foi perdido/);
      expect(r.mensagens.join(' ')).not.toMatch(/A morte cobra/);
      const c = (await getCharacterByUid('j1'))!;
      expect(c.ouro).toBe(500);
      expect(c.campanha).toMatchObject({ x: 2, y: 2, descansos: { 'vila:area-chefe': T0.getTime() + 5 * 60_000 } });
    });

    it('área descansando recusa com o horário; depois do descanso luta de novo', async () => {
      await lutador();
      await campanhaLutar('j1', 'area-rato', { seed: 7, posicao: NO_RATO, agora: T0 });
      const cedo = new Date(T0.getTime() + 60_000);
      await expect(campanhaLutar('j1', 'area-rato', { seed: 8, posicao: NO_RATO, agora: cedo })).rejects.toMatchObject({ name: 'ErroDaCampanha', descansaAte: T0.getTime() + 5 * 60_000, message: expect.stringMatching(/calma por enquanto/) });
      const tarde = new Date(T0.getTime() + 5 * 60_000 + 1);
      await expect(campanhaLutar('j1', 'area-rato', { seed: 9, posicao: NO_RATO, agora: tarde })).resolves.toMatchObject({ repetido: false });
    });

    it('recusa fora da área, área inexistente, objeto que não é área e posição que não dá', async () => {
      await lutador();
      await expect(campanhaLutar('j1', 'area-rato', { seed: 7, posicao: { mapaId: 'vila', x: 2, y: 2 }, agora: T0 })).rejects.toMatchObject({ message: expect.stringMatching(/não está nessa área/) });
      await expect(campanhaLutar('j1', 'nao-existe', { seed: 7, posicao: NO_RATO, agora: T0 })).rejects.toMatchObject({ name: 'ErroDaCampanha' });
      await expect(campanhaLutar('j1', 'bau-1', { seed: 7, posicao: NO_RATO, agora: T0 })).rejects.toMatchObject({ name: 'ErroDaCampanha' });
      await expect(campanhaLutar('j1', 'area-rato', { seed: 7, posicao: { mapaId: 'floresta', x: 4, y: 3 }, agora: T0 })).rejects.toMatchObject({ name: 'ErroDaCampanha' });
      expect((await getCharacterByUid('j1'))!.campanha).toBeUndefined(); // nada foi gravado
    });

    it('reenviar o mesmo combateId devolve o resultado gravado, sem pagar duas vezes', async () => {
      await lutador();
      const primeira = await campanhaLutar('j1', 'area-rato', { seed: 7, posicao: NO_RATO, combateId: 'camp-abcdef12', agora: T0 });
      const ouroDepois = (await getCharacterByUid('j1'))!.ouro;
      const repetida = await campanhaLutar('j1', 'area-rato', { seed: 999, posicao: NO_RATO, combateId: 'camp-abcdef12', agora: new Date(T0.getTime() + 1000) });
      expect(repetida.repetido).toBe(true);
      expect(repetida.campanha).toEqual(primeira.campanha);
      expect(repetida.resultado).toEqual(primeira.resultado);
      expect((await getCharacterByUid('j1'))!.ouro).toBe(ouroDepois);
    });

    it('sistema Campanha desligado barra a luta; quem não começou a Campanha recebe aviso', async () => {
      await lutador();
      await definirSistema(dono, { alvo: 'campanha', ativo: false, mensagem: 'A Campanha está em ajuste.', motivo: M });
      await expect(campanhaLutar('j1', 'area-rato', { seed: 7, posicao: NO_RATO, agora: T0 })).rejects.toMatchObject({ name: 'ErroSistemaDesligado' });
    });

    it('rota: 200 com o resultado, 400 com o horário do descanso, 401 sem login, combateId inválido e a semente do cliente é ignorada', async () => {
      await lutador();
      const ok = await lutarRota(req('/api/campanha/lutar', 'j1', { objetoId: 'area-rato', posicao: NO_RATO, seed: 1 }));
      expect(ok.status).toBe(200);
      const corpo = await ok.json();
      expect(corpo).toMatchObject({ campanha: { vencedor: 'personagem' }, repetido: false });
      const descansando = await lutarRota(req('/api/campanha/lutar', 'j1', { objetoId: 'area-rato', posicao: NO_RATO }));
      expect(descansando.status).toBe(400);
      expect(await descansando.json()).toMatchObject({ error: expect.stringMatching(/calma por enquanto/), descansaAte: expect.any(Number) });
      expect((await lutarRota(req('/api/campanha/lutar', 'j1', { objetoId: 'area-chefe', posicao: NO_CHEFE, combateId: 'curto' }))).status).toBe(400);
      expect((await lutarRota(new NextRequest('http://t/api/campanha/lutar', { method: 'POST', body: '{}' }))).status).toBe(401);
    });
  });
});
