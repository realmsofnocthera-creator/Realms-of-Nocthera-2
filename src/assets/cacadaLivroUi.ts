import { srcDaImagem } from '@/assets/srcDaImagem';
import imgLivro from './images/cacada-livro/livro.webp';
import imgMesa from './images/cacada-livro/mesa.webp';
import imgAbaBaixo from './images/cacada-livro/aba-baixo.webp';
import imgAbaAlto from './images/cacada-livro/aba-alto.webp';
import imgFita1 from './images/cacada-livro/fita-1.webp';
import imgFita2 from './images/cacada-livro/fita-2.webp';
import imgFita3 from './images/cacada-livro/fita-3.webp';
import imgFita4 from './images/cacada-livro/fita-4.webp';
import imgFita5 from './images/cacada-livro/fita-5.webp';
import imgVirada1 from './images/cacada-livro/virada-1.webp';
import imgVirada2 from './images/cacada-livro/virada-2.webp';
import imgVirada3 from './images/cacada-livro/virada-3.webp';
import imgVirada4 from './images/cacada-livro/virada-4.webp';
import imgVirada5 from './images/cacada-livro/virada-5.webp';
import imgVirada6 from './images/cacada-livro/virada-6.webp';

/** Uma caixa em pixels da arte do livro (1176 x 792): esquerda, topo, largura e altura. */
export interface CaixaDaArte {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

/**
 * O livro da Caçada (arte do Yuri, o livro vermelho): o livro aberto parado, com as duas abas de cima e as cinco fitas da
 * borda direita "soltas". Cada aba ou fita escolhida é uma peça pequena colocada por cima do livro (a aba sobe, a fita
 * sai para fora). A virada de página são 6 quadros que só guardam o que muda (a caixa `virada`) e ficam por cima de tudo.
 * A virada para trás toca os mesmos quadros ao contrário.
 */
export const LIVRO_DA_CACADA = {
  livro: srcDaImagem(imgLivro),
  mesa: srcDaImagem(imgMesa),
  largura: 1176,
  altura: 792,
  abas: {
    baixo: { src: srcDaImagem(imgAbaBaixo), caixa: { x: 206, y: 2, largura: 299, altura: 134 } },
    alto: { src: srcDaImagem(imgAbaAlto), caixa: { x: 650, y: 2, largura: 299, altura: 134 } },
  },
  /** As fitas das estrelas, de cima para baixo (a 1ª é a mais alta). */
  fitas: [
    { src: srcDaImagem(imgFita1), caixa: { x: 1095, y: 156, largura: 76, altura: 93 } },
    { src: srcDaImagem(imgFita2), caixa: { x: 1095, y: 249, largura: 76, altura: 84 } },
    { src: srcDaImagem(imgFita3), caixa: { x: 1095, y: 339, largura: 76, altura: 84 } },
    { src: srcDaImagem(imgFita4), caixa: { x: 1095, y: 429, largura: 76, altura: 84 } },
    { src: srcDaImagem(imgFita5), caixa: { x: 1095, y: 519, largura: 76, altura: 87 } },
  ] as readonly { src: string; caixa: CaixaDaArte }[],
  virada: {
    quadros: [imgVirada1, imgVirada2, imgVirada3, imgVirada4, imgVirada5, imgVirada6].map(srcDaImagem),
    caixa: { x: 156, y: 52, largura: 908, altura: 648 } as CaixaDaArte,
    /** Quanto cada quadro fica na tela (a referência do Yuri usa 70 ms). */
    msPorQuadro: 70,
  },
  /** Onde o conteúdo cabe em cada página (dentro da moldura do pergaminho). */
  paginas: {
    esquerda: { x: 206, y: 158, largura: 296, altura: 486 } as CaixaDaArte,
    direita: { x: 648, y: 158, largura: 306, altura: 486 } as CaixaDaArte,
  },
} as const;

/** Uma caixa da arte em % do livro, para posicionar por cima dele (acompanha o tamanho da tela). */
export function caixaEmPorcento(c: CaixaDaArte): { left: string; top: string; width: string; height: string } {
  return {
    left: `${(c.x / LIVRO_DA_CACADA.largura) * 100}%`,
    top: `${(c.y / LIVRO_DA_CACADA.altura) * 100}%`,
    width: `${(c.largura / LIVRO_DA_CACADA.largura) * 100}%`,
    height: `${(c.altura / LIVRO_DA_CACADA.altura) * 100}%`,
  };
}
