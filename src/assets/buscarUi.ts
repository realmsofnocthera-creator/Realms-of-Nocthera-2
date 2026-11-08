import type { RaridadeDeColecionavel, SeloDeBusca } from '@/rules/colecionaveis';
import { srcDaImagem } from '@/assets/srcDaImagem';
import fundoImg from './images/buscar/fundo.webp';
import roletaImg from './images/buscar/roleta.webp';
import gemaImg from './images/buscar/gema.webp';
import versoImg from './images/buscar/verso.webp';
import seloDesgastadoImg from './images/buscar/selo-desgastado.webp';
import seloEncantadoImg from './images/buscar/selo-encantado.webp';
import seloEternidadeImg from './images/buscar/selo-eternidade.webp';
import seloOrigemImg from './images/buscar/selo-origem.webp';

/** O fundo da tela Buscar (altar em pedra roxa, 2:3) e as peças da roleta. */
export const FUNDO_DO_BUSCAR = srcDaImagem(fundoImg);
export const ANEL_DA_ROLETA = srcDaImagem(roletaImg);
export const GEMA_DA_ROLETA = srcDaImagem(gemaImg);
/** O verso do colecionável (a carta fechada com "?"), usado na revelação. */
export const VERSO_DO_COLECIONAVEL = srcDaImagem(versoImg);

/** O ícone de cada selo de busca (128×128). */
export const ICONES_DOS_SELOS: Readonly<Record<SeloDeBusca, string>> = {
  desgastado: srcDaImagem(seloDesgastadoImg),
  encantado: srcDaImagem(seloEncantadoImg),
  eternidade: srcDaImagem(seloEternidadeImg),
  origem: srcDaImagem(seloOrigemImg),
};

/** O brilho de cada raridade na roleta e na revelação (as cores das raridades do jogo). */
export const BRILHO_DA_RARIDADE: Readonly<Record<RaridadeDeColecionavel, string>> = {
  comum: '#B8C0CC',
  muitoRaro: '#4DA3FF',
  lendario: '#FFC83D',
  mitico: '#FF4B4B',
};
