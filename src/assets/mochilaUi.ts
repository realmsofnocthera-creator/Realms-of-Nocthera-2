import { srcDaImagem } from '@/assets/srcDaImagem';
import imgFundo from './images/mochila/fundo.webp';
import imgAbaBolsa from './images/mochila/aba-bolsa.webp';
import imgAbaEspadas from './images/mochila/aba-espadas.webp';
import imgAbaEscudo from './images/mochila/aba-escudo.webp';
import imgAbaPocao from './images/mochila/aba-pocao.webp';
import imgAbaGema from './images/mochila/aba-gema.webp';
import imgSaldoAlma from './images/mochila/saldo-fragmentosAlma.webp';
import imgSaldoHabilidade from './images/mochila/saldo-essenciaHabilidade.webp';
import imgSaldoAscensao from './images/mochila/saldo-fragmentosAscensao.webp';
import imgSaldoSoberano from './images/mochila/saldo-essenciaDeSoberano.webp';

/** O fundo da Mochila: couro escuro com a moldura dourada e os ornamentos nos cantos. */
export const FUNDO_DA_MOCHILA = srcDaImagem(imgFundo);

/** Os ícones das abas (bolsa, espadas, escudo, poção e gema). */
export const ICONES_DE_ABA = {
  todos: srcDaImagem(imgAbaBolsa),
  monstros: srcDaImagem(imgAbaEspadas),
  orbes: srcDaImagem(imgAbaEscudo),
  mundo: srcDaImagem(imgAbaPocao),
  especiais: srcDaImagem(imgAbaGema),
} as const;

/** Os ícones dos 4 saldos novos (o ouro e o diamante vêm do HUD). */
export const ICONES_DE_SALDO = {
  fragmentosAlma: srcDaImagem(imgSaldoAlma),
  essenciaHabilidade: srcDaImagem(imgSaldoHabilidade),
  fragmentosAscensao: srcDaImagem(imgSaldoAscensao),
  essenciaDeSoberano: srcDaImagem(imgSaldoSoberano),
} as const;
