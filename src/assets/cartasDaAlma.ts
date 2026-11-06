import { srcDaImagem } from '@/assets/srcDaImagem';
import imgalma_comum_1 from './images/cartas-da-alma/alma-comum-1.webp';
import imgalma_comum_2 from './images/cartas-da-alma/alma-comum-2.webp';
import imgalma_comum_3 from './images/cartas-da-alma/alma-comum-3.webp';
import imgalma_epico_1 from './images/cartas-da-alma/alma-epico-1.webp';
import imgalma_epico_2 from './images/cartas-da-alma/alma-epico-2.webp';
import imgalma_epico_3 from './images/cartas-da-alma/alma-epico-3.webp';
import imgalma_lendario_1 from './images/cartas-da-alma/alma-lendario-1.webp';
import imgalma_lendario_2 from './images/cartas-da-alma/alma-lendario-2.webp';
import imgalma_lendario_3 from './images/cartas-da-alma/alma-lendario-3.webp';
import imgalma_muitoRaro_1 from './images/cartas-da-alma/alma-muitoRaro-1.webp';
import imgalma_muitoRaro_2 from './images/cartas-da-alma/alma-muitoRaro-2.webp';
import imgalma_muitoRaro_3 from './images/cartas-da-alma/alma-muitoRaro-3.webp';
import imgalma_raro_1 from './images/cartas-da-alma/alma-raro-1.webp';
import imgalma_raro_2 from './images/cartas-da-alma/alma-raro-2.webp';
import imgalma_raro_3 from './images/cartas-da-alma/alma-raro-3.webp';
import imgcorpo_comum_1 from './images/cartas-da-alma/corpo-comum-1.webp';
import imgcorpo_comum_2 from './images/cartas-da-alma/corpo-comum-2.webp';
import imgcorpo_comum_3 from './images/cartas-da-alma/corpo-comum-3.webp';
import imgcorpo_epico_1 from './images/cartas-da-alma/corpo-epico-1.webp';
import imgcorpo_epico_2 from './images/cartas-da-alma/corpo-epico-2.webp';
import imgcorpo_epico_3 from './images/cartas-da-alma/corpo-epico-3.webp';
import imgcorpo_lendario_1 from './images/cartas-da-alma/corpo-lendario-1.webp';
import imgcorpo_lendario_2 from './images/cartas-da-alma/corpo-lendario-2.webp';
import imgcorpo_lendario_3 from './images/cartas-da-alma/corpo-lendario-3.webp';
import imgcorpo_muitoRaro_1 from './images/cartas-da-alma/corpo-muitoRaro-1.webp';
import imgcorpo_muitoRaro_2 from './images/cartas-da-alma/corpo-muitoRaro-2.webp';
import imgcorpo_muitoRaro_3 from './images/cartas-da-alma/corpo-muitoRaro-3.webp';
import imgcorpo_raro_1 from './images/cartas-da-alma/corpo-raro-1.webp';
import imgcorpo_raro_2 from './images/cartas-da-alma/corpo-raro-2.webp';
import imgcorpo_raro_3 from './images/cartas-da-alma/corpo-raro-3.webp';
import imgmente_comum_1 from './images/cartas-da-alma/mente-comum-1.webp';
import imgmente_comum_2 from './images/cartas-da-alma/mente-comum-2.webp';
import imgmente_comum_3 from './images/cartas-da-alma/mente-comum-3.webp';
import imgmente_epico_1 from './images/cartas-da-alma/mente-epico-1.webp';
import imgmente_epico_2 from './images/cartas-da-alma/mente-epico-2.webp';
import imgmente_epico_3 from './images/cartas-da-alma/mente-epico-3.webp';
import imgmente_lendario_1 from './images/cartas-da-alma/mente-lendario-1.webp';
import imgmente_lendario_2 from './images/cartas-da-alma/mente-lendario-2.webp';
import imgmente_lendario_3 from './images/cartas-da-alma/mente-lendario-3.webp';
import imgmente_muitoRaro_1 from './images/cartas-da-alma/mente-muitoRaro-1.webp';
import imgmente_muitoRaro_2 from './images/cartas-da-alma/mente-muitoRaro-2.webp';
import imgmente_muitoRaro_3 from './images/cartas-da-alma/mente-muitoRaro-3.webp';
import imgmente_raro_1 from './images/cartas-da-alma/mente-raro-1.webp';
import imgmente_raro_2 from './images/cartas-da-alma/mente-raro-2.webp';
import imgmente_raro_3 from './images/cartas-da-alma/mente-raro-3.webp';

/** A arte de cada carta da Alma (144×200, com a moldura), pelo id do tipo de carta. As míticas não têm arte ainda: terão efeitos especiais e animações. */
const ARTES: Readonly<Record<string, string>> = {
  'alma-comum-1': srcDaImagem(imgalma_comum_1),
  'alma-comum-2': srcDaImagem(imgalma_comum_2),
  'alma-comum-3': srcDaImagem(imgalma_comum_3),
  'alma-epico-1': srcDaImagem(imgalma_epico_1),
  'alma-epico-2': srcDaImagem(imgalma_epico_2),
  'alma-epico-3': srcDaImagem(imgalma_epico_3),
  'alma-lendario-1': srcDaImagem(imgalma_lendario_1),
  'alma-lendario-2': srcDaImagem(imgalma_lendario_2),
  'alma-lendario-3': srcDaImagem(imgalma_lendario_3),
  'alma-muitoRaro-1': srcDaImagem(imgalma_muitoRaro_1),
  'alma-muitoRaro-2': srcDaImagem(imgalma_muitoRaro_2),
  'alma-muitoRaro-3': srcDaImagem(imgalma_muitoRaro_3),
  'alma-raro-1': srcDaImagem(imgalma_raro_1),
  'alma-raro-2': srcDaImagem(imgalma_raro_2),
  'alma-raro-3': srcDaImagem(imgalma_raro_3),
  'corpo-comum-1': srcDaImagem(imgcorpo_comum_1),
  'corpo-comum-2': srcDaImagem(imgcorpo_comum_2),
  'corpo-comum-3': srcDaImagem(imgcorpo_comum_3),
  'corpo-epico-1': srcDaImagem(imgcorpo_epico_1),
  'corpo-epico-2': srcDaImagem(imgcorpo_epico_2),
  'corpo-epico-3': srcDaImagem(imgcorpo_epico_3),
  'corpo-lendario-1': srcDaImagem(imgcorpo_lendario_1),
  'corpo-lendario-2': srcDaImagem(imgcorpo_lendario_2),
  'corpo-lendario-3': srcDaImagem(imgcorpo_lendario_3),
  'corpo-muitoRaro-1': srcDaImagem(imgcorpo_muitoRaro_1),
  'corpo-muitoRaro-2': srcDaImagem(imgcorpo_muitoRaro_2),
  'corpo-muitoRaro-3': srcDaImagem(imgcorpo_muitoRaro_3),
  'corpo-raro-1': srcDaImagem(imgcorpo_raro_1),
  'corpo-raro-2': srcDaImagem(imgcorpo_raro_2),
  'corpo-raro-3': srcDaImagem(imgcorpo_raro_3),
  'mente-comum-1': srcDaImagem(imgmente_comum_1),
  'mente-comum-2': srcDaImagem(imgmente_comum_2),
  'mente-comum-3': srcDaImagem(imgmente_comum_3),
  'mente-epico-1': srcDaImagem(imgmente_epico_1),
  'mente-epico-2': srcDaImagem(imgmente_epico_2),
  'mente-epico-3': srcDaImagem(imgmente_epico_3),
  'mente-lendario-1': srcDaImagem(imgmente_lendario_1),
  'mente-lendario-2': srcDaImagem(imgmente_lendario_2),
  'mente-lendario-3': srcDaImagem(imgmente_lendario_3),
  'mente-muitoRaro-1': srcDaImagem(imgmente_muitoRaro_1),
  'mente-muitoRaro-2': srcDaImagem(imgmente_muitoRaro_2),
  'mente-muitoRaro-3': srcDaImagem(imgmente_muitoRaro_3),
  'mente-raro-1': srcDaImagem(imgmente_raro_1),
  'mente-raro-2': srcDaImagem(imgmente_raro_2),
  'mente-raro-3': srcDaImagem(imgmente_raro_3),
};

export const arteDaCarta = (tipoId: string): string | undefined => ARTES[tipoId];
