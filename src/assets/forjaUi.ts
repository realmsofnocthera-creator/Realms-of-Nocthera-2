import type { RaridadeArma } from '@/rules/armas';
import { srcDaImagem } from '@/assets/srcDaImagem';
import imgTitulo from './images/forja/titulo.webp';
import imgPainel from './images/forja/painel.webp';
import imgAbaAtiva from './images/forja/aba-ativa.webp';
import imgAba from './images/forja/aba.webp';
import imgCaixaArte from './images/forja/caixa-arte.webp';
import imgBarraStatus from './images/forja/barra-status.webp';
import imgDivisor from './images/forja/divisor.webp';
import imgBtnForjar from './images/forja/btn-forjar.webp';
import imgBtnEscuro from './images/forja/btn-escuro.webp';
import imgX from './images/forja/x.webp';
import imgProibido from './images/forja/proibido.webp';
import imgOk from './images/forja/ok.webp';
import imgVoltar from './images/forja/voltar.webp';
import imgPlacaComum from './images/forja/placa-comum.webp';
import imgPlacaRaro from './images/forja/placa-raro.webp';
import imgPlacaMuitoRaro from './images/forja/placa-muito-raro.webp';
import imgPlacaEpico from './images/forja/placa-epico.webp';
import imgPlacaLendario from './images/forja/placa-lendario.webp';
import imgPlacaMitico from './images/forja/placa-mitico.webp';
import imgNoComum from './images/forja/no-comum.webp';
import imgNoRaro from './images/forja/no-raro.webp';
import imgNoMuitoRaro from './images/forja/no-muito-raro.webp';
import imgNoEpico from './images/forja/no-epico.webp';
import imgNoLendario from './images/forja/no-lendario.webp';
import imgNoMitico from './images/forja/no-mitico.webp';
import imgNoEscolhido from './images/forja/no-escolhido.webp';

/** O kit de interface da Forja (azul e dourado): painéis em 9 fatias, barra de título, abas, placas e molduras por raridade. */
export const KIT_DA_FORJA = {
  titulo: srcDaImagem(imgTitulo),
  painel: srcDaImagem(imgPainel),
  abaAtiva: srcDaImagem(imgAbaAtiva),
  aba: srcDaImagem(imgAba),
  caixaArte: srcDaImagem(imgCaixaArte),
  barraStatus: srcDaImagem(imgBarraStatus),
  divisor: srcDaImagem(imgDivisor),
  btnForjar: srcDaImagem(imgBtnForjar),
  btnEscuro: srcDaImagem(imgBtnEscuro),
  x: srcDaImagem(imgX),
  proibido: srcDaImagem(imgProibido),
  ok: srcDaImagem(imgOk),
  voltar: srcDaImagem(imgVoltar),
} as const;

/** A placa do nome (com a cor da raridade) e a moldura do slot de cada raridade de arma. */
export const PLACAS_DE_RARIDADE: Readonly<Record<RaridadeArma, string>> = {
  comum: srcDaImagem(imgPlacaComum),
  raro: srcDaImagem(imgPlacaRaro),
  muitoRaro: srcDaImagem(imgPlacaMuitoRaro),
  epico: srcDaImagem(imgPlacaEpico),
  lendario: srcDaImagem(imgPlacaLendario),
  mitico: srcDaImagem(imgPlacaMitico),
};

export const MOLDURAS_DE_SLOT: Readonly<Record<RaridadeArma, string>> = {
  comum: srcDaImagem(imgNoComum),
  raro: srcDaImagem(imgNoRaro),
  muitoRaro: srcDaImagem(imgNoMuitoRaro),
  epico: srcDaImagem(imgNoEpico),
  lendario: srcDaImagem(imgNoLendario),
  mitico: srcDaImagem(imgNoMitico),
};

/** A moldura ciano brilhante: a arma escolhida e a pronta para forjar. */
export const MOLDURA_ESCOLHIDA = srcDaImagem(imgNoEscolhido);
