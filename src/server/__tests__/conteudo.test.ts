import { describe, it, expect, beforeEach } from 'vitest';
import {
  criarConteudo,
  lerConteudoDoPainel,
  lerConteudoPublicado,
  lerVersaoDoPainel,
  limparCacheDoConteudo,
  listarConteudos,
  publicarConteudo,
  reverterConteudo,
  salvarRascunho,
} from '@/server/conteudo';
import type { SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import { mapaVazio, valorDoTile } from '@/rules/mapa';
import { tilesetDeTeste } from '@/test/pngDeTeste';
import { resetCharacterStore, setTestAdminLogFailHook, setTestPersistenceFailHook } from '@/test/repositorioMemoria';

const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const dono = sessao('dono');
const mestre = sessao('mestre');
const suporte = sessao('suporte');
const moderador = sessao('moderador');

/** Um mapa marcado: a colisão fica ligada só na posição n (0 a 15), para conferir qual versão o jogo vê. */
const comTile = (n: number) => {
  const m = mapaVazio(4, 4);
  m.camadas.colisao[n] = 1;
  return m;
};
const marca = (dados: unknown) => (dados as ReturnType<typeof mapaVazio>).camadas.colisao.indexOf(1);

async function criarVila(quem: SessaoMestre = mestre) {
  return criarConteudo(quem, { tipo: 'mapa', id: 'vila', nome: 'Vila Inicial', dados: mapaVazio(4, 4) });
}

describe('Conteúdo versionado (servidor)', () => {
  beforeEach(() => {
    resetCharacterStore();
    limparCacheDoConteudo();
  });

  describe('criar e salvar o rascunho', () => {
    it('cria só o rascunho: revisão 1, nada no ar, e o jogo ainda não vê', async () => {
      const doc = await criarVila();
      expect(doc).toMatchObject({ chave: 'mapa__vila', revisao: 1, versaoPublicada: null, ultimaVersao: 0, criadoPor: 'mestre1' });
      expect(await lerConteudoPublicado('mapa', 'vila')).toBeNull();
      expect((await listarConteudos(suporte, 'mapa')).map((i) => i.id)).toEqual(['vila']);
    });

    it('valida no servidor: identificador, nome, tipo e o schema do mapa', async () => {
      await expect(criarConteudo(mestre, { tipo: 'mapa', id: 'Vila!', nome: 'Vila', dados: mapaVazio(4, 4) })).rejects.toMatchObject({ status: 400 });
      await expect(criarConteudo(mestre, { tipo: 'mapa', id: 'vila', nome: 'V', dados: mapaVazio(4, 4) })).rejects.toMatchObject({ status: 400 });
      await expect(criarConteudo(mestre, { tipo: 'quest', id: 'vila', nome: 'Vila', dados: {} })).rejects.toMatchObject({ status: 400 });
      await expect(criarConteudo(mestre, { tipo: 'mapa', id: 'vila', nome: 'Vila', dados: { ...mapaVazio(4, 4), largura: 999 } })).rejects.toMatchObject({
        status: 400,
        message: expect.stringMatching(/^Mapa inválido: .*largura/),
      });
    });

    it('identificador repetido dá 409', async () => {
      await criarVila();
      await expect(criarVila()).rejects.toMatchObject({ status: 409 });
    });

    it('salvar sobe a revisão; quem salva com revisão velha recebe 409 e nada se perde', async () => {
      await criarVila();
      const salvo = await salvarRascunho(mestre, 'mapa', 'vila', { dados: comTile(5), revisao: 1, nome: 'Vila de Althor' });
      expect(salvo).toMatchObject({ revisao: 2, nome: 'Vila de Althor' });
      await expect(salvarRascunho(dono, 'mapa', 'vila', { dados: comTile(7), revisao: 1 })).rejects.toMatchObject({ status: 409 });
      const { conteudo } = await lerConteudoDoPainel(suporte, 'mapa', 'vila');
      expect(marca(conteudo.rascunho)).toBe(5);
    });

    it('rascunho inválido não é salvo', async () => {
      await criarVila();
      const ruim = comTile(5);
      ruim.camadas.colisao[3] = 9;
      await expect(salvarRascunho(mestre, 'mapa', 'vila', { dados: ruim, revisao: 1 })).rejects.toMatchObject({ status: 400 });
      expect((await repositorio.lerConteudo('mapa__vila'))?.revisao).toBe(1);
    });
  });

  describe('publicar e voltar atrás', () => {
    it('publicar cria a versão 1 e o jogo passa a ver; o rascunho segue editável sem mudar o que está no ar', async () => {
      await criarVila();
      await salvarRascunho(mestre, 'mapa', 'vila', { dados: comTile(5), revisao: 1 });
      const { versao, conteudo } = await publicarConteudo(mestre, 'mapa', 'vila', { revisao: 2, motivo: 'primeira versão' });
      expect(versao).toMatchObject({ versao: 1, origem: 'publicacao', publicadoPor: 'mestre1', motivo: 'primeira versão' });
      expect(conteudo).toMatchObject({ versaoPublicada: 1, ultimaVersao: 1 });

      const noJogo = await lerConteudoPublicado('mapa', 'vila');
      expect(noJogo).toMatchObject({ versao: 1, nome: 'Vila Inicial' });
      expect(marca(noJogo?.dados)).toBe(5);

      await salvarRascunho(mestre, 'mapa', 'vila', { dados: comTile(8), revisao: 2 });
      limparCacheDoConteudo();
      expect(marca((await lerConteudoPublicado('mapa', 'vila'))?.dados)).toBe(5);
    });

    it('não publica o mesmo conteúdo duas vezes, nem com revisão velha', async () => {
      await criarVila();
      await publicarConteudo(mestre, 'mapa', 'vila', { revisao: 1, motivo: 'primeira versão' });
      await expect(publicarConteudo(mestre, 'mapa', 'vila', { revisao: 1, motivo: 'de novo igual' })).rejects.toMatchObject({ status: 400 });
      await salvarRascunho(mestre, 'mapa', 'vila', { dados: comTile(2), revisao: 1 });
      await expect(publicarConteudo(mestre, 'mapa', 'vila', { revisao: 1, motivo: 'revisão velha' })).rejects.toMatchObject({ status: 409 });
    });

    it('voltar atrás publica a versão antiga como versão nova; o histórico só cresce', async () => {
      await criarVila();
      await publicarConteudo(mestre, 'mapa', 'vila', { revisao: 1, motivo: 'versão vazia' });
      await salvarRascunho(mestre, 'mapa', 'vila', { dados: comTile(9), revisao: 1 });
      await publicarConteudo(mestre, 'mapa', 'vila', { revisao: 2, motivo: 'com um tile' });
      expect(marca((await lerConteudoPublicado('mapa', 'vila'))?.dados)).toBe(9);

      const { versao, conteudo } = await reverterConteudo(dono, 'mapa', 'vila', { versao: 1, ultimaVersao: 2, motivo: 'tile errado' });
      expect(versao).toMatchObject({ versao: 3, origem: 'reversao', revertidaDe: 1 });
      expect(conteudo).toMatchObject({ versaoPublicada: 3, ultimaVersao: 3, revisao: 2 });
      // o cache do jogo foi limpo na publicação: a volta atrás vale na hora nesta instância
      expect(marca((await lerConteudoPublicado('mapa', 'vila'))?.dados)).toBe(-1);

      const { versoes } = await lerConteudoDoPainel(suporte, 'mapa', 'vila');
      expect(versoes.map((v) => v.versao)).toEqual([3, 2, 1]);
      expect((await lerVersaoDoPainel(suporte, 'mapa', 'vila', '2')).dados).toEqual(comTile(9));
    });

    it('voltar atrás recusa: versão que já está no ar, versão que não existe e última versão desatualizada', async () => {
      await criarVila();
      await publicarConteudo(mestre, 'mapa', 'vila', { revisao: 1, motivo: 'versão vazia' });
      await expect(reverterConteudo(mestre, 'mapa', 'vila', { versao: 1, ultimaVersao: 1, motivo: 'já está no ar' })).rejects.toMatchObject({ status: 400 });
      await expect(reverterConteudo(mestre, 'mapa', 'vila', { versao: 7, ultimaVersao: 1, motivo: 'não existe' })).rejects.toMatchObject({ status: 404 });
      await expect(reverterConteudo(mestre, 'mapa', 'vila', { versao: 1, ultimaVersao: 0, motivo: 'tela velha' })).rejects.toMatchObject({ status: 409 });
    });

    it('publicar e voltar atrás pedem motivo', async () => {
      await criarVila();
      await expect(publicarConteudo(mestre, 'mapa', 'vila', { revisao: 1, motivo: 'oi' })).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('permissões (conferidas no serviço, mesmo chamando direto)', () => {
    it('suporte só lê; moderador nem lê', async () => {
      await criarVila();
      await expect(criarConteudo(suporte, { tipo: 'mapa', id: 'outra', nome: 'Outra', dados: mapaVazio(4, 4) })).rejects.toMatchObject({ status: 403 });
      await expect(salvarRascunho(suporte, 'mapa', 'vila', { dados: comTile(1), revisao: 1 })).rejects.toMatchObject({ status: 403 });
      await expect(publicarConteudo(suporte, 'mapa', 'vila', { revisao: 1, motivo: 'tentativa' })).rejects.toMatchObject({ status: 403 });
      await expect(reverterConteudo(suporte, 'mapa', 'vila', { versao: 1, ultimaVersao: 0, motivo: 'tentativa' })).rejects.toMatchObject({ status: 403 });
      await expect(listarConteudos(moderador, 'mapa')).rejects.toMatchObject({ status: 403 });
      await expect(lerConteudoDoPainel(moderador, 'mapa', 'vila')).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('log administrativo', () => {
    it('cada ação fica no log com o hash e os números, sem o conteúdo inteiro', async () => {
      await criarVila();
      await salvarRascunho(mestre, 'mapa', 'vila', { dados: comTile(4), revisao: 1 });
      await publicarConteudo(mestre, 'mapa', 'vila', { revisao: 2, motivo: 'primeira versão' });
      const log = await repositorio.listarLogAdmin(10);
      expect(log.map((e) => e.acao).reverse()).toEqual(['conteudo.criar', 'conteudo.rascunho', 'conteudo.publicar']);
      expect(log.every((e) => e.alvo === 'mapa__vila')).toBe(true);
      expect(log[0]).toMatchObject({ motivo: 'primeira versão', depois: { versaoPublicada: 1 } });
      expect(JSON.stringify(log)).not.toContain('camadas');
    });

    it('sem log não há mudança; se a gravação falha depois, fica "<ação>.falhou"', async () => {
      await criarVila();
      setTestAdminLogFailHook(() => {
        throw new Error('log fora do ar');
      });
      await expect(salvarRascunho(mestre, 'mapa', 'vila', { dados: comTile(4), revisao: 1 })).rejects.toThrow('log fora do ar');
      expect((await repositorio.lerConteudo('mapa__vila'))?.revisao).toBe(1);
      setTestAdminLogFailHook(null);

      setTestPersistenceFailHook((op) => {
        if (op.startsWith('publicarConteudo')) throw new Error('banco fora do ar');
      });
      await expect(publicarConteudo(mestre, 'mapa', 'vila', { revisao: 1, motivo: 'vai falhar' })).rejects.toThrow('banco fora do ar');
      setTestPersistenceFailHook(null);
      expect((await repositorio.lerConteudo('mapa__vila'))?.versaoPublicada).toBeNull();
      expect((await repositorio.listarLogAdmin(1))[0].acao).toBe('conteudo.publicar.falhou');
    });
  });

  describe('leitura no jogo', () => {
    it('tipo ou identificador inválido dão null sem ir ao banco', async () => {
      expect(await lerConteudoPublicado('monstro', 'vila')).toBeNull();
      expect(await lerConteudoPublicado('mapa', '../x')).toBeNull();
    });
  });
});

describe('Conteúdo versionado: tilesets e referências do mapa', () => {
  beforeEach(() => {
    resetCharacterStore();
    limparCacheDoConteudo();
  });

  const mapaComFloresta = () => {
    const m = { ...mapaVazio(4, 4), tilesets: ['floresta'] };
    m.camadas.chao[0] = valorDoTile(0, 3);
    return m;
  };

  it('o mapa só salva com tileset que existe, e só publica com o tileset publicado', async () => {
    await expect(criarConteudo(mestre, { tipo: 'mapa', id: 'vila', nome: 'Vila', dados: mapaComFloresta() })).rejects.toMatchObject({
      status: 400,
      message: 'Tileset "floresta" não existe.',
    });
    await criarConteudo(mestre, { tipo: 'tileset', id: 'floresta', nome: 'Floresta', dados: tilesetDeTeste() });
    await criarConteudo(mestre, { tipo: 'mapa', id: 'vila', nome: 'Vila', dados: mapaComFloresta() });
    await expect(publicarConteudo(mestre, 'mapa', 'vila', { revisao: 1, motivo: 'primeira versão' })).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/Publique antes o tileset "floresta"/),
    });
    await publicarConteudo(mestre, 'tileset', 'floresta', { revisao: 1, motivo: 'tileset novo' });
    const { versao } = await publicarConteudo(mestre, 'mapa', 'vila', { revisao: 1, motivo: 'primeira versão' });
    expect(versao.versao).toBe(1);
    expect((await lerConteudoPublicado('tileset', 'floresta'))?.dados).toEqual(tilesetDeTeste());
  });

  it('tileset inválido não é criado', async () => {
    await expect(criarConteudo(mestre, { tipo: 'tileset', id: 'floresta', nome: 'Floresta', dados: { ...tilesetDeTeste(), colunas: 9 } })).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/^Tileset inválido/),
    });
    await expect(criarConteudo(suporte, { tipo: 'tileset', id: 'floresta', nome: 'Floresta', dados: tilesetDeTeste() })).rejects.toMatchObject({ status: 403 });
  });
});
