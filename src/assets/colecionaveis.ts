import { srcDaImagem } from '@/assets/srcDaImagem';
import imgSONATAC from './images/colecionaveis/SONATA-C.webp';
import imgSONATAMR from './images/colecionaveis/SONATA-MR.webp';
import imgSONATAL from './images/colecionaveis/SONATA-L.webp';
import imgSONATAM from './images/colecionaveis/SONATA-M.webp';
import imgRIC01 from './images/colecionaveis/RI-C01.webp';
import imgRIC02 from './images/colecionaveis/RI-C02.webp';
import imgRIC03 from './images/colecionaveis/RI-C03.webp';
import imgRIC04 from './images/colecionaveis/RI-C04.webp';
import imgRIC05 from './images/colecionaveis/RI-C05.webp';
import imgRIC06 from './images/colecionaveis/RI-C06.webp';
import imgRIC07 from './images/colecionaveis/RI-C07.webp';
import imgRIC08 from './images/colecionaveis/RI-C08.webp';
import imgRIC09 from './images/colecionaveis/RI-C09.webp';
import imgRIC10 from './images/colecionaveis/RI-C10.webp';
import imgRIC11 from './images/colecionaveis/RI-C11.webp';
import imgRIC12 from './images/colecionaveis/RI-C12.webp';
import imgRIC13 from './images/colecionaveis/RI-C13.webp';
import imgRIC14 from './images/colecionaveis/RI-C14.webp';
import imgRIC15 from './images/colecionaveis/RI-C15.webp';
import imgRIL01 from './images/colecionaveis/RI-L01.webp';
import imgRIL02 from './images/colecionaveis/RI-L02.webp';
import imgRIL03 from './images/colecionaveis/RI-L03.webp';
import imgRIL04 from './images/colecionaveis/RI-L04.webp';
import imgRIM01 from './images/colecionaveis/RI-M01.webp';
import imgRIM02 from './images/colecionaveis/RI-M02.webp';
import imgRIMR01 from './images/colecionaveis/RI-MR01.webp';
import imgRIMR02 from './images/colecionaveis/RI-MR02.webp';
import imgRIMR03 from './images/colecionaveis/RI-MR03.webp';
import imgRIMR04 from './images/colecionaveis/RI-MR04.webp';
import imgRIMR05 from './images/colecionaveis/RI-MR05.webp';
import imgRIMR06 from './images/colecionaveis/RI-MR06.webp';
import imgRIMR07 from './images/colecionaveis/RI-MR07.webp';
import imgRIMR08 from './images/colecionaveis/RI-MR08.webp';
import imgRIMR09 from './images/colecionaveis/RI-MR09.webp';

/** A arte própria de cada colecionável (128×128, fundo transparente), pelo código do catálogo. Só há as que o Yuri já mandou; o resto fica sem arte. */
const ARTES: Readonly<Record<string, string>> = {
  'RI-C01': srcDaImagem(imgRIC01),
  'RI-C02': srcDaImagem(imgRIC02),
  'RI-C03': srcDaImagem(imgRIC03),
  'RI-C04': srcDaImagem(imgRIC04),
  'RI-C05': srcDaImagem(imgRIC05),
  'RI-C06': srcDaImagem(imgRIC06),
  'RI-C07': srcDaImagem(imgRIC07),
  'RI-C08': srcDaImagem(imgRIC08),
  'RI-C09': srcDaImagem(imgRIC09),
  'RI-C10': srcDaImagem(imgRIC10),
  'RI-C11': srcDaImagem(imgRIC11),
  'RI-C12': srcDaImagem(imgRIC12),
  'RI-C13': srcDaImagem(imgRIC13),
  'RI-C14': srcDaImagem(imgRIC14),
  'RI-C15': srcDaImagem(imgRIC15),
  'RI-L01': srcDaImagem(imgRIL01),
  'RI-L02': srcDaImagem(imgRIL02),
  'RI-L03': srcDaImagem(imgRIL03),
  'RI-L04': srcDaImagem(imgRIL04),
  'RI-M01': srcDaImagem(imgRIM01),
  'RI-M02': srcDaImagem(imgRIM02),
  'RI-MR01': srcDaImagem(imgRIMR01),
  'RI-MR02': srcDaImagem(imgRIMR02),
  'RI-MR03': srcDaImagem(imgRIMR03),
  'RI-MR04': srcDaImagem(imgRIMR04),
  'RI-MR05': srcDaImagem(imgRIMR05),
  'RI-MR06': srcDaImagem(imgRIMR06),
  'RI-MR07': srcDaImagem(imgRIMR07),
  'RI-MR08': srcDaImagem(imgRIMR08),
  'RI-MR09': srcDaImagem(imgRIMR09),
};

/** Arte única por raridade (as Sonatas usam uma básica para cada raridade): chave = prefixo da categoria + sufixo da raridade. */
const ARTE_POR_RARIDADE: Readonly<Record<string, string>> = {
  'SO-C': srcDaImagem(imgSONATAC),
  'SO-MR': srcDaImagem(imgSONATAMR),
  'SO-L': srcDaImagem(imgSONATAL),
  'SO-M': srcDaImagem(imgSONATAM),
};

export function arteDoColecionavel(id: string): string | undefined {
  const propria = ARTES[id];
  if (propria) return propria;
  const m = /^([A-Z]{2}-[A-Z]+)\d+$/.exec(id);
  return m ? ARTE_POR_RARIDADE[m[1]] : undefined;
}
