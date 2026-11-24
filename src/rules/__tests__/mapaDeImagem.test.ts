import { describe, expect, it } from 'vitest';
import { chaveDaImagemDoMapaNoEndereco, gradeDaImagem, mapaVazio, validarMapa, LADO_MAXIMO_DO_MAPA } from '@/rules/mapa';
import { comprimirMapa, descomprimirMapa } from '@/rules/mapaComprimido';
import { desenharFundoDoMapa } from '@/components/mestre/desenharMapaDeJogo';

const URL_OK = `https://arquivos.exemplo.test/mapas/${'a'.repeat(64)}.png`;
const comFundo = (largura: number, altura: number, tile: number, extra: Record<string, unknown> = {}) => {
  const g = gradeDaImagem(largura, altura, tile);
  return { ...mapaVazio(g.largura, g.altura, tile), fundo: { url: URL_OK, largura, altura, ...extra } };
};
const erros = (v: ReturnType<typeof validarMapa>) => (v.ok ? [] : v.erros);

describe('Mapa de imagem (regras)', () => {
  it('a grade cobre a imagem inteira: arredonda para cima', () => {
    expect(gradeDaImagem(640, 480, 32)).toEqual({ largura: 20, altura: 15 });
    expect(gradeDaImagem(641, 481, 32)).toEqual({ largura: 21, altura: 16 });
    expect(gradeDaImagem(1000, 700, 48)).toEqual({ largura: 21, altura: 15 });
  });

  it('o endereço da imagem precisa ser mapas/<sha256>.png do nosso armazenamento', () => {
    expect(chaveDaImagemDoMapaNoEndereco(URL_OK)).toBe(`mapas/${'a'.repeat(64)}.png`);
    for (const ruim of ['http://x/mapas/' + 'a'.repeat(64) + '.png', `https://x/tilesets/${'a'.repeat(64)}.png`, `https://x/mapas/${'a'.repeat(63)}.png`, `https://x/mapas/${'a'.repeat(64)}.png?x=1`, `https://x/mapas/${'A'.repeat(64)}.png`]) {
      expect(chaveDaImagemDoMapaNoEndereco(ruim), ruim).toBeNull();
    }
  });

  it('valida o mapa de imagem e guarda o fundo; mapas sem fundo seguem como sempre', () => {
    const v = validarMapa(comFundo(1000, 700, 32));
    expect(v.ok && v.dados.fundo).toEqual({ url: URL_OK, largura: 1000, altura: 700 });
    expect(v.ok && v.dados.largura).toBe(32);
    const sem = validarMapa(mapaVazio(8, 8));
    expect(sem.ok && 'fundo' in sem.dados).toBe(false);
  });

  it('recusa grade que não cobre a imagem, imagem grande demais, endereço ruim e campos a mais', () => {
    expect(erros(validarMapa({ ...comFundo(640, 480, 32), largura: 10, camadas: mapaVazio(10, 15, 32).camadas })).join(' ')).toMatch(/pede um mapa de 20 × 15 tiles/);
    expect(erros(validarMapa(comFundo(9000, 100, 64))).join(' ')).toMatch(/1 a 8192/);
    expect(erros(validarMapa(comFundo(8192, 8192, 64))).join(' ')).toMatch(/milhões de pixels/);
    expect(erros(validarMapa({ ...comFundo(640, 480, 32), fundo: { url: 'https://x/y.png', largura: 640, altura: 480 } })).join(' ')).toMatch(/não é de uma imagem enviada/);
    expect(erros(validarMapa(comFundo(640, 480, 32, { extra: 1 }))).join(' ')).toMatch(/campos desconhecidos/);
    expect(erros(validarMapa({ ...comFundo(640, 480, 32), fundo: 'x' })).length).toBeGreaterThan(0);
  });

  it('o maior mapa de imagem de cada tile cabe em 256 tiles de lado', () => {
    for (const tile of [16, 24, 32, 48, 64]) {
      const lado = LADO_MAXIMO_DO_MAPA * tile;
      const g = gradeDaImagem(Math.min(lado, 8192), 100, tile);
      expect(g.largura).toBeLessThanOrEqual(LADO_MAXIMO_DO_MAPA);
    }
  });

  it('o fundo sobrevive à compressão dos mapas grandes', () => {
    const grande = { ...mapaVazio(130, 130, 32), fundo: { url: URL_OK, largura: 4160, altura: 4160 } };
    const ida = comprimirMapa(grande);
    expect(typeof ida.camadas.chao).toBe('string');
    expect(ida.fundo).toEqual(grande.fundo);
    expect(descomprimirMapa(ida)).toEqual(grande);
  });
});

describe('desenharFundoDoMapa', () => {
  const imagem = (largura: number, altura: number) => ({ naturalWidth: largura, naturalHeight: altura }) as unknown as HTMLImageElement;
  const chamadas: number[][] = [];
  const ctx = { drawImage: (_i: unknown, ...a: number[]) => chamadas.push(a) } as unknown as CanvasRenderingContext2D;

  it('desenha só o recorte visível, na posição certa da câmera', () => {
    chamadas.length = 0;
    // imagem de 4000 x 3000, câmera em (1000, 500) numa tela de 400 x 300, escala 1
    desenharFundoDoMapa(ctx, imagem(4000, 3000), 1, 1000, 500, 400, 300);
    expect(chamadas).toEqual([[1000, 500, 400, 300, 0, 0, 400, 300]]);
    // com zoom 2: a tela mostra metade do recorte
    chamadas.length = 0;
    desenharFundoDoMapa(ctx, imagem(4000, 3000), 2, 1000, 500, 400, 300);
    expect(chamadas).toEqual([[500, 250, 200, 150, 0, 0, 400, 300]]);
  });

  it('com a câmera antes do começo do mapa deixa a margem vazia, e no fim corta na borda da imagem', () => {
    chamadas.length = 0;
    desenharFundoDoMapa(ctx, imagem(4000, 3000), 1, -50, -20, 400, 300);
    expect(chamadas).toEqual([[0, 0, 350, 280, 50, 20, 350, 280]]);
    chamadas.length = 0;
    desenharFundoDoMapa(ctx, imagem(4000, 3000), 1, 3800, 2900, 400, 300);
    expect(chamadas).toEqual([[3800, 2900, 200, 100, 0, 0, 200, 100]]);
    chamadas.length = 0;
    desenharFundoDoMapa(ctx, imagem(4000, 3000), 1, 5000, 0, 400, 300); // fora da imagem: nada
    expect(chamadas).toEqual([]);
  });
});
