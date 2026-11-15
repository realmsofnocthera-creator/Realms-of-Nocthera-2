import { describe, it, expect } from 'vitest';
import path from 'node:path';
import sharp from 'sharp';
import { CARTAS_DAS_PROVACOES, LIVRO_DAS_PROVACOES as L, PAGINAS_DO_LIVRO } from '@/assets/provacoesLivroUi';

const PASTA = path.resolve(__dirname, '../../assets/images/provacoes/livro');
const ler = async (nome: string) => {
  const { data, info } = await sharp(path.join(PASTA, nome)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, largura: info.width, altura: info.height };
};
const alfa = (img: { data: Buffer; largura: number }, x: number, y: number) => img.data[(y * img.largura + x) * 4 + 3];

describe('Arquivos de arte do livro das Provações', () => {
  it('o livro parado tem 480 x 312, sem fundo (cantos transparentes) e com o livro opaco no centro', async () => {
    const img = await ler('livro.webp');
    expect([img.largura, img.altura]).toEqual([L.largura, L.altura]);
    for (const [x, y] of [[0, 0], [L.largura - 1, 0], [0, 5], [L.largura - 1, 5]]) expect(alfa(img, x, y)).toBe(0);
    expect(alfa(img, 240, 150)).toBe(255);
  });

  it('a folha da virada tem a grade 4 x 2 de quadros 480 x 312, todos sem fundo e todos com a página desenhada', async () => {
    const img = await ler('livro-virada.webp');
    expect([img.largura, img.altura]).toEqual([L.largura * L.colunas, L.altura * L.linhas]);
    for (let q = 0; q < L.quadros; q++) {
      const x0 = (q % L.colunas) * L.largura;
      const y0 = Math.floor(q / L.colunas) * L.altura;
      expect(alfa(img, x0, y0), `quadro ${q}: canto transparente`).toBe(0);
      expect(alfa(img, x0 + 240, y0 + 150), `quadro ${q}: livro opaco`).toBe(255);
    }
  });

  it('as páginas do livro cabem dentro do livro e não se encostam', () => {
    const { esquerda: e, direita: d } = PAGINAS_DO_LIVRO;
    expect(e.x).toBeGreaterThan(0);
    expect(e.x + e.largura).toBeLessThan(d.x);
    expect(d.x + d.largura).toBeLessThan(L.largura);
    for (const p of [e, d]) expect(p.y + p.altura).toBeLessThan(L.altura);
  });

  it('a mesa de fundo, os botões e as peças de pergaminho têm o tamanho certo', async () => {
    const mesa = await ler('mesa.webp');
    expect([mesa.largura, mesa.altura]).toEqual([1024, 1536]);
    for (const nome of ['seta-esq.webp', 'seta-dir.webp', 'seta-esq-apagada.webp', 'seta-dir-apagada.webp']) {
      const s = await ler(nome);
      expect([s.largura, s.altura], nome).toEqual([44, 30]);
      expect(alfa(s, 0, 0), nome).toBe(0);
    }
    expect((await ler('pergaminho-titulo.webp')).largura).toBe(132);
    expect((await ler('etiqueta.webp')).largura).toBe(64);
  });

  it('as 7 cartas das provações existem com o tamanho declarado', async () => {
    const nomes: Record<string, string> = { cacada: 'cacada', 'torre-celestial': 'torre-celestial', guerreiro: 'guerreiro', expedicao: 'expedicao', 'chefe-mundial': 'chefe-mundial', 'batalha-sangrenta': 'batalha-sangrenta', 'teste-equipe': 'teste-equipe' };
    expect(Object.keys(CARTAS_DAS_PROVACOES).sort()).toEqual(Object.keys(nomes).sort());
    for (const [id, arquivo] of Object.entries(nomes)) {
      const img = await ler(`carta-${arquivo}.webp`);
      const c = CARTAS_DAS_PROVACOES[id as keyof typeof CARTAS_DAS_PROVACOES];
      expect([img.largura, img.altura], id).toEqual([c.largura, c.altura]);
    }
  });
});
