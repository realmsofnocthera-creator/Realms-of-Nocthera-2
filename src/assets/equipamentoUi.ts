import { srcDaImagem } from '@/assets/srcDaImagem';
import imgPrincipal from './images/equipamento/painel-principal.webp';
import imgStatus from './images/equipamento/painel-status.webp';
import imgEscolha from './images/equipamento/painel-escolha.webp';
import imgTabela from './images/equipamento/painel-tabela.webp';
import imgBarra from './images/equipamento/barra.webp';

/**
 * As molduras da tela de Equipamentos (folha azul e dourada do Yuri). Sem texto e sem os espaços desenhados: os 6 espaços,
 * as linhas e os títulos são feitos em código. `interior` e `titulo` são as posições medidas na arte, em % da imagem.
 */
export const MOLDURAS_DO_EQUIPAMENTO = {
  principal: { src: srcDaImagem(imgPrincipal), largura: 601, altura: 700, interior: { esquerda: 6.7, topo: 18.3, direita: 6.7, base: 7.4 }, titulo: { topo: 4.2, altura: 6.4, esquerda: 15, direita: 15 } },
  status: { src: srcDaImagem(imgStatus), largura: 387, altura: 701, interior: { esquerda: 7.8, topo: 11.1, direita: 7.8, base: 5.4 }, titulo: { topo: 3, altura: 6, esquerda: 14, direita: 14 } },
  escolha: { src: srcDaImagem(imgEscolha), largura: 566, altura: 524, interior: { esquerda: 7.1, topo: 14.1, direita: 7.1, base: 9.5 }, titulo: { topo: 3.2, altura: 6.4, esquerda: 14, direita: 14 } },
  tabela: { src: srcDaImagem(imgTabela), largura: 371, altura: 536, interior: { esquerda: 9.2, topo: 14.9, direita: 9.2, base: 11.6 }, titulo: { topo: 4, altura: 7, esquerda: 16, direita: 16 } },
  barra: { src: srcDaImagem(imgBarra), largura: 979, altura: 119 },
} as const;
