import { srcDaImagem } from '@/assets/srcDaImagem';
import imgAbaEspadas from './images/resgate/aba-espadas.webp';
import imgAbaElmo from './images/resgate/aba-elmo.webp';
import imgAbaPocao from './images/resgate/aba-pocao.webp';
import imgAbaGema from './images/resgate/aba-gema.webp';
import imgAbaBau from './images/resgate/aba-bau.webp';
import imgAbaCoroa from './images/resgate/aba-coroa.webp';
import imgBauEmblemas from './images/resgate/bau-emblemas.webp';
import imgBrasao from './images/resgate/brasao-emblema.webp';
import type { AbaDaLoja } from '@/rules/loja';

/** Os ícones das abas do Resgate (a loja de ouro): da folha de HUD da loja. */
export const ICONES_DAS_ABAS_DO_RESGATE: Readonly<Record<AbaDaLoja, string>> = {
  materiais: srcDaImagem(imgAbaEspadas),
  recursos: srcDaImagem(imgAbaPocao),
  cartas: srcDaImagem(imgAbaElmo),
  emblemas: srcDaImagem(imgBrasao),
  essencia: srcDaImagem(imgAbaGema),
};

/** O baú de emblemas (produto de escolha de emblema épico) e o brasão do emblema. */
export const BAU_DE_EMBLEMAS = srcDaImagem(imgBauEmblemas);
export const BRASAO_DE_EMBLEMA = srcDaImagem(imgBrasao);
/** O baú dourado (baú de escolha de carta) e a coroa (reservada para a Loja VIP). */
export const BAU_DOURADO = srcDaImagem(imgAbaBau);
export const COROA_VIP = srcDaImagem(imgAbaCoroa);
