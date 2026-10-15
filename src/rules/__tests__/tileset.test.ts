import { describe, it, expect } from 'vitest';
import { BYTES_MAXIMOS_DO_PNG, dimensoesDoPng, gradeDoTileset, recorteDoTile, TILES_POR_TILESET, validarTileset } from '@/rules/tileset';
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
});
