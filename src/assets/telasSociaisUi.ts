import { srcDaImagem } from '@/assets/srcDaImagem';
import imgMesa from './images/cacada-livro/mesa.webp';
import imgFundoMochila from './images/mochila/fundo.webp';
import imgFundoHub from './images/hud/background-hub.webp';
import imgFundoTorre from './images/torre/fundo-1.webp';
import imgFundoBuscar from './images/buscar/fundo.webp';
import imgPergaminho from './images/torre/pergaminho.webp';
import imgSigilo from './images/torre/icone-sigilo.webp';
import imgPresente from './images/checkin/presente.webp';
import imgFeito from './images/checkin/feito.webp';
import imgBauPequeno from './images/checkin/bau-pequeno.webp';
import imgBauAberto from './images/checkin/bau-aberto.webp';
import imgMolduraDourada from './images/colecao/moldura-dourado.webp';
import imgMolduraCinza from './images/colecao/moldura-cinza.webp';
import imgMolduraAzul from './images/colecao/moldura-azul.webp';
import imgMolduraPerfil from './images/hud/moldura-perfil.webp';
import imgRarComum from './images/colecao/raridade-comum.webp';
import imgRarRaro from './images/colecao/raridade-raro.webp';
import imgRarMuitoRaro from './images/colecao/raridade-muito-raro.webp';
import imgRarEpico from './images/colecao/raridade-epico.webp';
import imgRarLendario from './images/colecao/raridade-lendario.webp';
import imgRarMitico from './images/colecao/raridade-mitico.webp';

/**
 * As peças das telas do Correio, do Mercado, das Missões, dos Anúncios e de Personalizar o perfil: tudo vem de artes do Yuri que o jogo já
 * tem (a mesa da Caçada, o fundo da Mochila, o Hub, a Torre, o Buscar, o pergaminho e o sigilo da Torre, os baús do Check-in, as molduras e as
 * gemas de raridade da Coleção), junto com o kit da Arena (botões, abas, cartões e ícones, em `arenaUi`).
 */
export const TELAS_UI = {
  fundoCorreio: srcDaImagem(imgMesa),
  fundoMissoes: srcDaImagem(imgFundoMochila),
  fundoMercado: srcDaImagem(imgFundoHub),
  fundoAnuncios: srcDaImagem(imgFundoTorre),
  fundoPerfil: srcDaImagem(imgFundoBuscar),
  pergaminho: srcDaImagem(imgPergaminho),
  sigilo: srcDaImagem(imgSigilo),
  presente: srcDaImagem(imgPresente),
  feito: srcDaImagem(imgFeito),
  bauFechado: srcDaImagem(imgBauPequeno),
  bauAberto: srcDaImagem(imgBauAberto),
  molduraDourada: srcDaImagem(imgMolduraDourada),
  molduraCinza: srcDaImagem(imgMolduraCinza),
  molduraAzul: srcDaImagem(imgMolduraAzul),
  molduraPerfil: srcDaImagem(imgMolduraPerfil),
} as const;

/** A gema de cada raridade (comum a mítica). */
export const GEMA_DA_RARIDADE: Readonly<Record<string, string>> = {
  comum: srcDaImagem(imgRarComum),
  raro: srcDaImagem(imgRarRaro),
  muitoRaro: srcDaImagem(imgRarMuitoRaro),
  epico: srcDaImagem(imgRarEpico),
  lendario: srcDaImagem(imgRarLendario),
  mitico: srcDaImagem(imgRarMitico),
};
