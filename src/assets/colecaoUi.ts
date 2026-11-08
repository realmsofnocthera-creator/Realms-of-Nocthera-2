import type { EmblemaRaridade } from '@/rules/emblemas';
import type { RaridadeDeColecionavel } from '@/rules/colecionaveis';
import { srcDaImagem } from '@/assets/srcDaImagem';
import imgMoedaFragmento from './images/colecao/moeda-fragmento.webp';
import imgMoedaPedra from './images/colecao/moeda-pedra.webp';
import imgMoedaPoeira from './images/colecao/moeda-poeira.webp';
import imgMoedaCacos from './images/colecao/moeda-cacos.webp';
import imgRarComum from './images/colecao/raridade-comum.webp';
import imgRarRaro from './images/colecao/raridade-raro.webp';
import imgRarMuitoRaro from './images/colecao/raridade-muito-raro.webp';
import imgRarEpico from './images/colecao/raridade-epico.webp';
import imgRarLendario from './images/colecao/raridade-lendario.webp';
import imgRarMitico from './images/colecao/raridade-mitico.webp';
import imgMolCinza from './images/colecao/moldura-cinza.webp';
import imgMolAzul from './images/colecao/moldura-azul.webp';
import imgMolDourado from './images/colecao/moldura-dourado.webp';
import imgMolVermelho from './images/colecao/moldura-vermelho.webp';
import imgBanner from './images/colecao/banner.webp';

/** As moedas da Coleção: Fragmento de Memória, Pedra da Recordação, Poeira de Alma e Cacos de Alma. */
export type MoedaDaColecao = 'fragmento' | 'pedra' | 'poeira' | 'cacos';
export const ICONES_DAS_MOEDAS: Readonly<Record<MoedaDaColecao, string>> = {
  fragmento: srcDaImagem(imgMoedaFragmento),
  pedra: srcDaImagem(imgMoedaPedra),
  poeira: srcDaImagem(imgMoedaPoeira),
  cacos: srcDaImagem(imgMoedaCacos),
};

/** O ícone de cada raridade (64×64): cinza, azul, ciano, roxo, dourado e vermelho. */
export const ICONES_DE_RARIDADE: Readonly<Record<EmblemaRaridade, string>> = {
  comum: srcDaImagem(imgRarComum),
  raro: srcDaImagem(imgRarRaro),
  muitoRaro: srcDaImagem(imgRarMuitoRaro),
  epico: srcDaImagem(imgRarEpico),
  lendario: srcDaImagem(imgRarLendario),
  mitico: srcDaImagem(imgRarMitico),
};

/** A moldura em volta da arte de cada colecionável (a roxa do Yuri fica reservada). */
export const MOLDURAS_DOS_COLECIONAVEIS: Readonly<Record<RaridadeDeColecionavel, string>> = {
  comum: srcDaImagem(imgMolCinza),
  muitoRaro: srcDaImagem(imgMolAzul),
  lendario: srcDaImagem(imgMolDourado),
  mitico: srcDaImagem(imgMolVermelho),
};

/** O banner do topo das listas da Coleção (900×382); o título vai no painel escuro do meio. */
export const BANNER_DA_COLECAO = srcDaImagem(imgBanner);
