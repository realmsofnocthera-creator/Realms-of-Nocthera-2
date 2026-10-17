import { describe, it, expect, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { POST as enviarRota } from '@/app/api/mestre/tilesets/imagem/route';
import { chaveDaUrlPublica, limparArmazenamentoDeTeste, lerInicioDoArquivo, gravarArquivo, urlPublicaDe } from '@/server/armazenamento';
import { criarConteudo, limparCacheDoConteudo, publicarConteudo } from '@/server/conteudo';
import { enviarImagemDeTileset } from '@/server/imagensDoTileset';
import { limparCacheRevogacao } from '@/server/auth';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import { chaveDoConteudo } from '@/rules/conteudo';
import { BYTES_MAXIMOS_DO_PNG_NO_ARMAZENAMENTO } from '@/rules/tileset';
import { descreverAcao } from '@/lib/mestreTela';
import { pngDeTeste, tilesetDeTeste } from '@/test/pngDeTeste';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const mestre = sessao('mestre', 'mes1');
const suporte = sessao('suporte', 'sup1');

const png = (largura = 64, altura = 32, extras = 0) => new Uint8Array(Buffer.from(pngDeTeste(largura, altura, extras).split(',')[1], 'base64'));
const hash = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

describe('Imagens de tileset no armazenamento (R2)', () => {
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

  describe('envio', () => {
    it('grava o PNG com o SHA-256 no nome, devolve o endereço e as dimensões, e deixa no log', async () => {
      const bytes = png(64, 32);
      const r = await enviarImagemDeTileset(mestre, bytes);
      expect(r).toEqual({ url: `https://arquivos.exemplo.test/tilesets/${hash(bytes)}.png`, chave: `tilesets/${hash(bytes)}.png`, largura: 64, altura: 32, bytes: bytes.length });
      expect(await lerInicioDoArquivo(r.chave, 24)).toEqual(bytes.slice(0, 24));
      const [e] = await repositorio.listarLogAdmin(1);
      expect(e).toMatchObject({ acao: 'tileset.imagem', alvo: r.chave, depois: { bytes: bytes.length, largura: 64, altura: 32 } });
      expect(descreverAcao(e)).toMatch(/Enviou uma imagem de tileset/);
    });

    it('a mesma imagem tem sempre o mesmo endereço', async () => {
      expect((await enviarImagemDeTileset(mestre, png())).url).toBe((await enviarImagemDeTileset(mestre, png())).url);
    });

    it('aceita até 1 MB e recusa mais, vazio, não-PNG e imagem grande demais de lado', async () => {
      await expect(enviarImagemDeTileset(mestre, png(64, 32, BYTES_MAXIMOS_DO_PNG_NO_ARMAZENAMENTO - 33))).resolves.toMatchObject({ bytes: BYTES_MAXIMOS_DO_PNG_NO_ARMAZENAMENTO });
      await expect(enviarImagemDeTileset(mestre, png(64, 32, BYTES_MAXIMOS_DO_PNG_NO_ARMAZENAMENTO))).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/passa de 1024 KB/) });
      await expect(enviarImagemDeTileset(mestre, new Uint8Array())).rejects.toMatchObject({ status: 400 });
      await expect(enviarImagemDeTileset(mestre, new TextEncoder().encode('não é uma imagem png de verdade, só texto'))).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/não é um PNG/) });
      await expect(enviarImagemDeTileset(mestre, png(5000, 10))).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/1 a 4096/) });
    });

    it('só quem edita mapas e tilesets envia', async () => {
      await expect(enviarImagemDeTileset(suporte, png())).rejects.toMatchObject({ status: 403 });
    });

    it('rota: 201 com a imagem, 401 sem login, 400 para PNG ruim ou corpo grande, 403 sem permissão', async () => {
      const pedido = (uid: string | null, corpo: Uint8Array, extra: Record<string, string> = {}) =>
        new NextRequest('http://t/api/mestre/tilesets/imagem', {
          method: 'POST',
          headers: { ...(uid ? { authorization: `Bearer ${tokenDeTeste(uid)}` } : {}), 'content-type': 'image/png', ...extra },
          body: corpo as unknown as BodyInit,
        });
      const ok = await enviarRota(pedido('mes1', png()));
      expect(ok.status).toBe(201);
      expect((await ok.json()).imagem).toMatchObject({ largura: 64, altura: 32 });
      expect((await enviarRota(pedido(null, png()))).status).toBe(401);
      expect((await enviarRota(pedido('mes1', new TextEncoder().encode('texto')))).status).toBe(400);
      expect((await enviarRota(pedido('mes1', png(), { 'content-length': String(BYTES_MAXIMOS_DO_PNG_NO_ARMAZENAMENTO + 1) }))).status).toBe(400);
      expect((await enviarRota(pedido('sup1', png()))).status).toBe(403);
    });
  });

  describe('tileset que usa a imagem do armazenamento', () => {
    async function dadosPorUrl(largura = 64, altura = 32) {
      const { url } = await enviarImagemDeTileset(mestre, png(largura, altura));
      const { imagem: _imagem, ...resto } = tilesetDeTeste(largura, altura);
      return { ...resto, imagemUrl: url };
    }

    it('cria, publica e o jogo recebe o endereço (sem o PNG em texto)', async () => {
      const dados = await dadosPorUrl();
      await criarConteudo(mestre, { tipo: 'tileset', id: 'grama', nome: 'Grama', dados });
      await publicarConteudo(mestre, 'tileset', 'grama', { revisao: 1, motivo: 'publicado no teste' });
      const doc = await repositorio.lerConteudo(chaveDoConteudo('tileset', 'grama'));
      expect(doc?.rascunho).toMatchObject({ imagemUrl: dados.imagemUrl });
      expect(doc?.rascunho).not.toHaveProperty('imagem');
    });

    it('recusa endereço de outro lugar, arquivo que não existe e dimensões diferentes do arquivo', async () => {
      const dados = await dadosPorUrl();
      const chave = chaveDaUrlPublica(dados.imagemUrl)!;
      await expect(criarConteudo(mestre, { tipo: 'tileset', id: 'fora', nome: 'Fora', dados: { ...dados, imagemUrl: `https://outro.exemplo.test/${chave}` } })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/não veio do armazenamento/) });
      const sumida = { ...dados, imagemUrl: urlPublicaDe(`tilesets/${'b'.repeat(64)}.png`) };
      await expect(criarConteudo(mestre, { tipo: 'tileset', id: 'sumida', nome: 'Sumida', dados: sumida })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/não foi encontrada/) });
      const errada = { ...dados, larguraImagem: 128, colunas: 8 };
      await expect(criarConteudo(mestre, { tipo: 'tileset', id: 'errada', nome: 'Errada', dados: errada })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/não batem com a imagem guardada/) });
      await gravarArquivo(chave, new Uint8Array([1, 2, 3]), 'image/png');
      await expect(criarConteudo(mestre, { tipo: 'tileset', id: 'quebrada', nome: 'Quebrada', dados })).rejects.toMatchObject({ status: 400 });
    });

    it('tilesets antigos com PNG em texto continuam valendo', async () => {
      await expect(criarConteudo(mestre, { tipo: 'tileset', id: 'antigo', nome: 'Antigo', dados: tilesetDeTeste() })).resolves.toMatchObject({ id: 'antigo' });
    });
  });
});
