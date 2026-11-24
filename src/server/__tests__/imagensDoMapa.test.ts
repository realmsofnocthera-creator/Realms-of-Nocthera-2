import { describe, it, expect, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { POST as enviarRota } from '@/app/api/mestre/mapas/imagem/route';
import { chaveDaUrlPublica, limparArmazenamentoDeTeste, urlPublicaDe } from '@/server/armazenamento';
import { criarConteudo, limparCacheDoConteudo } from '@/server/conteudo';
import { enviarImagemDoMapa } from '@/server/imagensDoMapa';
import { limparCacheRevogacao } from '@/server/auth';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import { chaveDoConteudo } from '@/rules/conteudo';
import { BYTES_MAXIMOS_DA_IMAGEM_DO_MAPA, gradeDaImagem, mapaVazio } from '@/rules/mapa';
import { descreverAcao } from '@/lib/mestreTela';
import { pngDeTeste } from '@/test/pngDeTeste';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const mestre = sessao('mestre', 'mes1');
const suporte = sessao('suporte', 'sup1');

const png = (largura = 200, altura = 100, extras = 0) => new Uint8Array(Buffer.from(pngDeTeste(largura, altura, extras).split(',')[1], 'base64'));
const hash = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

/** Os dados de um mapa de imagem: a grade cobre a imagem com o tile escolhido. */
async function mapaDeImagem(largura: number, altura: number, tile: number) {
  const img = await enviarImagemDoMapa(mestre, png(largura, altura));
  const g = gradeDaImagem(largura, altura, tile);
  return { img, dados: { ...mapaVazio(g.largura, g.altura, tile), fundo: { url: img.url, largura, altura } } };
}

describe('Mapa de imagem: imagem no armazenamento (R2)', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparArmazenamentoDeTeste();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoConteudo();
    await repositorio.gravarPapelMestre({ uid: 'mes1', papel: 'mestre', concedidoPor: 'dono1', concedidoEm: new Date().toISOString(), motivo: 'teste' });
    await repositorio.gravarPapelMestre({ uid: 'sup1', papel: 'suporte', concedidoPor: 'dono1', concedidoEm: new Date().toISOString(), motivo: 'teste' });
  });

  it('o envio grava o PNG em mapas/<sha256>.png, devolve as dimensões e deixa no log', async () => {
    const bytes = png(3200, 2400);
    const r = await enviarImagemDoMapa(mestre, bytes);
    expect(r).toEqual({ url: `https://arquivos.exemplo.test/mapas/${hash(bytes)}.png`, chave: `mapas/${hash(bytes)}.png`, largura: 3200, altura: 2400, bytes: bytes.length });
    const [e] = await repositorio.listarLogAdmin(1);
    expect(e).toMatchObject({ acao: 'mapa.imagem', alvo: r.chave });
    expect(descreverAcao(e)).toMatch(/Enviou a imagem de um mapa/);
    expect((await enviarImagemDoMapa(mestre, bytes)).url).toBe(r.url);
  });

  it('aceita imagens grandes (até 8192 px e 24 MB) e recusa o que passa, vazio, não-PNG e quem não edita mapas', async () => {
    await expect(enviarImagemDoMapa(mestre, png(8192, 4096))).resolves.toMatchObject({ largura: 8192, altura: 4096 });
    await expect(enviarImagemDoMapa(mestre, png(8193, 10))).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/1 a 8192/) });
    await expect(enviarImagemDoMapa(mestre, png(8192, 8192))).resolves.toMatchObject({ largura: 8192, altura: 8192 });
    await expect(enviarImagemDoMapa(mestre, png(8192, 5376))).resolves.toMatchObject({ largura: 8192, altura: 5376 });
    await expect(enviarImagemDoMapa(mestre, png(100, 100, BYTES_MAXIMOS_DA_IMAGEM_DO_MAPA))).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/24 MB/) });
    await expect(enviarImagemDoMapa(mestre, new Uint8Array())).rejects.toMatchObject({ status: 400 });
    await expect(enviarImagemDoMapa(mestre, new TextEncoder().encode('texto, não é PNG, de jeito nenhum aqui'))).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/não é um PNG/) });
    await expect(enviarImagemDoMapa(suporte, png())).rejects.toMatchObject({ status: 403 });
  });

  it('rota: 201 com a imagem, 401 sem login e 403 sem permissão', async () => {
    const pedido = (uid: string | null) =>
      new NextRequest('http://t/api/mestre/mapas/imagem', { method: 'POST', headers: { ...(uid ? { authorization: `Bearer ${tokenDeTeste(uid)}` } : {}), 'content-type': 'image/png' }, body: png(64, 64) as unknown as BodyInit });
    const ok = await enviarRota(pedido('mes1'));
    expect(ok.status).toBe(201);
    expect((await ok.json()).imagem).toMatchObject({ largura: 64, altura: 64 });
    expect((await enviarRota(pedido(null))).status).toBe(401);
    expect((await enviarRota(pedido('sup1'))).status).toBe(403);
  });

  it('cria o mapa de imagem: a grade cobre a imagem (arredondada para cima) e o fundo fica no rascunho', async () => {
    const { img, dados } = await mapaDeImagem(1000, 700, 48);
    expect(dados.largura).toBe(21);
    expect(dados.altura).toBe(15);
    await criarConteudo(mestre, { tipo: 'mapa', id: 'vila', nome: 'Vila', dados });
    const doc = await repositorio.lerConteudo(chaveDoConteudo('mapa', 'vila'));
    expect(doc?.rascunho).toMatchObject({ largura: 21, altura: 15, tamanhoDoTile: 48, fundo: { url: img.url, largura: 1000, altura: 700 } });
  });

  it('recusa a grade que não cobre a imagem, endereço de outro lugar, imagem que não existe e dimensões erradas', async () => {
    const { img, dados } = await mapaDeImagem(640, 480, 32);
    await expect(criarConteudo(mestre, { tipo: 'mapa', id: 'curto', nome: 'Curto', dados: { ...mapaVazio(10, 15, 32), fundo: dados.fundo } })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/pede um mapa de 20 × 15 tiles/) });
    const chave = chaveDaUrlPublica(img.url)!;
    await expect(criarConteudo(mestre, { tipo: 'mapa', id: 'fora', nome: 'Fora', dados: { ...dados, fundo: { ...dados.fundo, url: `https://outro.exemplo.test/${chave}` } } })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/não veio do armazenamento|não é de uma imagem enviada/) });
    const sumida = { ...dados, fundo: { ...dados.fundo, url: urlPublicaDe(`mapas/${'b'.repeat(64)}.png`) } };
    await expect(criarConteudo(mestre, { tipo: 'mapa', id: 'sumida', nome: 'Sumida', dados: sumida })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/não foi encontrada/) });
    // as dimensões declaradas diferem do arquivo guardado (e a grade acompanha a declarada, então só o arquivo denuncia)
    const g = gradeDaImagem(1280, 480, 32);
    await expect(criarConteudo(mestre, { tipo: 'mapa', id: 'errada', nome: 'Errada', dados: { ...mapaVazio(g.largura, g.altura, 32), fundo: { url: img.url, largura: 1280, altura: 480 } } })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/não batem/) });
  });
});
