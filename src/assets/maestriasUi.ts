import { srcDaImagem } from '@/assets/srcDaImagem';
import { ICONE_DA_CATEGORIA } from '@/assets/forjaItens';
import type { CategoriaArma } from '@/rules/armas';
import imgChefes from './images/maestrias/trilha-chefes.webp';
import imgForja from './images/maestrias/trilha-forja.webp';
import imgExpedicao from './images/maestrias/trilha-expedicao.webp';
import imgMonstroNecrofagos from './images/maestrias/monstro-necrofagos.webp';
import imgMonstroEspectros from './images/maestrias/monstro-espectros.webp';
import imgMonstroFeras from './images/maestrias/monstro-feras.webp';
import imgMonstroAmaldicoados from './images/maestrias/monstro-amaldicoados.webp';
import imgMonstroHibridos from './images/maestrias/monstro-hibridos.webp';
import imgMonstroInsectoides from './images/maestrias/monstro-insectoides.webp';
import imgMonstroElementais from './images/maestrias/monstro-elementais.webp';
import imgMonstroRelictos from './images/maestrias/monstro-relictos.webp';
import imgMonstroOgroides from './images/maestrias/monstro-ogroides.webp';
import imgMonstroDraconideos from './images/maestrias/monstro-draconideos.webp';
import imgMonstroVampiros from './images/maestrias/monstro-vampiros.webp';
import imgMonstroLeviatas from './images/maestrias/monstro-leviatas.webp';
import imgMonstroPrimordiais from './images/maestrias/monstro-primordiais.webp';

/** Os ícones das trilhas que não são de arma (pixel art feita para a tela): a coroa, a bigorna e a bússola. */
const ICONES_DAS_TRILHAS_FIXAS: Readonly<Record<string, string>> = {
  chefes: srcDaImagem(imgChefes),
  forja: srcDaImagem(imgForja),
  expedicao: srcDaImagem(imgExpedicao),
};

/**
 * Os 13 ícones das maestrias de monstro (glifos brancos do Yuri; chave = id da trilha, como monstro:necrofagos).
 * As trilhas seguem bloqueadas até o bestiário ser classificado, mas já mostram o ícone, apagado.
 */
export const ICONES_DAS_TRILHAS_DE_MONSTRO: Readonly<Record<string, string>> = {
  'monstro:necrofagos': srcDaImagem(imgMonstroNecrofagos),
  'monstro:espectros': srcDaImagem(imgMonstroEspectros),
  'monstro:feras': srcDaImagem(imgMonstroFeras),
  'monstro:amaldicoados': srcDaImagem(imgMonstroAmaldicoados),
  'monstro:hibridos': srcDaImagem(imgMonstroHibridos),
  'monstro:insectoides': srcDaImagem(imgMonstroInsectoides),
  'monstro:elementais': srcDaImagem(imgMonstroElementais),
  'monstro:relictos': srcDaImagem(imgMonstroRelictos),
  'monstro:ogroides': srcDaImagem(imgMonstroOgroides),
  'monstro:draconideos': srcDaImagem(imgMonstroDraconideos),
  'monstro:vampiros': srcDaImagem(imgMonstroVampiros),
  'monstro:leviatas': srcDaImagem(imgMonstroLeviatas),
  'monstro:primordiais': srcDaImagem(imgMonstroPrimordiais),
};

/** O ícone de uma trilha de maestria: a arte da arma (as de arma), a coroa, a bigorna, a bússola ou o de monstro (se houver). */
export function iconeDaTrilha(trilha: { id: string; grupo: string }): string | null {
  if (trilha.id.startsWith('arma:')) return ICONE_DA_CATEGORIA[trilha.id.slice(5) as CategoriaArma] ?? null;
  return ICONES_DAS_TRILHAS_FIXAS[trilha.id] ?? ICONES_DAS_TRILHAS_DE_MONSTRO[trilha.id] ?? null;
}
