import { describe, it, expect } from 'vitest';
import { BYTES_MAXIMOS_DO_PNG, chaveDaImagemNoEndereco, dimensoesDoPng, origemDaImagem, gradeDoTileset, recorteDoTile, TILES_POR_TILESET, validarTileset } from '@/rules/tileset';
import { pngDeTeste, tilesetDeTeste } from '@/test/pngDeTeste';

const erros = (bruto: unknown) => {
  const r = validarTileset(bruto);
  return r.ok ? '' : r.erros.join(' ');
};

describe('Tileset importado (formato 1)', () => {
  it('grade: quantos tiles cabem, com margem e espaçamento', () => {
    expect(gradeDoTileset(64, 32, 16, 0, 0)).toEqual({ colunas: 4, linhas: 2 });
    // 1 px de margem e 2 px entre tiles: 1 + 16 + 2 + 16 + 1 = 36
    expect(gradeDoTileset(36, 36, 16, 1, 2)).toEqual({ colunas: 2, linhas: 2 });
    expect(gradeDoTileset(10, 10, 16, 0, 0)).toEqual({ colunas: 0, linhas: 0 });
  });

  it('recorte de cada tile na imagem', () => {
    const t = { colunas: 4, tamanhoDoTile: 16, margem: 1, espacamento: 2 };
    expect(recorteDoTile(t, 0)).toEqual({ x: 1, y: 1, lado: 16 });
    expect(recorteDoTile(t, 5)).toEqual({ x: 1 + 18, y: 1 + 18, lado: 16 });
  });

  it('lê as dimensões do cabeçalho do PNG', () => {
    const b64 = pngDeTeste(300, 200).split(',')[1];
    expect(dimensoesDoPng(new Uint8Array(Buffer.from(b64, 'base64')))).toEqual({ largura: 300, altura: 200 });
    expect(dimensoesDoPng(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it('um tileset certo passa e volta igual', () => {
    const t = tilesetDeTeste();
    const r = validarTileset(t);
    expect(r.ok && r.dados).toEqual(t);
  });

  it('recusa imagem que não é PNG, corrompida, grande demais ou com dimensões trocadas', () => {
    expect(erros({ ...tilesetDeTeste(), imagem: 'data:image/jpeg;base64,AAAA' })).toMatch(/PNG/);
    expect(erros({ ...tilesetDeTeste(), imagem: 'data:image/png;base64,@@@' })).toMatch(/corrompida/);
    expect(erros({ ...tilesetDeTeste(), imagem: 'data:image/png;base64,' + Buffer.from('não é png').toString('base64') })).toMatch(/não é um PNG/);
    expect(erros({ ...tilesetDeTeste(), imagem: pngDeTeste(64, 32, BYTES_MAXIMOS_DO_PNG) })).toMatch(/passa de 420 KB/);
    expect(erros({ ...tilesetDeTeste(), larguraImagem: 65 })).toMatch(/dimensões informadas não batem/);
  });

  it('recusa grade que não bate, sem tiles ou com tiles demais, e campos desconhecidos', () => {
    expect(erros({ ...tilesetDeTeste(), colunas: 5 })).toMatch(/Colunas e linhas não batem/);
    expect(erros({ ...tilesetDeTeste(8, 8, 16), colunas: 0, linhas: 0 })).toMatch(/Nenhum tile cabe/);
    const grande = tilesetDeTeste(4096, 4096, 8);
    expect(grande.colunas * grande.linhas).toBeGreaterThan(TILES_POR_TILESET);
    expect(erros(grande)).toMatch(/passa de 4095 tiles/);
    expect(erros({ ...tilesetDeTeste(), tamanhoDoTile: 4 })).toMatch(/tile vai de 8 a 128/);
    expect(erros({ ...tilesetDeTeste(), nome: 'x' })).toMatch(/Campos desconhecidos no tileset: nome/);
    expect(erros('texto')).toMatch(/objeto/);
  });

  describe('imagem no armazenamento (imagemUrl)', () => {
    const HASH = 'a'.repeat(64);
    const porUrl = (extra: Record<string, unknown> = {}) => {
      const { imagem: _imagem, ...resto } = tilesetDeTeste();
      return { ...resto, imagemUrl: `https://arquivos.exemplo.test/tilesets/${HASH}.png`, ...extra };
    };

    it('aceita o endereço de uma imagem do jogo e não guarda o PNG em texto', () => {
      const r = validarTileset(porUrl());
      expect(r.ok && r.dados.imagemUrl).toBe(`https://arquivos.exemplo.test/tilesets/${HASH}.png`);
      expect(r.ok && 'imagem' in r.dados).toBe(false);
      expect(chaveDaImagemNoEndereco(`https://x.dev/tilesets/${HASH}.png`)).toBe(`tilesets/${HASH}.png`);
    });

    it('recusa endereço de fora do padrão, os dois campos juntos e dimensões fora do limite', () => {
      expect(erros(porUrl({ imagemUrl: 'http://x.dev/tilesets/' + HASH + '.png' }))).toMatch(/enviada pelo painel/);
      expect(erros(porUrl({ imagemUrl: 'https://x.dev/outro/' + HASH + '.png' }))).toMatch(/enviada pelo painel/);
      expect(erros(porUrl({ imagemUrl: 'https://x.dev/tilesets/curto.png' }))).toMatch(/enviada pelo painel/);
      expect(erros(porUrl({ imagem: pngDeTeste(64, 32) }))).toMatch(/não os dois/);
      expect(erros(porUrl({ larguraImagem: 5000 }))).toMatch(/1 a 4096/);
    });

    it('confere a grade com as dimensões informadas', () => {
      expect(erros(porUrl({ colunas: 9 }))).toMatch(/Colunas e linhas não batem/);
    });

    it('origemDaImagem escolhe o endereço ou o PNG em texto', () => {
      expect(origemDaImagem({ imagem: 'data:x' })).toBe('data:x');
      expect(origemDaImagem({ imagemUrl: 'https://x' })).toBe('https://x');
    });
  });

  describe('origem (tiles escolhidos de uma folha)', () => {
    const HASH2 = 'a'.repeat(64);
    const FOLHA_URL = `https://arquivos.exemplo.test/tilesets/${'b'.repeat(64)}.png`;
    const base = () => {
      const { imagem: _imagem, ...resto } = tilesetDeTeste(32, 16, 16); // 2 colunas x 1 linha
      return { ...resto, imagemUrl: `https://arquivos.exemplo.test/tilesets/${HASH2}.png` };
    };
    const origem = (extra: Record<string, unknown> = {}) => ({ folhaUrl: FOLHA_URL, larguraFolha: 64, alturaFolha: 32, margem: 0, espacamento: 0, tiles: [7, 0], ...extra });

    it('aceita a origem e devolve igual', () => {
      const r = validarTileset({ ...base(), origem: origem() });
      expect(r.ok && r.dados.origem).toEqual(origem());
    });

    it('recusa origem sem imagemUrl, tile fora da folha, repetido, lista grande demais e campos desconhecidos', () => {
      expect(erros({ ...tilesetDeTeste(), origem: origem() })).toMatch(/só vale para tileset com a imagem no armazenamento/);
      expect(erros({ ...base(), origem: origem({ tiles: [8, 0] }) })).toMatch(/tile que não existe na folha/); // a folha 64x32 tem 4x2 = 8 tiles (0 a 7)
      expect(erros({ ...base(), origem: origem({ tiles: [-1] }) })).toMatch(/não existe na folha/);
      expect(erros({ ...base(), origem: origem({ tiles: [1, 1] }) })).toMatch(/repete um tile/);
      expect(erros({ ...base(), origem: origem({ tiles: [0, 1, 2] }) })).toMatch(/mais tiles do que o tileset tem/);
      expect(erros({ ...base(), origem: origem({ tiles: [] }) })).toMatch(/de 1 a 4095 tiles/);
      expect(erros({ ...base(), origem: origem({ extra: 1 }) })).toMatch(/Campos desconhecidos na origem/);
      expect(erros({ ...base(), origem: origem({ folhaUrl: 'https://x.dev/outro.png' }) })).toMatch(/endereço da folha de origem/);
      expect(erros({ ...base(), origem: origem({ larguraFolha: 5000 }) })).toMatch(/1 a 4096/);
      expect(erros({ ...base(), origem: 'x' })).toMatch(/precisa ser um objeto/);
    });
  });
});
