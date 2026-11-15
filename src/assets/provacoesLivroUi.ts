import { srcDaImagem } from '@/assets/srcDaImagem';
import type { ProvacaoId } from '@/rules/provacoes';
import imgLivro from './images/provacoes/livro/livro.webp';
import imgVirada from './images/provacoes/livro/livro-virada.webp';
import imgMesa from './images/provacoes/livro/mesa.webp';
import imgPergaminho from './images/provacoes/livro/pergaminho-titulo.webp';
import imgEtiqueta from './images/provacoes/livro/etiqueta.webp';
import imgSetaEsq from './images/provacoes/livro/seta-esq.webp';
import imgSetaDir from './images/provacoes/livro/seta-dir.webp';
import imgSetaEsqApagada from './images/provacoes/livro/seta-esq-apagada.webp';
import imgSetaDirApagada from './images/provacoes/livro/seta-dir-apagada.webp';
import imgCartaCacada from './images/provacoes/livro/carta-cacada.webp';
import imgCartaTorre from './images/provacoes/livro/carta-torre-celestial.webp';
import imgCartaGuerreiro from './images/provacoes/livro/carta-guerreiro.webp';
import imgCartaExpedicao from './images/provacoes/livro/carta-expedicao.webp';
import imgCartaChefe from './images/provacoes/livro/carta-chefe-mundial.webp';
import imgCartaBatalha from './images/provacoes/livro/carta-batalha-sangrenta.webp';
import imgCartaEquipe from './images/provacoes/livro/carta-teste-equipe.webp';

/**
 * O livro das Provações (arte do Yuri): o livro aberto sem fundo (480 x 312, pixel art) e a folha com os 8 quadros da
 * virada de página, em grade de 4 colunas por 2 linhas (a última linha vai da esquerda para a direita, como a leitura).
 * A virada para trás toca os mesmos quadros ao contrário. A imagem parada é idêntica antes e depois da virada.
 */
export const LIVRO_DAS_PROVACOES = {
  livro: srcDaImagem(imgLivro),
  virada: srcDaImagem(imgVirada),
  mesa: srcDaImagem(imgMesa),
  pergaminho: srcDaImagem(imgPergaminho),
  etiqueta: srcDaImagem(imgEtiqueta),
  setas: {
    esq: srcDaImagem(imgSetaEsq),
    dir: srcDaImagem(imgSetaDir),
    esqApagada: srcDaImagem(imgSetaEsqApagada),
    dirApagada: srcDaImagem(imgSetaDirApagada),
  },
  /** O tamanho de cada quadro (em pixels da arte) e a grade da folha de quadros. */
  largura: 480,
  altura: 312,
  colunas: 4,
  linhas: 2,
  quadros: 8,
  /** Quanto cada quadro da virada fica na tela (a referência do Yuri usa 70 ms). */
  msPorQuadro: 70,
} as const;

/** Onde o texto cabe em cada página (em pixels da arte de 480 x 312): esquerda, topo, largura e altura. */
export const PAGINAS_DO_LIVRO = {
  esquerda: { x: 52, y: 48, largura: 150, altura: 216 },
  direita: { x: 270, y: 50, largura: 150, altura: 216 },
} as const;

/** As cartas das provações (arte nova do Yuri, com a moldura dourada): a da Expedição é vertical (216 x 288). */
export const CARTAS_DAS_PROVACOES: Readonly<Record<ProvacaoId, { src: string; largura: number; altura: number }>> = {
  cacada: { src: srcDaImagem(imgCartaCacada), largura: 384, altura: 216 },
  'torre-celestial': { src: srcDaImagem(imgCartaTorre), largura: 384, altura: 216 },
  guerreiro: { src: srcDaImagem(imgCartaGuerreiro), largura: 384, altura: 216 },
  expedicao: { src: srcDaImagem(imgCartaExpedicao), largura: 216, altura: 288 },
  'chefe-mundial': { src: srcDaImagem(imgCartaChefe), largura: 384, altura: 216 },
  'batalha-sangrenta': { src: srcDaImagem(imgCartaBatalha), largura: 384, altura: 216 },
  'teste-equipe': { src: srcDaImagem(imgCartaEquipe), largura: 384, altura: 216 },
};
