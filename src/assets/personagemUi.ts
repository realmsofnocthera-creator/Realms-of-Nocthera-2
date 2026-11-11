import { srcDaImagem } from '@/assets/srcDaImagem';
import imgBanner from './images/personagem/banner.webp';
import imgAbaPersonagem from './images/personagem/aba-personagem.webp';
import imgAbaEspadas from './images/personagem/aba-espadas.webp';
import imgAbaEscudo from './images/personagem/aba-escudo.webp';
import imgAbaDiamante from './images/personagem/aba-diamante.webp';
import imgAbaPergaminho from './images/personagem/aba-pergaminho.webp';
import imgBussola from './images/personagem/bussola.webp';
import imgVoltar from './images/personagem/voltar.webp';
import imgPainelAtributos from './images/personagem/painel-atributos.webp';
import imgIdentidade from './images/personagem/identidade.webp';
import imgPoder from './images/ranking/icone-poder.webp';
import imgDesenvolvimento from './images/personagem/desenvolvimento.webp';
import imgFundo from './images/personagem/fundo.webp';

/** A moldura da ficha do personagem (folha do Yuri, sem texto escrito: os textos vêm do código). */
export const FICHA_UI = {
  banner: srcDaImagem(imgBanner),
  voltar: srcDaImagem(imgVoltar),
  bussola: srcDaImagem(imgBussola),
  painelAtributos: srcDaImagem(imgPainelAtributos),
  identidade: srcDaImagem(imgIdentidade),
  /** O emblema do Desenvolvimento de personagem (setas azuis sobre a silhueta). */
  desenvolvimento: srcDaImagem(imgDesenvolvimento),
  /** O fundo da ficha: a trama escura com os ornamentos azuis e dourados nos cantos. */
  fundo: srcDaImagem(imgFundo),
} as const;

/** As abas da ficha: a do personagem é a moldura acesa; as outras três usam a moldura apagada com o ícone. */
export const ABAS_DA_FICHA_UI = {
  personagem: srcDaImagem(imgAbaPersonagem),
  equipamentos: srcDaImagem(imgAbaEspadas),
  emblemas: srcDaImagem(imgAbaEscudo),
  alma: srcDaImagem(imgAbaDiamante),
  /** Reservado: o pergaminho da folha ainda não tem função definida. */
  pergaminho: srcDaImagem(imgAbaPergaminho),
} as const;

/** O emblema do Poder Total (o mesmo do Ranking). Os ícones de atributo e de recurso são os de sempre (`@/assets/icons`). */
export const ICONE_DO_PODER = srcDaImagem(imgPoder);

/** Onde ficam as coisas sobre cada moldura (em % da imagem), medido na arte. */
export const POSICOES_DA_FICHA = {
  /** O espaço das linhas dentro do painel de atributos (esquerda, topo, direita, base) e a lupa da moldura. */
  atributos: { interior: { esquerda: 8, topo: 13.8, direita: 8, base: 8.4 }, lupa: { esquerda: 79.5, topo: 2, lado: 13 } },
  /** A barra de XP e as linhas de texto dentro da moldura de identidade. */
  identidade: { nome: { topo: 15, altura: 34 }, barra: { esquerda: 9.6, largura: 82.9, topo: 54, altura: 9 }, rodape: { topo: 68, altura: 22 } },
} as const;
