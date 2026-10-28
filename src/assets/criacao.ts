/**
 * Artes da criação de personagem (Raça, Classe e Resumo). Os retratos são recortes de corpo inteiro em 480×720 com
 * fundo transparente, que ficam por cima do fundo temático de cada povo e vocação (as artes antigas em ./images/wizard).
 */
const PASTA = '/images/criacao/';

export const RETRATOS_GRANDES_DE_POVOS: Readonly<Record<string, string>> = {
  humano: `${PASTA}povo-humano.webp`,
  anao: `${PASTA}povo-anao.webp`,
  elfo: `${PASTA}povo-elfo.webp`,
  orc: `${PASTA}povo-orc.webp`,
  vampiro: `${PASTA}povo-vampiro.webp`,
  draconiano: `${PASTA}povo-draconiano.webp`,
};

export const RETRATOS_GRANDES_DE_VOCACOES: Readonly<Record<string, string>> = {
  barbaro: `${PASTA}vocacao-barbaro.webp`,
  cavaleiro: `${PASTA}vocacao-cavaleiro.webp`,
  feiticeiro: `${PASTA}vocacao-feiticeiro.webp`,
  bandido: `${PASTA}vocacao-bandido.webp`,
  profeta: `${PASTA}vocacao-profeta.webp`,
  samurai: `${PASTA}vocacao-samurai.webp`,
};
