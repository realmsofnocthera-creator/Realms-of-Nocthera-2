import { describe, it, expect } from 'vitest';
import { acrescentarTiles, alternarTile, dadosDoTilesetCompacto, gradeCompacta, indiceNoPonto, indicesDaArea, recortesDaSelecao, type FolhaDeTiles } from '@/lib/folhaDeTiles';
import { validarTileset } from '@/rules/tileset';

// folha de 4 x 3 tiles de 16 px, com 2 px de margem e 1 px entre tiles: 2 + 4*16 + 3*1 + 2 = 71 de largura
const FOLHA: FolhaDeTiles = { larguraImagem: 71, alturaImagem: 54, tamanhoDoTile: 16, margem: 2, espacamento: 1 };
const HASH = 'c'.repeat(64);
const URL_DO_COMPACTO = `https://arquivos.exemplo.test/tilesets/${HASH}.png`;
const URL_DA_FOLHA = `https://arquivos.exemplo.test/tilesets/${'d'.repeat(64)}.png`;

describe('Folha de tiles: escolher tiles e montar o tileset compacto', () => {
  it('descobre o tile pelo ponto tocado, ignorando margem e espaço entre tiles', () => {
    expect(indiceNoPonto(5, 5, FOLHA)).toBe(0);
    expect(indiceNoPonto(2 + 17 * 3 + 4, 2 + 17 * 2 + 4, FOLHA)).toBe(2 * 4 + 3);
    expect(indiceNoPonto(0, 5, FOLHA)).toBeNull(); // margem
    expect(indiceNoPonto(2 + 16, 5, FOLHA)).toBeNull(); // espaço entre o tile 0 e o 1
    expect(indiceNoPonto(70, 5, FOLHA)).toBeNull(); // depois do último tile
    expect(indiceNoPonto(5, 200, FOLHA)).toBeNull();
  });

  it('marca e desmarca mantendo a ordem da escolha', () => {
    let s: number[] = [];
    s = alternarTile(s, 5);
    s = alternarTile(s, 1);
    s = alternarTile(s, 9);
    expect(s).toEqual([5, 1, 9]);
    expect(alternarTile(s, 1)).toEqual([5, 9]);
  });

  it('seleciona a área entre dois tiles, em qualquer direção', () => {
    expect(indicesDaArea(1, 6, 4)).toEqual([1, 2, 5, 6]);
    expect(indicesDaArea(6, 1, 4)).toEqual([1, 2, 5, 6]);
    expect(indicesDaArea(3, 3, 4)).toEqual([3]);
  });

  it('acrescenta no fim sem repetir', () => {
    expect(acrescentarTiles([4, 2], [2, 7, 4, 1])).toEqual([4, 2, 7, 1]);
  });

  it('a imagem compacta tem até 16 tiles por linha', () => {
    expect(gradeCompacta(1)).toEqual({ colunas: 1, linhas: 1 });
    expect(gradeCompacta(5)).toEqual({ colunas: 5, linhas: 1 });
    expect(gradeCompacta(16)).toEqual({ colunas: 16, linhas: 1 });
    expect(gradeCompacta(17)).toEqual({ colunas: 16, linhas: 2 });
    expect(gradeCompacta(40)).toEqual({ colunas: 16, linhas: 3 });
  });

  it('cada tile escolhido sai do lugar certo da folha e vai para o lugar certo da imagem compacta', () => {
    const r = recortesDaSelecao([5, 0, 11], FOLHA);
    // tile 5 = coluna 1, linha 1 da folha: x = 2 + 17, y = 2 + 17
    expect(r[0]).toEqual({ de: { x: 19, y: 19, lado: 16 }, para: { x: 0, y: 0 } });
    expect(r[1]).toEqual({ de: { x: 2, y: 2, lado: 16 }, para: { x: 16, y: 0 } });
    expect(r[2]).toEqual({ de: { x: 2 + 17 * 3, y: 2 + 17 * 2, lado: 16 }, para: { x: 32, y: 0 } });
  });

  it('os dados montados passam na validação do tileset, com ou sem folha de origem', () => {
    const compacto = { largura: 48, altura: 16, colunas: 3, linhas: 1 };
    const comOrigem = dadosDoTilesetCompacto(compacto, URL_DO_COMPACTO, FOLHA, [5, 0, 11], URL_DA_FOLHA);
    const r = validarTileset(comOrigem);
    expect(r.ok && r.dados.origem?.tiles).toEqual([5, 0, 11]);
    const semOrigem = dadosDoTilesetCompacto(compacto, URL_DO_COMPACTO, FOLHA, [5, 0, 11], null);
    expect(validarTileset(semOrigem).ok).toBe(true);
    expect(semOrigem).not.toHaveProperty('origem');
  });
});
