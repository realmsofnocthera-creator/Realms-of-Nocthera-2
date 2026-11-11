import { srcDaImagem } from '@/assets/srcDaImagem';
import imgTabuleiro from './images/checkin/tabuleiro.webp';
import imgBauAberto from './images/checkin/bau-aberto.webp';
import imgPresente from './images/checkin/presente.webp';
import imgMoedas from './images/checkin/moedas.webp';
import imgIngresso from './images/checkin/ingresso.webp';
import imgBauPequeno from './images/checkin/bau-pequeno.webp';
import imgFeito from './images/checkin/feito.webp';

/** O tabuleiro pendurado por correntes, onde fica o calendário de 30 dias. */
export const TABULEIRO_DO_CHECKIN = srcDaImagem(imgTabuleiro);
/** O baú aberto (dia 30, o grande prêmio do calendário). */
export const BAU_ABERTO = srcDaImagem(imgBauAberto);
/** O presente (a recompensa do dia, no pop-up). */
export const PRESENTE = srcDaImagem(imgPresente);
/** A pilha de moedas (recompensas em ouro). */
export const MOEDAS_DE_OURO = srcDaImagem(imgMoedas);
/** O ingresso dourado (avanço de expedição). */
export const INGRESSO = srcDaImagem(imgIngresso);
/** O baú pequeno (recompensa de baú). */
export const BAU_PEQUENO = srcDaImagem(imgBauPequeno);
/** A marca dourada de "feito". */
export const MARCA_DE_FEITO = srcDaImagem(imgFeito);
