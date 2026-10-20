import { describe, it, expect, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { POST as enviarRota } from '@/app/api/mestre/cenas/imagem/route';
import { gravarArquivo, limparArmazenamentoDeTeste, lerInicioDoArquivo, urlPublicaDe } from '@/server/armazenamento';
import { criarConteudo, limparCacheDoConteudo, publicarConteudo, salvarRascunho } from '@/server/conteudo';
import { enviarImagemDeCena, formatoDaImagem } from '@/server/imagensDeCena';
import { limparCacheRevogacao } from '@/server/auth';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import { BYTES_MAXIMOS_DA_IMAGEM_DE_CENA, cenaEmBranco } from '@/rules/cena';
import { descreverAcao } from '@/lib/mestreTela';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const mestre = sessao('mestre', 'mes1');
const suporte = sessao('suporte', 'sup1');

const PNG = (n = 20) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array.from({ length: n }, (_, i) => i)]);
const JPG = () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const WEBP = () => new Uint8Array([...new TextEncoder().encode('RIFF'), 1, 2, 3, 4, ...new TextEncoder().encode('WEBP'), 5, 6]);
const hash = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

describe('Imagens de cena no armazenamento (R2)', () => {
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

  it('reconhece PNG, JPEG e WebP pela assinatura', () => {
    expect(formatoDaImagem(PNG())).toBe('png');
    expect(formatoDaImagem(JPG())).toBe('jpg');
    expect(formatoDaImagem(WEBP())).toBe('webp');
    expect(formatoDaImagem(new TextEncoder().encode('texto qualquer'))).toBeNull();
  });

  it('grava com o SHA-256 e a extensão certa, e deixa no log', async () => {
    for (const [bytes, ext] of [[PNG(), 'png'], [JPG(), 'jpg'], [WEBP(), 'webp']] as const) {
      const r = await enviarImagemDeCena(mestre, bytes);
      expect(r).toMatchObject({ chave: `cenas/${hash(bytes)}.${ext}`, formato: ext, bytes: bytes.length });
      expect(await lerInicioDoArquivo(r.chave, 8)).toEqual(bytes.slice(0, 8));
    }
    const [e] = await repositorio.listarLogAdmin(1);
    expect(e).toMatchObject({ acao: 'cena.imagem' });
    expect(descreverAcao(e)).toMatch(/Enviou uma imagem de cena/);
  });

  it('recusa vazio, arquivo que não é imagem, acima de 1 MB e quem não edita mapas', async () => {
    await expect(enviarImagemDeCena(mestre, new Uint8Array())).rejects.toMatchObject({ status: 400 });
    await expect(enviarImagemDeCena(mestre, new TextEncoder().encode('<svg onload=alert(1)>'))).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/PNG, JPEG ou WebP/) });
    await expect(enviarImagemDeCena(mestre, PNG(BYTES_MAXIMOS_DA_IMAGEM_DE_CENA))).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/passa de 1024 KB/) });
    await expect(enviarImagemDeCena(suporte, PNG())).rejects.toMatchObject({ status: 403 });
  });

  it('rota: 201, 401 sem login, 400 para arquivo ruim ou corpo grande, 403 sem permissão', async () => {
    const pedido = (uid: string | null, corpo: Uint8Array, extra: Record<string, string> = {}) =>
      new NextRequest('http://t/api/mestre/cenas/imagem', {
        method: 'POST',
        headers: { ...(uid ? { authorization: `Bearer ${tokenDeTeste(uid)}` } : {}), 'content-type': 'image/jpeg', ...extra },
        body: corpo as unknown as BodyInit,
      });
    expect((await enviarRota(pedido('mes1', JPG()))).status).toBe(201);
    expect((await enviarRota(pedido(null, JPG()))).status).toBe(401);
    expect((await enviarRota(pedido('mes1', new TextEncoder().encode('texto')))).status).toBe(400);
    expect((await enviarRota(pedido('mes1', JPG(), { 'content-length': String(BYTES_MAXIMOS_DA_IMAGEM_DE_CENA + 1) }))).status).toBe(400);
    expect((await enviarRota(pedido('sup1', JPG()))).status).toBe(403);
  });

  describe('cena que usa imagens do armazenamento', () => {
    it('cria, salva e publica com retrato e fundo enviados', async () => {
      const retrato = await enviarImagemDeCena(mestre, WEBP());
      const fundo = await enviarImagemDeCena(mestre, JPG());
      const dados = { ...cenaEmBranco('Abertura'), personagens: [{ id: 'chefe', nome: 'Chefe', retrato: retrato.url }], telas: [{ tipo: 'fala' as const, personagem: 'chefe', texto: 'Oi.', fundo: fundo.url }] };
      await criarConteudo(mestre, { tipo: 'cena', id: 'abertura', nome: 'Abertura', dados: cenaEmBranco('Abertura') });
      await salvarRascunho(mestre, 'cena', 'abertura', { dados, revisao: 1, nome: 'Abertura' });
      await expect(publicarConteudo(mestre, 'cena', 'abertura', { revisao: 2, motivo: 'publicada no teste' })).resolves.toBeDefined();
    });

    it('recusa imagem de outro lugar, que não existe ou cujo conteúdo não é imagem', async () => {
      const base = cenaEmBranco('Teste');
      const com = (url: string) => ({ ...base, telas: [{ tipo: 'narracao' as const, texto: 'x', fundo: url }] });
      const chave = `cenas/${'d'.repeat(64)}.png`;
      await expect(criarConteudo(mestre, { tipo: 'cena', id: 'fora', nome: 'Fora', dados: com(`https://outro.exemplo.test/${chave}`) })).rejects.toMatchObject({ status: 400 });
      await expect(criarConteudo(mestre, { tipo: 'cena', id: 'sumida', nome: 'Sumida', dados: com(urlPublicaDe(chave)) })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/não foi encontrada/) });
      await gravarArquivo(chave, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), 'image/png');
      await expect(criarConteudo(mestre, { tipo: 'cena', id: 'quebrada', nome: 'Quebrada', dados: com(urlPublicaDe(chave)) })).rejects.toMatchObject({ status: 400 });
    });
  });
});
