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
import imgPainelHabilidades from './images/personagem/painel-habilidades.webp';
import imgIdentidade from './images/personagem/identidade.webp';
import imgDesenvolvimento from './images/personagem/banner-desenvolvimento.webp';
import imgHp from './images/personagem/icone-hp.webp';
import imgSobreescudo from './images/personagem/icone-sobreescudo.webp';
import imgCritico from './images/personagem/icone-critico.webp';
import imgVigor from './images/personagem/icone-vigor.webp';
import imgSorte from './images/personagem/icone-sorte.webp';
import imgForca from './images/personagem/icone-forca.webp';
import imgVitalidade from './images/personagem/icone-vitalidade.webp';
import imgArcano from './images/personagem/icone-arcano.webp';
import imgInteligencia from './images/personagem/icone-inteligencia.webp';
import imgAgilidade from './images/personagem/icone-agilidade.webp';
import imgPoder from './images/ranking/icone-poder.webp';

/** A moldura da ficha do personagem (folha do Yuri, sem texto escrito: os textos vêm do código). */
export const FICHA_UI = {
  banner: srcDaImagem(imgBanner),
  voltar: srcDaImagem(imgVoltar),
  bussola: srcDaImagem(imgBussola),
  painelAtributos: srcDaImagem(imgPainelAtributos),
  painelHabilidades: srcDaImagem(imgPainelHabilidades),
  identidade: srcDaImagem(imgIdentidade),
  desenvolvimento: srcDaImagem(imgDesenvolvimento),
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

export const ICONES_DA_FICHA = {
  hp: srcDaImagem(imgHp),
  sobreescudo: srcDaImagem(imgSobreescudo),
  critico: srcDaImagem(imgCritico),
  vigor: srcDaImagem(imgVigor),
  sorte: srcDaImagem(imgSorte),
  forca: srcDaImagem(imgForca),
  vitalidade: srcDaImagem(imgVitalidade),
  arcano: srcDaImagem(imgArcano),
  inteligencia: srcDaImagem(imgInteligencia),
  agilidade: srcDaImagem(imgAgilidade),
  /** O emblema do Poder Total (o mesmo do Ranking). */
  poder: srcDaImagem(imgPoder),
} as const;

/** Onde ficam as coisas sobre cada moldura (em % da imagem), medido na arte. */
export const POSICOES_DA_FICHA = {
  /** Os 7 quadrados do painel de habilidades: 4 em cima e 3 embaixo (centros e lado do ícone). */
  habilidades: { lado: 7.2, centros: [[22.5, 41.7], [40.1, 41.7], [57.8, 41.7], [76.9, 41], [31.8, 72], [48.6, 72], [67.4, 72]] as const },
  /** O espaço das linhas dentro do painel de atributos (esquerda, topo, direita, base) e a lupa da moldura. */
  atributos: { interior: { esquerda: 8, topo: 13.8, direita: 8, base: 8.4 }, lupa: { esquerda: 79.5, topo: 2, lado: 13 } },
  /** A barra de XP e as linhas de texto dentro da moldura de identidade. */
  identidade: { nome: { topo: 15, altura: 34 }, barra: { esquerda: 9.6, largura: 82.9, topo: 54, altura: 9 }, rodape: { topo: 68, altura: 22 } },
} as const;
