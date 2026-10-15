import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as listar, POST as criar } from '@/app/api/mestre/conteudo/route';
import { GET as detalhe, PUT as salvar } from '@/app/api/mestre/conteudo/[tipo]/[id]/route';
import { POST as publicar } from '@/app/api/mestre/conteudo/[tipo]/[id]/publicar/route';
import { POST as reverter } from '@/app/api/mestre/conteudo/[tipo]/[id]/reverter/route';
import { GET as versao } from '@/app/api/mestre/conteudo/[tipo]/[id]/versoes/[versao]/route';
import { GET as noJogo } from '@/app/api/conteudo/[tipo]/[id]/route';
import { limparCacheRevogacao } from '@/server/auth';
import { limparCacheDoConteudo } from '@/server/conteudo';
import { DONOS_DO_PROJETO } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import { mapaVazio } from '@/rules/mapa';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

/** Rotas do conteúdo versionado: papel e permissão no servidor, fluxo completo e leitura do publicado pelo jogo. */
describe('Rotas do conteúdo versionado', () => {
  let ipSeq = 0;
  const pedido = (url: string, uid: string | null, metodo = 'GET', corpo?: unknown) =>
    new NextRequest(`http://localhost${url}`, {
      method: metodo,
      headers: {
        ...(uid ? { authorization: `Bearer ${tokenDeTeste(uid)}` } : {}),
        'content-type': 'application/json',
        'x-forwarded-for': `10.1.0.${++ipSeq % 250}`,
      },
      ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
    });
  const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
  const vila = params({ tipo: 'mapa', id: 'vila' });

  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDoConteudo();
    const agora = new Date().toISOString();
    await repositorio.gravarPapelMestre({ uid: 'm1', papel: 'mestre', concedidoPor: 'dono1', concedidoEm: agora, motivo: 'teste' });
    await repositorio.gravarPapelMestre({ uid: 's1', papel: 'suporte', concedidoPor: 'dono1', concedidoEm: agora, motivo: 'teste' });
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  it('sem login 401; sem papel 403; suporte não cria', async () => {
    expect((await listar(pedido('/api/mestre/conteudo?tipo=mapa', null))).status).toBe(401);
    expect((await listar(pedido('/api/mestre/conteudo?tipo=mapa', 'jogador'))).status).toBe(403);
    const corpo = { tipo: 'mapa', id: 'vila', nome: 'Vila', dados: mapaVazio(4, 4) };
    expect((await criar(pedido('/api/mestre/conteudo', 's1', 'POST', corpo))).status).toBe(403);
    expect((await criar(pedido('/api/mestre/conteudo', 'jogador', 'POST', corpo))).status).toBe(403);
  });

  it('o Mestre cria, salva, publica e volta atrás; o jogo lê só o publicado', async () => {
    const criado = await criar(pedido('/api/mestre/conteudo', 'm1', 'POST', { tipo: 'mapa', id: 'vila', nome: 'Vila', dados: mapaVazio(4, 4) }));
    expect(criado.status).toBe(201);

    expect((await noJogo(pedido('/api/conteudo/mapa/vila', 'jogador'), vila)).status).toBe(404);
    expect((await noJogo(pedido('/api/conteudo/mapa/vila', null), vila)).status).toBe(401);

    const comTile = mapaVazio(4, 4);
    comTile.camadas.colisao[1] = 1;
    const salvo = await salvar(pedido('/api/mestre/conteudo/mapa/vila', 'm1', 'PUT', { dados: comTile, revisao: 1 }), vila);
    expect((await salvo.json()).conteudo.revisao).toBe(2);
    expect((await salvar(pedido('/api/mestre/conteudo/mapa/vila', 'm1', 'PUT', { dados: comTile, revisao: 1 }), vila)).status).toBe(409);

    expect((await publicar(pedido('/api/mestre/conteudo/mapa/vila/publicar', 's1', 'POST', { revisao: 2, motivo: 'tentativa' }), vila)).status).toBe(403);
    const pub = await publicar(pedido('/api/mestre/conteudo/mapa/vila/publicar', 'm1', 'POST', { revisao: 2, motivo: 'primeira versão' }), vila);
    expect((await pub.json()).versao.versao).toBe(1);

    const lido = await (await noJogo(pedido('/api/conteudo/mapa/vila', 'jogador'), vila)).json();
    expect(lido.conteudo).toMatchObject({ tipo: 'mapa', id: 'vila', versao: 1 });
    expect(lido.conteudo.dados.camadas.colisao[1]).toBe(1);

    await salvar(pedido('/api/mestre/conteudo/mapa/vila', 'm1', 'PUT', { dados: mapaVazio(4, 4), revisao: 2 }), vila);
    await publicar(pedido('/api/mestre/conteudo/mapa/vila/publicar', 'm1', 'POST', { revisao: 3, motivo: 'limpei o mapa' }), vila);
    const rev = await reverter(pedido('/api/mestre/conteudo/mapa/vila/reverter', 'dono1', 'POST', { versao: 1, ultimaVersao: 2, motivo: 'voltar o tile' }), vila);
    expect((await rev.json()).versao).toMatchObject({ versao: 3, revertidaDe: 1 });

    const d = await (await detalhe(pedido('/api/mestre/conteudo/mapa/vila', 's1'), vila)).json();
    expect(d.versoes.map((v: { versao: number }) => v.versao)).toEqual([3, 2, 1]);
    expect(d.conteudo.versaoPublicada).toBe(3);

    const v1 = await versao(pedido('/api/mestre/conteudo/mapa/vila/versoes/1', 's1'), params({ tipo: 'mapa', id: 'vila', versao: '1' }));
    expect((await v1.json()).versao.dados.camadas.colisao[1]).toBe(1);

    const lista = await (await listar(pedido('/api/mestre/conteudo?tipo=mapa', 's1'))).json();
    expect(lista.itens).toHaveLength(1);
    expect(lista.itens[0].rascunho).toBeUndefined();
  });

  it('corpo inválido dá 400', async () => {
    const req = new NextRequest('http://localhost/api/mestre/conteudo', {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenDeTeste('m1')}`, 'content-type': 'application/json', 'x-forwarded-for': '10.1.1.1' },
      body: '{quebrado',
    });
    expect((await criar(req)).status).toBe(400);
  });
});
