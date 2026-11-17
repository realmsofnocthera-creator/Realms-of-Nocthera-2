/**
 * Os 9 mapas da Caçada (arte animada do Yuri), um para cada estrela. Cada mapa é um vídeo de 8 s em repetição, 1024 x 1536,
 * sem áudio: o navegador usa o AV1 (de 430 KB a 1,2 MB) quando sabe tocar e, senão, o H.264. A imagem parada (o primeiro
 * quadro) é a capa enquanto o vídeo carrega e o fundo de quem pede "reduzir movimento". Os arquivos têm versão no nome
 * (mapa-1-v1) porque ficam em cache por um ano: ao trocar um vídeo, troque a versão.
 */
export interface MapaDaCacada {
  nome: string;
  /** A capa (imagem parada) do mapa. */
  imagem: string;
  videoAv1: string;
  videoH264: string;
}

/** O tipo do AV1 em MP4 (perfil principal, 8 bits, lido dos próprios arquivos): sem isso o navegador tentaria baixar e falharia. */
export const TIPO_AV1 = 'video/mp4; codecs="av01.0.08M.08"';
export const TIPO_H264 = 'video/mp4';

export const LARGURA_DO_MAPA = 1024;
export const ALTURA_DO_MAPA = 1536;

const mapa = (n: number, nome: string): MapaDaCacada => ({
  nome,
  imagem: `/images/cacada/cenario-${n}.webp`,
  videoAv1: `/videos/cacada/mapa-${n}-v1.av1.mp4`,
  videoH264: `/videos/cacada/mapa-${n}-v1.h264.mp4`,
});

/** O mapa de cada estrela (os nomes são do Yuri/da proposta: a confirmar). */
export const MAPAS_DA_CACADA: Readonly<Record<number, MapaDaCacada>> = {
  1: mapa(1, 'Floresta Cinzenta'),
  2: mapa(2, 'Savana dos Vargheist'),
  3: mapa(3, 'Tundra Antiga'),
  4: mapa(4, 'Catacumbas Contaminadas'),
  5: mapa(5, 'Lagos do Abismo'),
  6: mapa(6, 'Escarpas e Rios Profundos'),
  7: mapa(7, 'Ermos Vulcânicos'),
  8: mapa(8, 'Cordilheira das Cinzas'),
  9: mapa(9, 'Pico das Tempestades'),
};
